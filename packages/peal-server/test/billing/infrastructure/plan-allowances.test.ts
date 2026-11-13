// Each context reads its limit from the workspace's plan, through its own
// port: channels, posts per month and the assistant's daily requests.
import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, DateTime, Effect, Layer, Option } from "effect";

import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { PlanAssistantAllowanceLive } from "#assistant/infrastructure/plan-assistant-allowance.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { PlanPools } from "#billing/application/ports/plan-pools.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { Entitlements } from "#billing/domain/entitlements.ts";
import { ChannelAllowance } from "#channels/application/channel-allowance.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { PlanChannelAllowanceLive } from "#channels/infrastructure/plan-channel-allowance.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PlanPostAllowanceLive } from "#publishing/infrastructure/plan-post-allowance.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { Plan } from "#shared/domain/plan.ts";
import {
  everyWorkspaceOn,
  subscriptionOf,
  UnmeteredTest,
} from "#test/billing/support.ts";
import { WorkspaceSeats } from "#workspace/application/workspace-seats.ts";

const workspaceId = WorkspaceIdSchema.make(
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d"
);

const allowancesWith = (
  entitlements: Layer.Layer<WorkspaceEntitlements>,
  env: Record<string, string> = {},
  graceUntil: Option.Option<DateTime.Utc> = Option.none(),
  connectedBefore = 4
) =>
  Layer.mergeAll(
    PlanAssistantAllowanceLive,
    PlanChannelAllowanceLive,
    PlanPostAllowanceLive
  ).pipe(
    // The grace given, over any the entitlements' layer brings.
    Layer.provide(
      Layer.succeed(
        BillingMode,
        BillingMode.of({ enabled: true, graceSince: graceUntil, graceUntil })
      )
    ),
    Layer.provide(PlanPools.layerAlone),
    Layer.provide(entitlements),
    Layer.provide(
      Layer.succeed(
        ChannelUsage,
        ChannelUsage.of({
          connected: (_workspaceId, before) =>
            Effect.succeed(before === undefined ? 4 : connectedBefore),
          connectedAcross: () => Effect.die("not read here"),
          connectedIn: () => Effect.succeed(new Map()),
        })
      )
    ),
    Layer.provide(
      Layer.succeed(
        WorkspaceSeats,
        WorkspaceSeats.of({
          page: () => Effect.succeed([]),
          taken: () => Effect.succeed(3),
          takenIn: () => Effect.die("not read here"),
        })
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
      // The free tier: 2 accounts, no assistant on the server's models,
      // members and posts unlimited.
      assert.deepStrictEqual(yield* onPlan("free"), {
        assistantRequests: 0,
        channels: Option.some(2),
        scheduledPosts: Option.none(),
        scheduling: { allowed: Option.some(2), connected: 4 },
        seats: { allowed: Option.none(), taken: 3 },
      });

      // Per-account pricing: every account, and the legacy pro plan's
      // daily assistant until its monthly meter.
      assert.deepStrictEqual(yield* onPlan("payAsYouGo"), {
        assistantRequests: 20,
        channels: Option.none(),
        scheduledPosts: Option.none(),
        scheduling: { allowed: Option.none(), connected: 4 },
        seats: { allowed: Option.none(), taken: 3 },
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
    "let the free tier over its accounts schedule until the grace's day, and connect nothing more",
    () =>
      Effect.gen(function* grace() {
        // The tests' clock starts in 1970.
        const during = yield* readAll.pipe(
          Effect.provide(
            allowancesWith(
              everyWorkspaceOn("free"),
              {},
              Option.some(DateTime.makeUnsafe("2027-01-31T00:00:00Z"))
            )
          )
        );

        // Its four were connected before the grace started.
        assert.deepStrictEqual(during.scheduling, {
          allowed: Option.some(4),
          connected: 4,
        });
        assert.deepStrictEqual(during.channels, Option.some(2));

        // One connected since is no grace's: the four are over.
        const since = yield* readAll.pipe(
          Effect.provide(
            allowancesWith(
              everyWorkspaceOn("free"),
              {},
              Option.some(DateTime.makeUnsafe("2027-01-31T00:00:00Z")),
              3
            )
          )
        );

        assert.deepStrictEqual(since.scheduling, {
          allowed: Option.some(3),
          connected: 4,
        });

        // Nor does it lift staff's requirement of a payment method.
        const required = yield* readAll.pipe(
          Effect.provide(
            allowancesWith(
              everyWorkspaceOn("free", false),
              {},
              Option.some(DateTime.makeUnsafe("2027-01-31T00:00:00Z"))
            )
          )
        );

        assert.deepStrictEqual(required.scheduling, {
          allowed: Option.some(0),
          connected: 4,
        });

        const after = yield* readAll.pipe(
          Effect.provide(
            allowancesWith(
              everyWorkspaceOn("free"),
              {},
              Option.some(DateTime.makeUnsafe("1969-12-31T00:00:00Z"))
            )
          )
        );

        assert.deepStrictEqual(after.scheduling, {
          allowed: Option.some(2),
          connected: 4,
        });

        // A paid plan's own limit is no grace's.
        const legacy = yield* readAll.pipe(
          Effect.provide(
            allowancesWith(
              everyWorkspaceOn("starter"),
              {},
              Option.some(DateTime.makeUnsafe("2027-01-31T00:00:00Z"))
            )
          )
        );

        assert.deepStrictEqual(legacy.scheduling, {
          allowed: Option.some(5),
          connected: 4,
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

  it.effect(
    "let a trial make no image, however many requests its plan has",
    () =>
      Effect.gen(function* trial() {
        const on = (status: "active" | "trialing") =>
          AssistantAllowance.use((assistant) =>
            Effect.all([
              assistant.dailyRequests(workspaceId),
              assistant.imageRequests(workspaceId),
            ])
          ).pipe(
            Effect.provide(
              allowancesWith(
                Layer.succeed(
                  WorkspaceEntitlements,
                  WorkspaceEntitlements.of({
                    of: () =>
                      Effect.succeed(
                        new Entitlements({
                          freeTier: true,
                          plan: Option.some("pro"),
                          subscription: Option.some(
                            subscriptionOf({ plan: "pro", status, workspaceId })
                          ),
                        })
                      ),
                    ofEach: () => Effect.die("not read here"),
                  })
                )
              )
            )
          );

        assert.deepStrictEqual(yield* on("active"), [20, 20]);
        assert.deepStrictEqual(yield* on("trialing"), [20, 0]);
        assert.deepStrictEqual(
          yield* AssistantAllowance.use((assistant) =>
            assistant.imageRequests(workspaceId)
          ).pipe(Effect.provide(allowancesWith(UnmeteredTest))),
          100
        );
      })
  );
  it.effect(
    "count the assistant's day across the billing account on a server that bills, and each workspace alone elsewhere",
    () =>
      Effect.gen(function* assistantPool() {
        const other = WorkspaceIdSchema.make(
          "7b8c9d0e-1f2a-4b3c-9d4e-5f6a7b8c9d0e"
        );

        const sharedOn = (enabled: boolean) =>
          AssistantAllowance.use((allowance) =>
            Effect.all({
              held: allowance.sharedWith(workspaceId),
              pooled: Effect.succeed(allowance.pooled),
              reported: allowance.sharingWith(workspaceId),
            })
          ).pipe(
            Effect.provide(
              PlanAssistantAllowanceLive.pipe(
                Layer.provide(
                  Layer.succeed(
                    BillingMode,
                    BillingMode.of({
                      enabled,
                      graceSince: Option.none(),
                      graceUntil: Option.none(),
                    })
                  )
                ),
                Layer.provide(
                  Layer.succeed(
                    PlanPools,
                    PlanPools.of({
                      sharedWith: () => Effect.succeed([other]),
                      sharingIn: (ids) =>
                        Effect.succeed(new Map(ids.map((id) => [id, [other]]))),
                    })
                  )
                ),
                Layer.provide(everyWorkspaceOn("payAsYouGo")),
                Layer.provide(
                  ConfigProvider.layer(ConfigProvider.fromUnknown({}))
                )
              )
            )
          );

        assert.deepStrictEqual(yield* sharedOn(true), {
          held: [other],
          pooled: true,
          reported: [other],
        });
        assert.deepStrictEqual(yield* sharedOn(false), {
          held: [],
          pooled: false,
          reported: [],
        });
      })
  );
});
