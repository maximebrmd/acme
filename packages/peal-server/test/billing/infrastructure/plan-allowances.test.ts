// Each context reads its limit from the workspace's plan, through its own
// port: channels, posts per month and the assistant's daily requests.
import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Layer, Option } from "effect";

import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { PlanAssistantAllowanceLive } from "#assistant/infrastructure/plan-assistant-allowance.ts";
import { ChannelAllowance } from "#channels/application/channel-allowance.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { PlanChannelAllowanceLive } from "#channels/infrastructure/plan-channel-allowance.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PlanPostAllowanceLive } from "#publishing/infrastructure/plan-post-allowance.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { Plan } from "#shared/domain/plan.ts";
import { everyWorkspaceOn, UnmeteredTest } from "#test/billing/support.ts";
import { WorkspaceSeats } from "#workspace/application/workspace-seats.ts";

const workspaceId = WorkspaceIdSchema.make(
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d"
);

const allowancesWith = (
  entitlements: typeof UnmeteredTest,
  env: Record<string, string> = {}
) =>
  Layer.mergeAll(
    PlanAssistantAllowanceLive,
    PlanChannelAllowanceLive,
    PlanPostAllowanceLive
  ).pipe(
    Layer.provide(entitlements),
    Layer.provide(
      Layer.succeed(
        ChannelUsage,
        ChannelUsage.of({
          connected: () => Effect.succeed(4),
          connectedIn: () => Effect.succeed(new Map()),
        })
      )
    ),
    Layer.provide(
      Layer.succeed(
        WorkspaceSeats,
        WorkspaceSeats.of({ taken: () => Effect.succeed(3) })
      )
    ),
    Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env)))
  );

const readAll = Effect.gen(function* readAll() {
  const assistant = yield* AssistantAllowance;
  const channels = yield* ChannelAllowance;
  const posts = yield* PostAllowance;

  return {
    assistantRequests: yield* assistant.dailyRequests(workspaceId),
    channels: yield* channels.channels(workspaceId),
    scheduledPosts: yield* posts.scheduledPerMonth(workspaceId),
    scheduling: yield* posts.channels(workspaceId),
    seats: yield* posts.members(workspaceId),
  };
});

const onPlan = (plan: Plan) =>
  readAll.pipe(Effect.provide(allowancesWith(everyWorkspaceOn(plan))));

describe("the plan allowances", () => {
  it.effect("follow the workspace's plan", () =>
    Effect.gen(function* plans() {
      assert.deepStrictEqual(yield* onPlan("free"), {
        assistantRequests: 3,
        channels: Option.some(3),
        scheduledPosts: Option.some(30),
        scheduling: { allowed: Option.some(3), connected: 4 },
        seats: { allowed: Option.some(2), taken: 3 },
      });

      assert.deepStrictEqual(yield* onPlan("business"), {
        assistantRequests: 40,
        channels: Option.some(30),
        scheduledPosts: Option.none(),
        scheduling: { allowed: Option.some(30), connected: 4 },
        seats: { allowed: Option.none(), taken: 3 },
      });
    })
  );

  it.effect(
    "limit nothing on a server that does not bill, but the assistant's day, as configured",
    () =>
      Effect.gen(function* off() {
        assert.deepStrictEqual(
          yield* readAll.pipe(Effect.provide(allowancesWith(UnmeteredTest))),
          {
            assistantRequests: 100,
            channels: Option.none(),
            scheduledPosts: Option.none(),
            scheduling: { allowed: Option.none(), connected: 4 },
            seats: { allowed: Option.none(), taken: 3 },
          }
        );

        const configured = yield* readAll.pipe(
          Effect.provide(
            allowancesWith(UnmeteredTest, { PEAL_AI_DAILY_REQUESTS: "7" })
          )
        );

        assert.strictEqual(configured.assistantRequests, 7);
      })
  );
});
