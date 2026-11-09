import { assert, describe, it } from "@effect/vitest";
import { Effect, Option, Schema } from "effect";

import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import type { TargetOptions } from "#publishing/domain/target-options.ts";
import { YouTubeOptions } from "#publishing/domain/youtube-options.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { scheduleIn } from "#test/publishing/infrastructure/harness.ts";
import {
  attachableImage,
  connect,
  onPostsServerAt,
} from "#test/publishing/posts-server.ts";
import { actorIn, contentOf } from "#test/publishing/support.ts";

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const newWorkspace = newId(WorkspaceIdSchema);

const finishedYouTube = new YouTubeOptions({
  madeForKids: false,
  privacy: "unlisted",
  title: "A synthetic launch video",
});

const on = (channelId: ChannelId, options: TargetOptions) =>
  new ChannelOptions({ channelId, options });

const violationsOf = (failure: { readonly _tag: string }) =>
  Schema.is(PostContentRejected)(failure) ? failure.violations : [];

describe("a post's options on its channels", () => {
  it.effect(
    "are kept unfinished in a draft, target by target, and replaced",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* keptInDrafts() {
          const drafts = yield* PostDrafts;
          const actor = actorIn(yield* newWorkspace);
          const youtube = yield* connect(actor.workspaceId, "youtube");
          const mastodon = yield* connect(actor.workspaceId, "mastodon");
          const unfinished = new YouTubeOptions({ title: "A working title" });

          const created = yield* drafts.create(actor, {
            channelIds: [youtube, mastodon],
            content: contentOf("A synthetic video"),
            options: [on(youtube, unfinished)],
          });

          assert.deepStrictEqual(
            created.targets.map(({ options }) => options),
            [Option.some(unfinished), Option.none()]
          );

          const updated = yield* drafts.update(actor, created.post.id, {
            channelIds: [youtube, mastodon],
            content: contentOf("A synthetic video"),
            options: [on(youtube, finishedYouTube)],
          });

          // The same targets, with their new options.
          assert.deepStrictEqual(
            updated.targets.map(({ id }) => id),
            created.targets.map(({ id }) => id)
          );
          assert.deepStrictEqual(
            updated.targets.map(({ options }) => options),
            [Option.some(finishedYouTube), Option.none()]
          );

          const stored = yield* PostRepository.use((posts) =>
            posts.targets(created.post.id)
          );

          assert.deepStrictEqual(
            stored.find(({ channelId }) => channelId === youtube)?.options,
            Option.some(finishedYouTube)
          );

          // Left out, a draft's options are none.
          const cleared = yield* drafts.update(actor, created.post.id, {
            channelIds: [youtube],
            content: contentOf("A synthetic video"),
          });

          assert.deepStrictEqual(
            cleared.targets.map(({ options }) => options),
            [Option.none()]
          );
        })
      ),
    timeout
  );

  it.effect(
    "are refused in a draft on another platform, or on no channel of it",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refusedInDrafts() {
          const drafts = yield* PostDrafts;
          const actor = actorIn(yield* newWorkspace);
          const tiktok = yield* connect(actor.workspaceId, "tiktok");
          const youtube = yield* connect(actor.workspaceId, "youtube");

          const refused = yield* drafts
            .create(actor, {
              channelIds: [tiktok],
              content: contentOf(""),
              options: [
                on(tiktok, finishedYouTube),
                on(youtube, finishedYouTube),
              ],
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(violationsOf(refused), [
            { _tag: "optionsWithoutChannel", channelId: youtube },
            {
              _tag: "optionsForOtherPlatform",
              channelId: tiktok,
              optionsPlatform: "youtube",
              platform: "tiktok",
            },
          ]);
        })
      ),
    timeout
  );

  it.effect(
    "are needed to schedule, and stay with the targets that had them",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* neededToSchedule() {
          const drafts = yield* PostDrafts;
          const scheduling = yield* PostScheduling;
          const actor = actorIn(yield* newWorkspace);
          const youtube = yield* connect(actor.workspaceId, "youtube");
          const tiktok = yield* connect(actor.workspaceId, "tiktok");
          const at = scheduleIn("2026-06-15T08:00:00Z");

          const draft = yield* drafts.create(actor, {
            channelIds: [youtube],
            content: contentOf("A synthetic video", {
              media: [attachableImage],
            }),
            options: [on(youtube, new YouTubeOptions({ madeForKids: true }))],
          });

          const unfinished = yield* scheduling
            .scheduleDraft(actor, draft.post.id, {
              channelIds: [youtube],
              schedule: at,
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(violationsOf(unfinished), [
            {
              _tag: "optionMissing",
              channelId: youtube,
              field: "title",
              platform: "youtube",
            },
          ]);

          yield* drafts.update(actor, draft.post.id, {
            channelIds: [youtube],
            content: contentOf("A synthetic video", {
              media: [attachableImage],
            }),
            options: [on(youtube, finishedYouTube)],
          });

          // A channel the draft was not for has no options yet.
          const added = yield* scheduling
            .scheduleDraft(actor, draft.post.id, {
              channelIds: [youtube, tiktok],
              schedule: at,
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(violationsOf(added), [
            {
              _tag: "optionMissing",
              channelId: tiktok,
              field: "privacyLevel",
              platform: "tiktok",
            },
          ]);

          const scheduled = yield* scheduling.scheduleDraft(
            actor,
            draft.post.id,
            { channelIds: [youtube], schedule: at }
          );

          assert.strictEqual(scheduled.post.status._tag, "scheduled");
          assert.deepStrictEqual(
            scheduled.targets.map(({ options }) => options),
            [Option.some(finishedYouTube)]
          );

          yield* scheduling.cancel(actor, draft.post.id);

          // A post scheduled at once is checked the same way.
          const direct = yield* scheduling
            .schedule(actor, {
              channelIds: [tiktok],
              content: contentOf("A synthetic video", {
                media: [attachableImage],
              }),
              schedule: at,
            })
            .pipe(Effect.flip);

          assert.strictEqual(violationsOf(direct)[0]?._tag, "optionMissing");
        })
      ),
    timeout
  );
});
