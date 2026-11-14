import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Layer, Option } from "effect";

import { ChannelDefaults } from "#publishing/application/channel-defaults.ts";
import { ChannelSets } from "#publishing/application/channel-sets.ts";
import { MediaInPosts } from "#publishing/application/media-in-posts.ts";
import { PostChecks } from "#publishing/application/post-checks.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { YouTubeOptions } from "#publishing/domain/youtube-options.ts";
import { DrizzleArticleStore } from "#publishing/infrastructure/drizzle-article-store.ts";
import { newId } from "#shared/application/ids.ts";
import { MediaAssetIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { setTime, utc } from "#test/publishing/infrastructure/harness.ts";
import {
  attachableImage,
  attachableVideo,
  connect,
  onPostsServerAt,
  postsServerWith,
} from "#test/publishing/posts-server.ts";
import {
  actorIn,
  attachableMedia,
  contentOf,
  mediaFile,
} from "#test/publishing/support.ts";

// A file of the library an option names (a YouTube thumbnail): not media
// the post shows, but a file it depends on, checked, kept and copied as
// one.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const freshWorkspace = newId(WorkspaceIdSchema);

const unknownImage = MediaAssetIdSchema.make(
  "00000000-0000-7000-8000-00000000a0e9"
);

const youTubeOptions = (thumbnailMediaId = attachableImage) =>
  new YouTubeOptions({
    madeForKids: false,
    thumbnailMediaId,
    title: "A synthetic video",
  });

const on = (channelId: ChannelId, options: YouTubeOptions) =>
  new ChannelOptions({ channelId, options });

const video = contentOf("A synthetic video's description", {
  media: [attachableVideo],
});

describe("a file an option names", () => {
  it.effect(
    "must be a ready file of the workspace, for a draft as for a post",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* unknown() {
          const drafts = yield* PostDrafts;
          const workspaceId = yield* freshWorkspace;
          const youtube = yield* connect(workspaceId, "youtube");
          const actor = actorIn(workspaceId);

          const refused = yield* drafts
            .create(actor, {
              channelIds: [youtube],
              content: video,
              options: [on(youtube, youTubeOptions(unknownImage))],
            })
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "UnknownMedia");
          assert.deepStrictEqual(
            "mediaIds" in refused ? refused.mediaIds : [],
            [unknownImage]
          );

          const checked = yield* PostChecks.use((checks) =>
            checks.check(actor, {
              channelIds: [youtube],
              content: video,
              options: [on(youtube, youTubeOptions(unknownImage))],
              when: Option.none(),
            })
          );

          assert.deepStrictEqual(checked.unknownMedia, [unknownImage]);
        })
      ),
    timeout
  );

  it.effect(
    "is refused at scheduling and at a check when it is no thumbnail YouTube takes",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refused() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const youtube = yield* connect(workspaceId, "youtube");
          const actor = actorIn(workspaceId);
          const options = [on(youtube, youTubeOptions(attachableVideo))];

          const rejected = yield* scheduling
            .send(actor, {
              channelIds: [youtube],
              content: video,
              idempotency: Option.none(),
              options,
              placement: { _tag: "at", at: utc("2026-06-16T08:00:00Z") },
              tagIds: [],
              timeZone: TimeZoneIdSchema.make("Europe/Paris"),
            })
            .pipe(Effect.flip);

          assert.strictEqual(rejected._tag, "PostContentRejected");
          assert.deepInclude(
            "violations" in rejected ? rejected.violations : [],
            {
              _tag: "optionInvalid",
              channelId: youtube,
              field: "thumbnailMediaId",
              platform: "youtube",
            }
          );

          const checked = yield* PostChecks.use((checks) =>
            checks.check(actor, {
              channelIds: [youtube],
              content: video,
              options,
              when: Option.none(),
            })
          );

          assert.isTrue(
            checked.channels
              .flatMap(({ violations }) => violations)
              .some(
                (violation) =>
                  violation._tag === "optionInvalid" &&
                  violation.field === "thumbnailMediaId"
              )
          );
        })
      ),
    timeout
  );

  it.effect(
    "keeps a scheduled post's file from being deleted, and leaves a draft's",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* inUse() {
          const drafts = yield* PostDrafts;
          const scheduling = yield* PostScheduling;
          const inPosts = yield* MediaInPosts;
          const workspaceId = yield* freshWorkspace;
          const youtube = yield* connect(workspaceId, "youtube");
          const actor = actorIn(workspaceId);

          const draft = yield* drafts.create(actor, {
            channelIds: [youtube],
            content: video,
            options: [on(youtube, youTubeOptions())],
          });

          const sent = yield* scheduling.send(actor, {
            channelIds: [youtube],
            content: video,
            idempotency: Option.none(),
            options: [on(youtube, youTubeOptions())],
            placement: { _tag: "at", at: utc("2026-06-16T08:00:00Z") },
            tagIds: [],
            timeZone: TimeZoneIdSchema.make("Europe/Paris"),
          });

          // The image is no media either post shows, only the thumbnail.
          assert.deepStrictEqual(
            yield* inPosts.usage(workspaceId, attachableImage),
            {
              articles: { drafts: [], scheduled: [] },
              drafts: [draft.post.id],
              scheduled: [sent.post.id],
            }
          );
          assert.deepStrictEqual(
            yield* inPosts.release(workspaceId, attachableImage),
            { _tag: "inUse", articles: [], scheduled: [sent.post.id] }
          );

          yield* scheduling.cancel(actor, sent.post.id);

          assert.deepStrictEqual(
            yield* inPosts.release(workspaceId, attachableImage),
            { _tag: "released", drafts: [draft.post.id] }
          );

          // The draft lost the thumbnail, and kept its other options: a
          // copy shows it, as the image is still the workspace's.
          const kept = yield* drafts.duplicate(actor, draft.post.id);

          assert.deepStrictEqual(
            kept.targets.map(({ options }) => options),
            [
              Option.some(
                new YouTubeOptions({
                  madeForKids: false,
                  title: "A synthetic video",
                })
              ),
            ]
          );
        }).pipe(
          Effect.provide(
            MediaInPosts.layer.pipe(Layer.provide(DrizzleArticleStore))
          )
        )
      ),
    timeout
  );

  it.effect(
    "is left out of a copy once the workspace no longer has it",
    () => {
      // The library, from which a file goes once the post is made.
      const files = [
        mediaFile(attachableImage),
        mediaFile(attachableVideo, {
          contentType: "video/mp4",
          duration: Option.some(Duration.seconds(30)),
        }),
      ];

      return setTime(start).pipe(
        Effect.andThen(
          Effect.gen(function* copied() {
            const drafts = yield* PostDrafts;
            const workspaceId = yield* freshWorkspace;
            const youtube = yield* connect(workspaceId, "youtube");
            const actor = actorIn(workspaceId);

            const draft = yield* drafts.create(actor, {
              channelIds: [youtube],
              content: video,
              options: [on(youtube, youTubeOptions())],
            });

            files.splice(0, 1);

            const copy = yield* drafts.duplicate(actor, draft.post.id);

            assert.deepStrictEqual(
              copy.targets.map(({ options }) => options),
              [
                Option.some(
                  new YouTubeOptions({
                    madeForKids: false,
                    title: "A synthetic video",
                  })
                ),
              ]
            );
          }).pipe(Effect.provide(postsServerWith(attachableMedia(files))))
        )
      );
    },
    timeout
  );

  it.effect(
    "cannot be kept in a channel set or a channel's default options",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* saved() {
          const workspaceId = yield* freshWorkspace;
          const youtube = yield* connect(workspaceId, "youtube");
          const actor = actorIn(workspaceId);
          const options = youTubeOptions();

          const violation = {
            _tag: "optionInvalid" as const,
            channelId: youtube,
            field: "thumbnailMediaId",
            platform: "youtube" as const,
          };

          const inSet = yield* ChannelSets.use((sets) =>
            sets.create(actor, {
              channelIds: [youtube],
              name: "Synthetic videos",
              options: [on(youtube, options)],
            })
          ).pipe(Effect.flip);

          assert.strictEqual(inSet._tag, "PostContentRejected");
          assert.deepStrictEqual(
            "violations" in inSet ? inSet.violations : [],
            [violation]
          );

          const asDefault = yield* ChannelDefaults.use((defaults) =>
            defaults.set(actor, youtube, options)
          ).pipe(Effect.flip);

          assert.strictEqual(asDefault._tag, "PostContentRejected");
          assert.deepStrictEqual(
            "violations" in asDefault ? asDefault.violations : [],
            [violation]
          );
        })
      ),
    timeout
  );
});
