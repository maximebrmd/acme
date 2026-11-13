// PEAL_BILLING_GRACE_UNTIL: a day, read when the server starts; unset or
// empty, no grace; anything else stops the server.
import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import {
  BillingMode,
  inGrace,
} from "#billing/application/ports/billing-mode.ts";
import {
  ConfiguredBillingModeLive,
  graceUntilConfig,
} from "#billing/infrastructure/configured-billing-mode.ts";
import { DatabaseTest } from "#test/channels/support.ts";

const read = (env: Record<string, string>) =>
  Effect.gen(function* config() {
    return yield* graceUntilConfig;
  }).pipe(
    Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnv({ env })))
  );

describe("the billing grace", () => {
  it.effect("is none when unset or empty", () =>
    Effect.gen(function* none() {
      assert.isTrue(Option.isNone(yield* read({})));
      assert.isTrue(
        Option.isNone(yield* read({ PEAL_BILLING_GRACE_UNTIL: "" }))
      );
    })
  );

  it.effect("runs until the first instant of the day given, UTC", () =>
    Effect.gen(function* day() {
      const until = yield* read({ PEAL_BILLING_GRACE_UNTIL: "2027-01-31" });

      assert.deepStrictEqual(
        until,
        Option.some(DateTime.makeUnsafe("2027-01-31T00:00:00Z"))
      );
      assert.isTrue(
        inGrace(until, DateTime.makeUnsafe("2027-01-30T23:59:59Z"))
      );
      assert.isFalse(
        inGrace(until, DateTime.makeUnsafe("2027-01-31T00:00:00Z"))
      );
      assert.isFalse(
        inGrace(Option.none(), DateTime.makeUnsafe("2020-01-01T00:00:00Z"))
      );
    })
  );

  it.effect("refuses anything but a day", () =>
    Effect.gen(function* refused() {
      for (const value of ["31/01/2027", "2027-01-31T10:00:00Z", "soon"]) {
        const failed = yield* read({ PEAL_BILLING_GRACE_UNTIL: value }).pipe(
          Effect.flip
        );

        assert.strictEqual(failed._tag, "ConfigError");
      }
    })
  );
});

// Days no other test uses; this file alone writes the grace's starts.
const day = "2098-07-14";

const later = "2098-09-01";

const modeOn = (graceDay: string) =>
  BillingMode.use(Effect.succeed).pipe(
    Effect.provide(
      ConfiguredBillingModeLive.pipe(
        Layer.provide(
          ConfigProvider.layer(
            ConfigProvider.fromEnv({
              env: {
                PEAL_BILLING_GRACE_UNTIL: graceDay,
                STRIPE_SECRET_KEY: "sk_test_synthetic_grace",
                STRIPE_WEBHOOK_SECRET: "whsec_synthetic_grace",
              },
            })
          )
        )
      )
    )
  );

describe("the billing grace's start", () => {
  it.live(
    "is the first start with any grace, kept by every start after, whatever the day",
    () =>
      Effect.gen(function* first() {
        const sql = yield* SqlClient.SqlClient;
        const forget = sql`DELETE FROM billing.grace_starts`;

        yield* forget;

        const before = Date.now();
        const once = yield* modeOn(day);

        assert.isTrue(
          Option.exists(
            once.graceSince,
            (since) => since.epochMilliseconds >= before - 1000
          )
        );

        // Another start, or another server, keeps the first.
        yield* sql`UPDATE billing.grace_starts SET started_at = '2026-11-13T10:00:00Z' WHERE grace_until = ${day}`;

        const first = Option.some(DateTime.makeUnsafe("2026-11-13T10:00:00Z"));

        assert.deepStrictEqual((yield* modeOn(day)).graceSince, first);

        // A grace moved to a later day still counts from the first: the
        // accounts connected in between are not graced.
        assert.deepStrictEqual((yield* modeOn(later)).graceSince, first);

        yield* forget;
      }).pipe(Effect.provide(DatabaseTest))
  );
});
