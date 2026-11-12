import { assert, layer } from "@effect/vitest";
import { Context, DateTime, Effect, Layer, Option, Ref, Result } from "effect";

import { AnalyticsRecords } from "#analytics/application/analytics-records.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { EngagementRecords } from "#engagement/application/engagement-records.ts";
import { LivePostEvents } from "#publishing/application/live-post-events.ts";
import { LivePostChangeIdSchema } from "#publishing/domain/live-post-change-id.ts";
import {
  failChange,
  finishChange,
  partEdited,
  partRemoved,
  requestEdit,
  requestUnpublish,
} from "#publishing/domain/live-post-change.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import { ToldLivePostEvents } from "#publishing/infrastructure/told-live-post-events.ts";
import { newId } from "#shared/application/ids.ts";
import { PostIdSchema, PostTargetIdSchema } from "#shared/domain/ids.ts";
import type { PostTargetId } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import {
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  syntheticCredentials,
} from "#test/channels/support.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import type { EventToPublish } from "#webhooks/application/webhook-events.ts";

// How a change of a live post is told: the webhook events, with ids,
// codes and instants only, and the contexts that stop following a post
// removed from its platform.

class Heard extends Context.Service<
  Heard,
  {
    readonly events: Effect.Effect<readonly EventToPublish[]>;
    readonly stopped: Effect.Effect<readonly string[]>;
  }
>()("test/publishing/Heard") {}

const Recording = Layer.effectContext(
  Effect.gen(function* Recording() {
    const events = yield* Ref.make<readonly EventToPublish[]>([]);
    const stopped = yield* Ref.make<readonly string[]>([]);

    const stop = (context: string) => (targetId: PostTargetId) =>
      Ref.update(stopped, (all) => [...all, `${context}:${targetId}`]);

    return Context.make(
      WebhookEvents,
      WebhookEvents.of({
        publish: (event) => Ref.update(events, (all) => [...all, event]),
      })
    ).pipe(
      Context.add(
        AnalyticsRecords,
        AnalyticsRecords.of({
          channelBack: () => Effect.void,
          channelGone: () => Effect.void,
          eraseWorkspace: () => Effect.void,
          exportAccounts: () => Effect.succeed([]),
          exportWorkspace: () => Effect.succeed([]),
          postRemoved: stop("analytics"),
        })
      ),
      Context.add(
        EngagementRecords,
        EngagementRecords.of({
          channelGone: () => Effect.void,
          eraseWorkspace: () => Effect.void,
          exportUser: () => Effect.succeed([]),
          forgetUser: () => Effect.void,
          postRemoved: stop("engagement"),
        })
      ),
      Context.add(Heard, {
        events: Ref.get(events),
        stopped: Ref.get(stopped),
      })
    );
  })
);

const EventsTest = ToldLivePostEvents.pipe(
  Layer.provideMerge(Recording),
  Layer.provideMerge(DrizzleChannelRepository),
  Layer.provideMerge(DatabaseTest)
);

const at = DateTime.makeUnsafe("2045-03-02T09:00:00.000Z");

layer(EventsTest)("the changes of live posts told", (it) => {
  it.effect("name the post, its channel and how it ended, never more", () =>
    Effect.gen(function* told() {
      const events = yield* LivePostEvents;
      const heard = yield* Heard;
      const workspaceId = yield* freshWorkspace;

      const channel = yield* freshChannel(workspaceId, {
        platform: "mastodon",
      });

      yield* ChannelRepository.use((channels) =>
        channels.insert(channel, syntheticCredentials(channel))
      );

      const target = new PostTarget({
        channelId: channel.id,
        id: yield* newId(PostTargetIdSchema),
        liveParts: [],
        options: Option.none(),
        postId: yield* newId(PostIdSchema),
        round: 1,
        status: {
          _tag: "published",
          permalink: Option.none(),
          platformPostId: Option.some(PlatformPostIdSchema.make("1")),
          publishedAt: at,
          removedAt: at,
        },
      });

      const change = requestUnpublish({
        channelId: channel.id,
        id: yield* newId(LivePostChangeIdSchema),
        now: at,
        parts: [{ index: 0, platformPostId: PlatformPostIdSchema.make("1") }],
        postId: target.postId,
        requestedBy: Option.none(),
        requestedVia: Option.none(),
        targetId: target.id,
        workspaceId,
      });

      const done = yield* Effect.fromResult(
        Result.flatMap(partRemoved(change, 0, true), (removed) =>
          finishChange(removed, at)
        )
      );

      const failed = yield* Effect.fromResult(
        failChange(change, "unavailable", at)
      );

      yield* events.unpublished(done, target);
      yield* events.unpublishFailed(failed, target);

      const ref = {
        channelId: channel.id,
        platform: "mastodon" as const,
        postId: target.postId,
        targetId: target.id,
        workspaceId,
      };

      assert.deepStrictEqual(yield* heard.events, [
        {
          event: {
            data: { ...ref, alreadyGone: true, removedAt: at },
            type: "post.unpublished",
          },
          key: `live-post-change:${change.id}:done`,
        },
        {
          event: {
            data: { ...ref, code: "unavailable", failedAt: at },
            type: "post.unpublish_failed",
          },
          key: `live-post-change:${change.id}:failed`,
        },
      ]);
      assert.deepStrictEqual(yield* heard.stopped, [
        `analytics:${target.id}`,
        `engagement:${target.id}`,
      ]);
    })
  );

  it.effect("tell an edit to the webhooks alone, with its part", () =>
    Effect.gen(function* toldEdit() {
      const events = yield* LivePostEvents;
      const heard = yield* Heard;
      const workspaceId = yield* freshWorkspace;

      const channel = yield* freshChannel(workspaceId, {
        platform: "mastodon",
      });

      yield* ChannelRepository.use((channels) =>
        channels.insert(channel, syntheticCredentials(channel))
      );

      const target = new PostTarget({
        channelId: channel.id,
        id: yield* newId(PostTargetIdSchema),
        liveParts: [],
        options: Option.none(),
        postId: yield* newId(PostIdSchema),
        round: 1,
        status: {
          _tag: "published",
          editedAt: at,
          permalink: Option.none(),
          platformPostId: Option.some(PlatformPostIdSchema.make("1")),
          publishedAt: at,
        },
      });

      const change = requestEdit({
        channelId: channel.id,
        id: yield* newId(LivePostChangeIdSchema),
        now: at,
        part: { index: 1, platformPostId: PlatformPostIdSchema.make("2") },
        postId: target.postId,
        requestedBy: Option.none(),
        requestedVia: Option.none(),
        targetId: target.id,
        text: "A corrected synthetic part",
        workspaceId,
      });

      const done = yield* Effect.fromResult(
        Result.flatMap(partEdited(change, 1), (edited) =>
          finishChange(edited, at)
        )
      );

      const failed = yield* Effect.fromResult(
        failChange(change, "postGone", at)
      );

      const before = (yield* heard.events).length;

      yield* events.edited(done, target, 1);
      yield* events.editFailed(failed, target, 1);

      const ref = {
        channelId: channel.id,
        platform: "mastodon" as const,
        postId: target.postId,
        targetId: target.id,
        workspaceId,
      };

      assert.deepStrictEqual((yield* heard.events).slice(before), [
        {
          event: {
            data: { ...ref, editedAt: at, part: 1 },
            type: "post.edited",
          },
          key: `live-post-change:${change.id}:done`,
        },
        {
          event: {
            data: { ...ref, code: "postGone", failedAt: at, part: 1 },
            type: "post.edit_failed",
          },
          key: `live-post-change:${change.id}:failed`,
        },
      ]);
      assert.notInclude(JSON.stringify(yield* heard.events), "corrected");
      assert.isFalse(
        (yield* heard.stopped).some((stopped) => stopped.endsWith(target.id))
      );
    })
  );
});
