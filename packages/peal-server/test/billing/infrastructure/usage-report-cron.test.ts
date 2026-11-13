// The reporter of usage to Stripe runs only where the server bills: one
// that does not registers neither of its crons, so nothing of it runs.
import { assert, layer } from "@effect/vitest";
import { Effect, Exit, Layer, Option } from "effect";
import { Sharding } from "effect/cluster";

import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { ReportUsage } from "#billing/application/report-usage.ts";
import { StartAccountDays } from "#billing/application/start-account-days.ts";
import { usageReporting } from "#billing/infrastructure/usage-report-cron.ts";

const modeOf = (enabled: boolean) =>
  Layer.succeed(
    BillingMode,
    BillingMode.of({
      enabled,
      graceSince: Option.none(),
      graceUntil: Option.none(),
    })
  );

// The crons built against a cluster any call to dies: a cron registered
// calls it.
const builtOn = (enabled: boolean) =>
  Layer.build(
    usageReporting.pipe(
      Layer.provide(
        Layer.mergeAll(
          modeOf(enabled),
          Layer.mock(ReportUsage, {}),
          Layer.mock(StartAccountDays, {}),
          Layer.mock(Sharding.Sharding, {
            getShardId: () => assert.fail("no cluster here"),
            hasShardId: () => assert.fail("no cluster here"),
          })
        )
      )
    )
  ).pipe(Effect.scoped, Effect.exit);

layer(Layer.empty)("the reporter's crons", (it) => {
  it.effect(
    "are not registered on a server that does not bill, and are on one that does",
    () =>
      Effect.gen(function* registered() {
        assert.isTrue(Exit.isSuccess(yield* builtOn(false)));
        assert.isTrue(Exit.isFailure(yield* builtOn(true)));
      })
  );
});
