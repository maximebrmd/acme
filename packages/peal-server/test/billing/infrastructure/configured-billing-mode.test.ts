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

// A day no other test uses, so its first start is this test's.
const day = "2098-07-14";

const mode = BillingMode.use(Effect.succeed).pipe(
  Effect.provide(
    ConfiguredBillingModeLive.pipe(
      Layer.provide(
        ConfigProvider.layer(
          ConfigProvider.fromEnv({
            env: {
              PEAL_BILLING_GRACE_UNTIL: day,
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
  it.live("is the first start with its day, kept by every start after", () =>
    Effect.gen(function* first() {
      const sql = yield* SqlClient.SqlClient;
      const forget = sql`DELETE FROM billing.grace_starts WHERE grace_until = ${day}`;

      yield* forget;

      const before = Date.now();
      const once = yield* mode;

      assert.isTrue(
        Option.exists(
          once.graceSince,
          (since) => since.epochMilliseconds >= before - 1000
        )
      );

      // Another start, or another server, keeps the first.
      yield* sql`UPDATE billing.grace_starts SET started_at = '2026-11-13T10:00:00Z' WHERE grace_until = ${day}`;

      assert.deepStrictEqual(
        (yield* mode).graceSince,
        Option.some(DateTime.makeUnsafe("2026-11-13T10:00:00Z"))
      );

      yield* forget;
    }).pipe(Effect.provide(DatabaseTest))
  );
});
