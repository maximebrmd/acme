import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Duration, Effect } from "effect";

import { defaultSweepPolicy } from "#media/application/sweep-policy.ts";
import { sweepPolicyConfig } from "#media/infrastructure/sweep-settings.ts";

const policyFrom = (values: Readonly<Record<string, string>>) =>
  sweepPolicyConfig.parse(ConfigProvider.fromUnknown(values));

describe("the media sweeps' settings", () => {
  it.effect("default to a day for each bound, 500 a run", () =>
    Effect.gen(function* defaults() {
      assert.deepStrictEqual(yield* policyFrom({}), defaultSweepPolicy);
    })
  );

  it.effect("read durations and the batch", () =>
    Effect.gen(function* given() {
      const policy = yield* policyFrom({
        PEAL_MEDIA_SWEEP_BATCH: "50",
        PEAL_MEDIA_SWEEP_ORPHANS_AFTER: "3 days",
        PEAL_MEDIA_SWEEP_PENDING_AFTER: "7 hours",
        PEAL_MEDIA_SWEEP_UPLOADS_AFTER: "2 days",
      });

      assert.strictEqual(policy.batch, 50);
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
