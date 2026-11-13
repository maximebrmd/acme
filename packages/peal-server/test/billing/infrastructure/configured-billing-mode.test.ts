// PEAL_BILLING_GRACE_UNTIL: a day, read when the server starts; unset or
// empty, no grace; anything else stops the server.
import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, DateTime, Effect, Option } from "effect";

import { inGrace } from "#billing/application/ports/billing-mode.ts";
import { graceUntilConfig } from "#billing/infrastructure/configured-billing-mode.ts";

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
