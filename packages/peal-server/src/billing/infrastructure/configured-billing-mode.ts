import { min } from "drizzle-orm";
import { Config, DateTime, Effect, Layer, Option, Schema } from "effect";

import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { stripeSettingsConfig } from "#shared/infrastructure/stripe-settings.ts";

import { graceStarts } from "./schema.ts";

// A day, as `2027-01-31`: the grace runs until its first instant, UTC.
const GraceDaySchema = Schema.String.check(
  Schema.isPattern(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u, {
    description: "a day, as YYYY-MM-DD",
  })
).pipe(Schema.decodeTo(Schema.DateTimeUtcFromString));

/**
 * PEAL_BILLING_GRACE_UNTIL, optional (unset or empty: no grace): the day
 * until which a workspace on the free tier over its free accounts still
 * schedules and publishes.
 */
export const graceUntilConfig = Config.option(
  Config.schema(GraceDaySchema, "PEAL_BILLING_GRACE_UNTIL")
);

const graceStartOf = Effect.fn("BillingMode.graceStartOf")(
  function* graceStartOf(until: DateTime.Utc) {
    const db = yield* Drizzle;
    const day = DateTime.formatIsoDateUtc(until);
    const now = yield* DateTime.now;

    yield* db
      .insert(graceStarts)
      .values({ graceUntil: day, startedAt: DateTime.toDate(now) })
      .onConflictDoNothing()
      .pipe(Effect.orDie);

    // The first start with any grace: a day moved later never graces the
    // accounts connected since.
    const [row] = yield* db
      .select({ startedAt: min(graceStarts.startedAt) })
      .from(graceStarts)
      .pipe(Effect.orDie);

    const started = row?.startedAt ?? null;

    return started === null ? now : DateTime.makeUnsafe(started);
  }
);

/**
 * Billing is on when the server has a Stripe key (STRIPE_SECRET_KEY, see
 * `#shared/infrastructure/stripe-settings.ts`), with the grace
 * PEAL_BILLING_GRACE_UNTIL gives, read when it starts: a malformed setting
 * stops it there.
 */
export const ConfiguredBillingModeLive = Layer.effect(
  BillingMode,
  Effect.gen(function* ConfiguredBillingModeLive() {
    const stripe = yield* stripeSettingsConfig;
    const graceUntil = yield* graceUntilConfig;
    const enabled = Option.isSome(stripe);

    // When this server first ran with a grace, whatever its day, kept: a
    // restart, another server or a later day keeps the first.
    const graceSince =
      enabled && Option.isSome(graceUntil)
        ? Option.some(yield* graceStartOf(graceUntil.value))
        : Option.none<DateTime.Utc>();

    return BillingMode.of({ enabled, graceSince, graceUntil });
  })
);
