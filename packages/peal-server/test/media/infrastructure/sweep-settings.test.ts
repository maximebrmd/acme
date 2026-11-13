import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Duration, Effect } from "effect";

import { defaultSweepPolicy } from "#media/application/sweep-policy.ts";
import { sweepPolicyConfig } from "#media/infrastructure/sweep-settings.ts";

const policyFrom = (values: Readonly<Record<string, string>>) =>
  sweepPolicyConfig.parse(ConfigProvider.fromUnknown(values));

describe("the media sweeps' settings", () => {
  it.effect(
    "default to on in production, a day for each bound, 500 a run and 100 orphans a page",
    () =>
      Effect.gen(function* defaults() {
        assert.deepStrictEqual(
          yield* policyFrom({ NODE_ENV: "production" }),
          defaultSweepPolicy
        );
      })
  );

  it.effect("default to off outside production", () =>
    Effect.gen(function* development() {
      assert.isFalse((yield* policyFrom({})).enabled);
      assert.isFalse((yield* policyFrom({ NODE_ENV: "test" })).enabled);
    })
  );

  it.effect("turn on and off as told", () =>
    Effect.gen(function* told() {
      assert.isTrue((yield* policyFrom({ PEAL_MEDIA_SWEEPS: "on" })).enabled);
      assert.isFalse(
        (yield* policyFrom({
          NODE_ENV: "production",
          PEAL_MEDIA_SWEEPS: "off",
        })).enabled
      );
    })
  );

  it.effect("read durations and the batch", () =>
    Effect.gen(function* given() {
      const policy = yield* policyFrom({
        PEAL_MEDIA_SWEEP_BATCH: "50",
        PEAL_MEDIA_SWEEP_ORPHANS_LIMIT: "20",
        PEAL_MEDIA_SWEEP_ORPHANS_AFTER: "3 days",
        PEAL_MEDIA_SWEEP_PENDING_AFTER: "7 hours",
        PEAL_MEDIA_SWEEP_UPLOADS_AFTER: "2 days",
      });

      assert.strictEqual(policy.batch, 50);
      assert.strictEqual(policy.orphansLimit, 20);
      assert.isTrue(Duration.equals(policy.orphansAfter, Duration.days(3)));
      assert.isTrue(Duration.equals(policy.pendingAfter, Duration.hours(7)));
      assert.isTrue(Duration.equals(policy.uploadsAfter, Duration.days(2)));
    })
  );

  it.effect.each([
    ["PEAL_MEDIA_SWEEP_PENDING_AFTER", "6 hours"],
    ["PEAL_MEDIA_SWEEP_UPLOADS_AFTER", "1 hour"],
    ["PEAL_MEDIA_SWEEP_ORPHANS_AFTER", "0 seconds"],
    ["PEAL_MEDIA_SWEEP_ORPHANS_AFTER", "soon"],
    ["PEAL_MEDIA_SWEEP_PENDING_AFTER", "Infinity"],
    ["PEAL_MEDIA_SWEEP_UPLOADS_AFTER", "Infinity days"],
    ["PEAL_MEDIA_SWEEPS", "sometimes"],
    ["PEAL_MEDIA_SWEEP_ORPHANS_LIMIT", "0"],
    ["PEAL_MEDIA_SWEEP_BATCH", "0"],
    ["PEAL_MEDIA_SWEEP_BATCH", "10001"],
    ["PEAL_MEDIA_SWEEP_BATCH", "1.5"],
  ] as const)("refuse %s=%s, which would stop the server", ([name, value]) =>
    Effect.gen(function* refused() {
      const error = yield* Effect.flip(policyFrom({ [name]: value }));

      assert.include(String(error), name);
    })
  );
});
