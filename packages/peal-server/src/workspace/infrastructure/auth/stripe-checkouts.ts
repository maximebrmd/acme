import { eq } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";
import type { Stripe } from "stripe";

import { Checkouts } from "#billing/application/ports/checkouts.ts";
import { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { stripeSettingsConfig } from "#shared/infrastructure/stripe-settings.ts";
import {
  organization,
  subscription,
} from "#workspace/infrastructure/auth-schema.generated.ts";

import { stripeClientOf } from "./stripe-client.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

// A deletion waits on these calls, inside its transaction: Stripe gets this
// long to answer each one.
const requestTimeout = 10_000;

// Better Auth's own default, for a row written without one.
const defaultStatus = "incomplete";

// Each Checkout Session listed is expired, so a page holds them all.
const listLimit = 100;

// Far more open sessions than a workspace can start.
const sessionsAtMost = 10_000;

// Expires the customer's open Checkout Sessions, and says how many.
const expireFor = (
  stripe: Stripe,
  customer: string,
  workspaceId: WorkspaceId
) =>
  Effect.tryPromise({
    catch: () => new StripeUnreachable({ workspaceId }),
    try: async () =>
      await stripe.checkout.sessions
        .list({ customer, limit: listLimit, status: "open" })
        .autoPagingToArray({ limit: sessionsAtMost }),
  }).pipe(
    Effect.flatMap(
      Effect.forEach(({ id }) =>
        Effect.tryPromise({
          catch: () => new StripeUnreachable({ workspaceId }),
          try: async () => await stripe.checkout.sessions.expire(id),
        })
      )
    ),
    Effect.map((expired) => expired.length)
  );

// Every subscription Stripe holds for the customer, with its status, those
// its events have not reported yet included. Kept to the customer's own,
// which is all Stripe lists.
const subscriptionsOf = (
  stripe: Stripe,
  customer: string,
  workspaceId: WorkspaceId
) =>
  Effect.tryPromise({
    catch: () => new StripeUnreachable({ workspaceId }),
    try: async () =>
      await stripe.subscriptions
        .list({ customer, limit: listLimit, status: "all" })
        .autoPagingToArray({ limit: sessionsAtMost }),
  }).pipe(
    Effect.map((subscriptions) =>
      subscriptions.flatMap((held) =>
        held.customer === customer ? [{ id: held.id, status: held.status }] : []
      )
    )
  );

// Stripe's answer to a subscription it does not know: nothing to cancel.
const isMissing = Schema.is(
  Schema.Struct({ code: Schema.Literal("resource_missing") })
);

// Why Stripe ended it, in its dashboard and its events.
const cancellationComment = "Workspace deleted on Peal";

// Cancels the subscription at once: no proration credit, no final invoice,
// so the period paid for stays paid and nothing more is charged. Says
// whether Stripe had it to cancel.
const cancelAtStripe = (
  stripe: Stripe,
  subscriptionId: string,
  workspaceId: WorkspaceId
) =>
  Effect.tryPromise({
    // Whether Stripe answered that it does not know the subscription.
    catch: (cause) => isMissing(cause),
    try: async () =>
      await stripe.subscriptions.cancel(subscriptionId, {
        cancellation_details: { comment: cancellationComment },
        invoice_now: false,
        prorate: false,
      }),
  }).pipe(
    Effect.matchEffect({
      onFailure: (missing) =>
        missing
          ? Effect.succeed(false)
          : Effect.fail(new StripeUnreachable({ workspaceId })),
      onSuccess: () => Effect.succeed(true),
    })
  );

/**
 * Checkouts through the Stripe plugin's rows, in the `auth` schema: the
 * subscriptions its checkouts started (`subscription`, by workspace as
 * `reference_id`), and the Stripe customer it made for the workspace
 * (`organization.stripe_customer_id`), whose open Checkout Sessions are
 * expired at Stripe, and whose subscriptions Stripe is asked for, and
 * cancelled when the workspace is deleted. Without a Stripe key, there are
 * none.
 */
export const StripeCheckoutsLive = Layer.effect(
  Checkouts,
  Effect.gen(function* StripeCheckoutsLive() {
    const db = yield* Drizzle;

    const client = (yield* stripeSettingsConfig).pipe(
      Option.map((settings) =>
        stripeClientOf(settings, { timeout: requestTimeout })
      )
    );

    const statuses = (workspaceId: WorkspaceId) =>
      db
        .select({ status: subscription.status })
        .from(subscription)
        .where(eq(subscription.referenceId, workspaceId))
        .pipe(
          Effect.mapError(failed),
          Effect.map((rows) =>
            rows.map(({ status }) => status ?? defaultStatus)
          ),
          Effect.withSpan("Checkouts.statuses")
        );

    // The workspace's Stripe customers: the one the plugin keeps on the
    // workspace, and any its subscriptions name.
    const customersOf = (workspaceId: WorkspaceId) =>
      Effect.all([
        db
          .select({ customer: organization.stripeCustomerId })
          .from(organization)
          .where(eq(organization.id, workspaceId)),
        db
          .select({ customer: subscription.stripeCustomerId })
          .from(subscription)
          .where(eq(subscription.referenceId, workspaceId)),
      ]).pipe(
        Effect.mapError(failed),
        Effect.map((found) => [
          ...new Set(
            found
              .flat()
              .flatMap(({ customer }) =>
                customer === null || customer === "" ? [] : [customer]
              )
          ),
        ])
      );

    const expireOpen = Effect.fn("Checkouts.expireOpen")(function* expireOpen(
      workspaceId: WorkspaceId
    ) {
      if (Option.isNone(client)) {
        return 0;
      }

      const stripe = client.value;

      const counts = yield* customersOf(workspaceId).pipe(
        Effect.flatMap(
          Effect.forEach((customer) => expireFor(stripe, customer, workspaceId))
        )
      );

      return counts.reduce((sum, count) => sum + count, 0);
    });

    const atStripe = Effect.fn("Checkouts.atStripe")(function* atStripe(
      workspaceId: WorkspaceId
    ) {
      if (Option.isNone(client)) {
        return [];
      }

      const stripe = client.value;

      const found = yield* customersOf(workspaceId).pipe(
        Effect.flatMap(
          Effect.forEach((customer) =>
            subscriptionsOf(stripe, customer, workspaceId)
          )
        )
      );

      return found.flat().map(({ status }) => status);
    });

    const cancelBilled = Effect.fn("Checkouts.cancelBilled")(
      function* cancelBilled(
        workspaceId: WorkspaceId,
        {
          known,
          mayBill,
        }: {
          readonly known: readonly string[];
          readonly mayBill: (status: string) => boolean;
        }
      ) {
        if (Option.isNone(client)) {
          return 0;
        }

        const stripe = client.value;

        const started = yield* db
          .select({
            id: subscription.stripeSubscriptionId,
            status: subscription.status,
          })
          .from(subscription)
          .where(eq(subscription.referenceId, workspaceId))
          .pipe(Effect.mapError(failed));

        const held = yield* customersOf(workspaceId).pipe(
          Effect.flatMap(
            Effect.forEach((customer) =>
              subscriptionsOf(stripe, customer, workspaceId)
            )
          )
        );

        // What Stripe says of each subscription it lists decides; the
        // others, which billing or the plugin hold, are asked to end.
        const listed = new Map(
          held.flat().map(({ id, status }) => [id, status])
        );

        const named = [
          ...known,
          ...started.flatMap(({ id, status }) =>
            id === null || id === "" || !mayBill(status ?? defaultStatus)
              ? []
              : [id]
          ),
        ].filter((id) => !listed.has(id));

        const billing = [
          ...new Set([
            ...[...listed].flatMap(([id, status]) =>
              mayBill(status) ? [id] : []
            ),
            ...named,
          ]),
        ];

        const cancelled = yield* Effect.all(
          billing.map((id) => cancelAtStripe(stripe, id, workspaceId))
        );

        return cancelled.filter(Boolean).length;
      }
    );

    return Checkouts.of({ atStripe, cancelBilled, expireOpen, statuses });
  })
);
