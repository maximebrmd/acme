import { DateTime, Effect, Layer, Option, Schema } from "effect";
import type { Stripe } from "stripe";

import { UsageBilling } from "#billing/application/ports/usage-billing.ts";
import type {
  ItemsKept,
  MeterEvent,
  ReportOutcome,
} from "#billing/application/ports/usage-billing.ts";
import { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";
import { CatalogueLineSchema } from "#billing/domain/catalogue.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { stripeClientOf } from "#shared/infrastructure/stripe-client.ts";
import {
  catalogueKeysOf,
  lookupKeyPrefixConfig,
  stripeSettingsConfig,
} from "#shared/infrastructure/stripe-settings.ts";

// A cron waits on these calls, not a member: Stripe gets this long.
const requestTimeout = 20_000;

// What Stripe's errors say of themselves: never their message, which may
// quote what was sent. The SDK sets both properties, undefined when the
// answer gave none.
const StripeErrorSchema = Schema.Struct({
  code: Schema.optional(Schema.String),
  statusCode: Schema.optional(Schema.Int),
  type: Schema.String,
});

const decodeError = Schema.decodeUnknownOption(StripeErrorSchema);

/**
 * Stripe's codes of an invalid request that are about the event itself:
 * its value, its timestamp, its customer. Only these refuse an event for
 * good; another refusal says nothing of the event (the key, a meter, the
 * idempotency key), and is tried again.
 */
export const eventRefusals: ReadonlySet<string> = new Set([
  "meter_event_customer_not_found",
  "meter_event_invalid_value",
  "meter_event_no_customer_defined",
  "meter_event_value_not_found",
  "parameter_invalid_empty",
  "parameter_invalid_integer",
  "parameter_invalid_string_empty",
  "parameter_missing",
  "string_length_exceeds_maximum",
  "timestamp_in_future",
  "timestamp_too_far_in_past",
]);

/**
 * What a failed meter event becomes: Stripe not answering, limiting the
 * rate (429), failing itself (5xx) or still running the same request
 * (409) is `unavailable`; an invalid request with one of `eventRefusals`
 * is final, kept by its code; anything else (401, 403, an idempotency
 * key reused otherwise, a code not listed, an error of a kind not known)
 * is `refusing`: tried again, and the customer paused.
 */
export const outcomeOfFailure = (cause: unknown): ReportOutcome =>
  Option.match(decodeError(cause), {
    onNone: () => ({ _tag: "retry", reason: "unavailable" }),
    onSome: ({ code, statusCode, type }): ReportOutcome => {
      if (
        statusCode === undefined ||
        statusCode === 409 ||
        statusCode === 429 ||
        statusCode >= 500 ||
        type === "StripeConnectionError" ||
        type === "StripeRateLimitError"
      ) {
        return { _tag: "retry", reason: "unavailable" };
      }

      return statusCode === 400 &&
        type === "StripeInvalidRequestError" &&
        code !== undefined &&
        eventRefusals.has(code)
        ? { _tag: "refused", code }
        : { _tag: "retry", reason: "refusing" };
    },
  });

const isRefused = Schema.is(
  Schema.Struct({ type: Schema.Literal("StripeInvalidRequestError") })
);

const PriceSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  lookup_key: Schema.optionalKey(Schema.NullOr(Schema.String)),
  product: Schema.Union([
    Schema.String,
    Schema.Struct({ id: Schema.NonEmptyString }),
  ]),
});

type Price = typeof PriceSchema.Type;

const PricesSchema = Schema.Array(PriceSchema);

const ItemsSchema = Schema.Array(
  Schema.Struct({ id: Schema.NonEmptyString, price: PriceSchema })
);

const decodePrices = Schema.decodeUnknownEffect(PricesSchema);
const decodeItems = Schema.decodeUnknownEffect(ItemsSchema);

const isProductId = Schema.is(Schema.String);

const productOf = ({ product }: Price): string =>
  isProductId(product) ? product : product.id;

/**
 * What a subscription's items lack of the catalogue's prices: a line with
 * no item is added, and an item on another price of the line's product
 * (one that lost its lookup key to the current one) is moved to it.
 */
export const itemChanges = (
  current: readonly Price[],
  items: readonly { readonly id: string; readonly price: Price }[]
) =>
  current.flatMap(
    (
      price
    ): readonly (
      | { readonly _tag: "add"; readonly price: string }
      | {
          readonly _tag: "replace";
          readonly item: string;
          readonly price: string;
        }
    )[] => {
      if (items.some((item) => item.price.id === price.id)) {
        return [];
      }

      const older = items.find(
        (item) => productOf(item.price) === productOf(price)
      );

      return older === undefined
        ? [{ _tag: "add", price: price.id }]
        : [{ _tag: "replace", item: older.id, price: price.id }];
    }
  );

/**
 * Usage at Stripe through the server's key: meter events under their
 * identifiers, which are also their idempotency keys, so an event sent
 * again within Stripe's day is answered as the first was; a subscription's
 * items and threshold, each change under an idempotency key. Without a
 * Stripe key billing is off, and nothing calls it.
 */
export const StripeUsageBillingLive = Layer.effect(
  UsageBilling,
  Effect.gen(function* StripeUsageBillingLive() {
    const settings = yield* stripeSettingsConfig;
    const prefix = yield* lookupKeyPrefixConfig;
    const eventNames = catalogueKeysOf(prefix);

    const client = settings.pipe(
      Option.map((held) => stripeClientOf(held, { timeout: requestTimeout }))
    );

    // Meter events are tried again by the next run, never by the client:
    // a Stripe outage then costs a run one attempt a customer.
    const reporting = settings.pipe(
      Option.map((held) =>
        stripeClientOf(held, { maxNetworkRetries: 0, timeout: requestTimeout })
      )
    );

    const withStripe = <A, E>(
      use: (stripe: Stripe) => Effect.Effect<A, E>
    ): Effect.Effect<A, E> =>
      Option.match(client, {
        onNone: () => Effect.die("Billing is off: Stripe has no key"),
        onSome: use,
      });

    const call = <A>(
      workspaceId: WorkspaceId,
      request: (stripe: Stripe) => Promise<A>
    ): Effect.Effect<A, StripeUnreachable> =>
      withStripe((stripe) =>
        Effect.tryPromise({
          catch: (cause) =>
            new StripeUnreachable({
              permanent: isRefused(cause),
              workspaceId,
            }),
          try: async () => await request(stripe),
        })
      );

    const report = (event: MeterEvent) =>
      Option.match(reporting, {
        onNone: () => Effect.die("Billing is off: Stripe has no key"),
        onSome: (stripe) => {
          const seconds = Math.floor(
            DateTime.toEpochMillis(event.timestamp) / 1000
          );

          return Effect.tryPromise({
            catch: outcomeOfFailure,
            try: async () =>
              await stripe.billing.meterEvents.create(
                {
                  event_name: event.eventName,
                  identifier: event.identifier,
                  payload: {
                    stripe_customer_id: event.stripeCustomerId,
                    value: String(event.value),
                  },
                  timestamp: seconds,
                },
                // What is sent, whole: the same request on every retry.
                { idempotencyKey: `${event.identifier}:${seconds}` }
              ),
          }).pipe(
            Effect.match({
              onFailure: (outcome): ReportOutcome => outcome,
              onSuccess: (): ReportOutcome => ({ _tag: "sent" }),
            }),
            Effect.withSpan("UsageBilling.report")
          );
        },
      });

    const ensureItems = (workspaceId: WorkspaceId, subscriptionId: string) =>
      Effect.gen(function* ensured() {
        const listed = yield* call(
          workspaceId,
          async (stripe) =>
            await stripe.prices
              .list({
                active: true,
                limit: 100,
                lookup_keys: CatalogueLineSchema.literals.map(
                  (line) => eventNames[line]
                ),
              })
              .autoPagingToArray({ limit: 100 })
        );

        const held = yield* call(
          workspaceId,
          async (stripe) =>
            await stripe.subscriptionItems
              .list({ limit: 100, subscription: subscriptionId })
              .autoPagingToArray({ limit: 100 })
        );

        const current = yield* decodePrices(listed).pipe(
          Effect.mapError(() => new StripeUnreachable({ workspaceId }))
        );

        const items = yield* decodeItems(held).pipe(
          Effect.mapError(() => new StripeUnreachable({ workspaceId }))
        );

        const changes = itemChanges(current, items);

        yield* Effect.forEach(
          changes,
          (change) =>
            call(workspaceId, async (stripe) =>
              change._tag === "add"
                ? await stripe.subscriptionItems.create(
                    {
                      price: change.price,
                      proration_behavior: "none",
                      subscription: subscriptionId,
                    },
                    {
                      idempotencyKey: `items-${subscriptionId}-${change.price}`,
                    }
                  )
                : await stripe.subscriptionItems.update(
                    change.item,
                    { price: change.price, proration_behavior: "none" },
                    {
                      idempotencyKey: `items-${subscriptionId}-${change.price}`,
                    }
                  )
            ),
          { discard: true }
        );

        const kept: ItemsKept = {
          added: changes.filter(({ _tag }) => _tag === "add").length,
          replaced: changes.filter(({ _tag }) => _tag === "replace").length,
        };

        return kept;
      }).pipe(Effect.withSpan("UsageBilling.ensureItems"));

    const setThreshold = (
      workspaceId: WorkspaceId,
      subscriptionId: string,
      cents: Option.Option<number>
    ) =>
      call(
        workspaceId,
        async (stripe) =>
          await stripe.subscriptions.update(
            subscriptionId,
            {
              billing_thresholds: Option.match(cents, {
                onNone: () => "" as const,
                onSome: (amount) => ({
                  amount_gte: amount,
                  reset_billing_cycle_anchor: false,
                }),
              }),
            },
            {
              idempotencyKey: `threshold-${subscriptionId}-${cents.pipe(
                Option.map((amount) => `${amount}`),
                Option.getOrElse(() => "none")
              )}`,
            }
          )
      ).pipe(Effect.asVoid, Effect.withSpan("UsageBilling.setThreshold"));

    return UsageBilling.of({ ensureItems, eventNames, report, setThreshold });
  })
);
