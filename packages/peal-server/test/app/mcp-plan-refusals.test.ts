import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Stream } from "effect";
import { CurrentMember } from "peal-contract";
import type { Member } from "peal-contract";

import { MediaToolsLive } from "#app/mcp/media-handlers.ts";
import { MediaTools } from "#app/mcp/media-tools.ts";
import { PostToolsLive } from "#app/mcp/posts-handlers.ts";
import { PostTools } from "#app/mcp/posts-tools.ts";
import { WritingAssistant } from "#assistant/application/writing-assistant.ts";
import { MediaLibrary } from "#media/application/media-library.ts";
import { LivePostChanges } from "#publishing/application/live-post-changes.ts";
import { PostBatches } from "#publishing/application/post-batches.ts";
import { PostChecks } from "#publishing/application/post-checks.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import { PostOutcomes } from "#publishing/application/post-outcomes.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PostSearch } from "#publishing/application/post-search.ts";
import { Queues } from "#publishing/application/queues.ts";
import { Recycling } from "#publishing/application/recycling.ts";
import { TikTokCreatorInfo } from "#publishing/application/tiktok-creator-info.ts";
import { UpgradePaths } from "#shared/application/upgrade-paths.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// A plan's refusal reads the same from every tool that can meet one: what
// the plan allows and the workspace holds, the plan with room and the
// billing page, as inviting does. The use cases are stand-ins that refuse.

const workspaceId = "0f5b8c1e-2a3d-4e6f-8a9b-1c2d3e4f5a6b";

const billingUrl = `http://localhost:3001/app/${workspaceId}/billing`;

const member: Member = {
  permissions: permissionsFor("owner"),
  principal: {
    _tag: "user",
    impersonatedBy: null,
    userId: "5b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
  },
  workspaceId,
};

const refusing = (reached: PlanLimitReached) => Effect.fail(reached);

// Why the tool was refused, as the client reads it.
const refusalOf = <A, E extends { readonly message: string }, R>(
  called: Effect.Effect<Stream.Stream<A, E, R>, E, R>
) =>
  called.pipe(
    Effect.flatMap(Stream.runDrain),
    Effect.flip,
    Effect.map(({ message }) => message),
    Effect.provideService(CurrentMember, member)
  );

describe("a plan's refusal, through the tools", () => {
  it.effect(
    "tells an import the storage the plan allows, the plan with room and the billing page",
    () =>
      Effect.gen(function* importing() {
        const tools = yield* MediaTools;

        const refusal = yield* refusalOf(
          tools.handle("import_media", {
            url: "https://files.example.com/picture.png",
          })
        );

        assert.strictEqual(
          refusal,
          `Nothing was stored. The workspace's Free plan allows 1000000000 bytes of media stored, uploads in progress included, and it has 999999000. The Starter plan has room: an owner or an admin of the workspace orders it on its billing page, ${billingUrl}`
        );
      }).pipe(
        Effect.provide(
          MediaToolsLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                Layer.mock(MediaLibrary, {
                  importMedia: () =>
                    refusing(
                      new PlanLimitReached({
                        allowed: 1_000_000_000,
                        limit: "mediaStorage",
                        needed: 1_000_002_000,
                        used: 999_999_000,
                      })
                    ),
                }),
                Layer.mock(WritingAssistant, {}),
                UpgradePaths.layerTest
              )
            )
          )
        )
      )
  );

  it.effect(
    "tells an image the storage the plan allows, before anything is made",
    () =>
      Effect.gen(function* generating() {
        const tools = yield* MediaTools;

        const refusal = yield* refusalOf(
          tools.handle("generate_image", {
            prompt: "A lighthouse at dawn, in watercolour.",
          })
        );

        assert.strictEqual(
          refusal,
          `Nothing was made. The workspace's Free plan allows 1000000000 bytes of media stored, uploads in progress included, and it has 999999000. The Starter plan has room: an owner or an admin of the workspace orders it on its billing page, ${billingUrl}`
        );
      }).pipe(
        Effect.provide(
          MediaToolsLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                Layer.mock(MediaLibrary, {}),
                Layer.mock(WritingAssistant, {
                  generateImage: () =>
                    refusing(
                      new PlanLimitReached({
                        allowed: 1_000_000_000,
                        limit: "mediaStorage",
                        needed: 1_000_000_000 + 16 * 1024 * 1024,
                        used: 999_999_000,
                      })
                    ),
                }),
                UpgradePaths.layerTest
              )
            )
          )
        )
      )
  );

  it.effect(
    "tells a post sent in one call what the workspace holds beyond its plan, whatever the limit",
    () =>
      Effect.gen(function* sending() {
        const tools = yield* PostTools;

        const refusal = yield* refusalOf(
          tools.handle("create_post", {
            channelIds: ["0190f3a0-0000-7000-8000-00000000c001"],
            content: { media: [], overrides: [], text: "A synthetic post." },
            when: { _tag: "now" },
          })
        );

        assert.strictEqual(
          refusal,
          `Nothing was scheduled or published. The workspace's Free plan allows 1 members, pending invitations included, and it has 3. The Starter plan has room: an owner or an admin of the workspace orders it on its billing page, ${billingUrl}`
        );
      }).pipe(
        Effect.provide(
          PostToolsLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                Layer.mock(PostScheduling, {
                  send: () =>
                    refusing(
                      new PlanLimitReached({
                        allowed: 1,
                        limit: "members",
                        needed: 3,
                        used: 3,
                      })
                    ),
                }),
                Layer.mock(PostBatches, {}),
                Layer.mock(PostChecks, {}),
                Layer.mock(PostDrafts, {}),
                Layer.mock(PostFollowUp, {}),
                Layer.mock(LivePostChanges, {}),
                Layer.mock(PostOutcomes, {}),
                Layer.mock(PostQueries, {}),
                Layer.mock(PostSearch, {}),
                Layer.mock(Queues, {}),
                Layer.mock(Recycling, {}),
                Layer.mock(TikTokCreatorInfo, {}),
                UpgradePaths.layerTest
              )
            )
          )
        )
      )
  );
});
