import { eq } from "drizzle-orm";
import { Effect, Layer, Option } from "effect";
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

/**
 * Checkouts through the Stripe plugin's rows, in the `auth` schema: the
 * subscriptions its checkouts started (`subscription`, by workspace as
 * `reference_id`), and the Stripe customer it made for the workspace
 * (`organization.stripe_customer_id`), whose open Checkout Sessions are
 * expired at Stripe. Without a Stripe key, there are none to expire.
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
        Effect.flatMap((open) =>
          Effect.forEach(open, ({ id }) =>
            Effect.tryPromise({
              catch: () => new StripeUnreachable({ workspaceId }),
              try: async () => await stripe.checkout.sessions.expire(id),
            })
          )
        ),
        Effect.map((expired) => expired.length)
      );

    const expireOpen = Effect.fn("Checkouts.expireOpen")(function* expireOpen(
      workspaceId: WorkspaceId
    ) {
      if (Option.isNone(client)) {
        return 0;
      }

      const customers = yield* customersOf(workspaceId);

      const counts = yield* Effect.forEach(customers, (customer) =>
        expireFor(client.value, customer, workspaceId)
      );

      return counts.reduce((sum, count) => sum + count, 0);
    });

    return Checkouts.of({ expireOpen, statuses });
  })
);
