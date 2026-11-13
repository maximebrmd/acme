// The media context's storage allowance, from billing: on a server that
// does not bill, an upload reads no pool and takes no partner's hold.
import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { PlanPools } from "#billing/application/ports/plan-pools.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { StorageAllowance } from "#media/application/ports/storage-allowance.ts";
import { PlanStorageAllowanceLive } from "#media/infrastructure/plan-storage-allowance.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { everyWorkspaceOn, UnmeteredTest } from "#test/billing/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "7b8c9d0e-1f2a-4b3c-8d4e-5f6a7b8c9d0e"
);

const other = WorkspaceIdSchema.make("8c9d0e1f-2a3b-4c4d-9e5f-6a7b8c9d0e1f");

const allowanceWith = (entitlements: typeof UnmeteredTest, enabled: boolean) =>
  PlanStorageAllowanceLive.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(
          BillingMode,
          BillingMode.of({ enabled, graceUntil: Option.none() })
        ),
        Layer.succeed(
          PlanPools,
          PlanPools.of({
            sharedWith: () =>
              enabled
                ? Effect.succeed([other])
                : Effect.die("no pool is read on a server that does not bill"),
            sharingIn: () => Effect.die("not read here"),
          })
        ),
        Layer.mock(ChannelUsage, { connected: () => Effect.succeed(0) })
      )
    ),
    Layer.provide(entitlements)
  );

const read = StorageAllowance.use((allowed) =>
  Effect.all([allowed.bytes(workspaceId), allowed.sharedWith(workspaceId)])
);

describe("the storage allowance", () => {
  it.effect("reads no pool on a server that does not bill", () =>
    Effect.gen(function* unbilled() {
      assert.deepStrictEqual(
        yield* read.pipe(Effect.provide(allowanceWith(UnmeteredTest, false))),
        [Option.none(), []]
      );
    })
  );

  it.effect("counts the pool on a server that bills", () =>
    Effect.gen(function* billed() {
      assert.deepStrictEqual(
        yield* read.pipe(
          Effect.provide(allowanceWith(everyWorkspaceOn("free"), true))
        ),
        [Option.some(1_000_000_000), [other]]
      );
    })
  );
});
