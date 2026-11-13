import { Effect, Layer, Option, Redacted, Schema } from "effect";

import { MeterErrorEvents } from "#billing/application/ports/meter-error-events.ts";
import type { MeterErrorReading } from "#billing/application/ports/meter-error-events.ts";
import { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { stripeClientOf } from "#shared/infrastructure/stripe-client.ts";
import {
  meterWebhookSecretConfig,
  stripeSettingsConfig,
} from "#shared/infrastructure/stripe-settings.ts";

// The events that say Stripe could not count meter events it took.
const reportTypes: ReadonlySet<string> = new Set([
  "v1.billing.meter.error_report_triggered",
  "v1.billing.meter.no_meter_found",
]);

const ThinSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  type: Schema.String,
});

const decodeThin = Schema.decodeUnknownOption(ThinSchema);

// What the full event says, its samples' messages left out: they may quote
// what was sent.
const FullSchema = Schema.Struct({
  data: Schema.Struct({
    reason: Schema.Struct({
      error_types: Schema.Array(
        Schema.Struct({
          code: Schema.String,
          error_count: Schema.Int,
          sample_errors: Schema.optional(
            Schema.Array(
              Schema.Struct({
                request: Schema.optional(
                  Schema.Struct({ identifier: Schema.String })
                ),
              })
            )
          ),
        })
      ),
    }),
  }),
  id: Schema.NonEmptyString,
});

const decodeFull = Schema.decodeUnknownOption(FullSchema);

// No workspace is named: the errors are the account's.
const noWorkspace = WorkspaceIdSchema.make(
  "00000000-0000-4000-8000-000000000000"
);

// Stripe answering, or not, a read of the full event: an outage is
// waited on, anything else of a signed report is counted as unreadable.
const OutageSchema = Schema.Struct({
  statusCode: Schema.optional(Schema.Int),
  type: Schema.String,
});

const decodeOutage = Schema.decodeUnknownOption(OutageSchema);

const isOutage = (cause: unknown): boolean =>
  Option.match(decodeOutage(cause), {
    onNone: () => true,
    onSome: ({ statusCode, type }) =>
      statusCode === undefined ||
      statusCode === 429 ||
      statusCode >= 500 ||
      type === "StripeConnectionError",
  });

const unreadable = (eventId: string): MeterErrorReading => ({
  _tag: "report",
  report: {
    errors: [{ code: "unreadable", count: 1, identifiers: [] }],
    eventId,
  },
});

const refused: MeterErrorReading = { _tag: "refused" };
const ignored: MeterErrorReading = { _tag: "ignored" };

/**
 * Stripe's meter error events, from the event destination's thin events:
 * the signature checked with STRIPE_METER_WEBHOOK_SECRET, then the full
 * event read from Stripe's API with the server's key. Without either,
 * every event is refused.
 */
export const StripeMeterErrorEventsLive = Layer.effect(
  MeterErrorEvents,
  Effect.gen(function* StripeMeterErrorEventsLive() {
    const settings = yield* stripeSettingsConfig;
    const secret = yield* meterWebhookSecretConfig;

    const ready = Option.all({ secret, settings }).pipe(
      Option.map(({ secret: signing, settings: held }) => ({
        secret: Redacted.value(signing),
        // Asked once: Stripe sends the event again.
        stripe: stripeClientOf(held, { maxNetworkRetries: 0, timeout: 20_000 }),
      }))
    );

    if (Option.isSome(settings) && Option.isNone(secret)) {
      yield* Effect.logWarning(
        "This server bills without STRIPE_METER_WEBHOOK_SECRET: meter events Stripe takes and cannot count go unheard (the docs' self-hosting options, Billing)"
      );
    }

    const read = (body: string, signature: string) =>
      Option.match(ready, {
        onNone: () => Effect.succeed(refused),
        onSome: ({ secret: signing, stripe }) =>
          Effect.gen(function* reading() {
            const verified = yield* Effect.tryPromise(
              async () =>
                await stripe.parseEventNotificationAsync(
                  body,
                  signature,
                  signing
                )
            ).pipe(
              Effect.map((notification) => decodeThin(notification)),
              Effect.orElseSucceed(() => Option.none())
            );

            if (Option.isNone(verified)) {
              return refused;
            }

            if (!reportTypes.has(verified.value.type)) {
              return ignored;
            }

            const eventId = verified.value.id;

            const event = yield* Effect.tryPromise({
              catch: (cause) => ({ outage: isOutage(cause) }),
              try: async () => await stripe.v2.core.events.retrieve(eventId),
            }).pipe(
              Effect.map(Option.some),
              Effect.catch(({ outage }) =>
                outage
                  ? Effect.fail(
                      new StripeUnreachable({ workspaceId: noWorkspace })
                    )
                  : Effect.logError(
                      "Stripe refused to give a meter error event in full: counted as unreadable"
                    ).pipe(
                      Effect.annotateLogs({ eventId }),
                      Effect.as(Option.none())
                    )
              )
            );

            const full = event.pipe(Option.flatMap(decodeFull));

            if (Option.isNone(full)) {
              if (Option.isSome(event)) {
                yield* Effect.logError(
                  "A meter error event Stripe gave could not be read: counted as unreadable"
                ).pipe(Effect.annotateLogs({ eventId }));
              }

              return unreadable(eventId);
            }

            const report: MeterErrorReading = {
              _tag: "report",
              report: {
                errors: full.value.data.reason.error_types.map(
                  ({ code, error_count: count, sample_errors: samples }) => ({
                    code,
                    count,
                    identifiers: (samples ?? []).flatMap(({ request }) =>
                      request === undefined ? [] : [request.identifier]
                    ),
                  })
                ),
                eventId: full.value.id,
              },
            };

            return report;
          }).pipe(Effect.withSpan("MeterErrorEvents.read")),
      });

    return MeterErrorEvents.of({ enabled: Option.isSome(ready), read });
  })
);
