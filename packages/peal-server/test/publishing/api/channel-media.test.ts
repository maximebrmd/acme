import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api, LastTargetLeft, TargetStatusConflict } from "peal-contract";
import type { PostContent } from "peal-contract";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { MediaInPosts } from "#publishing/application/media-in-posts.ts";
import { newId } from "#shared/application/ids.ts";
import {
  MediaAssetIdSchema,
  PostIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import { utc } from "#test/publishing/infrastructure/harness.ts";
import {
  onPostsWithLibraryAt,
  storeMedia,
} from "#test/publishing/library-media.ts";
import { connect } from "#test/publishing/posts-server.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// A post that gives one channel media of its own, and a channel taken
// off a scheduled post, through the posts endpoints.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const later = { at: utc("2026-06-16T07:30:00Z"), timeZone: "Europe/Paris" };

const freshWorkspace = newId(WorkspaceIdSchema);

const editorIn = (workspaceId: WorkspaceId) =>
  HttpApiTest.groups(Api, ["posts"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        PostsHandlers.pipe(
          Layer.provideMerge(
            securityTest(memberOf(workspaceId, permissionsFor("editor")))
          )
        ),
        HttpServer.layerServices
      )
    )
  );

const attached = (mediaIds: readonly string[]) =>
  mediaIds.map((mediaId) => ({ altText: "A synthetic picture", mediaId }));

describe("a post with media of its own on a channel", () => {
  it.effect(
    "is checked channel by channel on the media each receives",
    () =>
      onPostsWithLibraryAt(
        start,
        Effect.gen(function* checksPerChannel() {
          const workspaceId = yield* freshWorkspace;
          const bluesky = yield* connect(workspaceId, "bluesky");
          const threads = yield* connect(workspaceId, "threads");
          const client = yield* editorIn(workspaceId);

          // Five photos, which Bluesky's four refuse: two of them there.
          const photos = yield* Effect.forEach(Array.from({ length: 5 }), () =>
            storeMedia(workspaceId)
          );

          const content: PostContent = {
            media: attached(photos),
            overrides: [
              {
                channelId: bluesky,
                media: attached(photos.slice(0, 2)),
                text: "Two of them here",
              },
            ],
            text: "Five synthetic pictures",
          };

          const draft = yield* client.posts.create({
            params: { workspaceId },
            payload: { channelIds: [threads, bluesky], content },
          });

          assert.deepStrictEqual(draft.content.overrides, content.overrides);

          const checked = yield* client.posts.validate({
            params: { workspaceId },
            payload: { channelIds: [threads, bluesky], content },
          });

          assert.isTrue(checked.valid);
          assert.deepStrictEqual(
            checked.channels.map(({ channelId, media }) => [
              channelId,
              media.count,
            ]),
            [
              [threads, 5],
              [bluesky, 2],
            ]
          );

          const scheduled = yield* client.posts.schedule({
            params: { postId: draft.id, workspaceId },
            payload: { ...later, channelIds: [threads, bluesky] },
          });

          assert.strictEqual(scheduled.status, "scheduled");

          // A file only Bluesky shows is in use while the post waits.
          const [own] = photos;

          assert(own !== undefined);

          const release = yield* MediaInPosts.use((inPosts) =>
            inPosts.release(workspaceId, MediaAssetIdSchema.make(own))
          ).pipe(Effect.provide(MediaInPosts.layer));

          assert.deepStrictEqual(release, {
            _tag: "inUse",
            scheduled: [PostIdSchema.make(draft.id)],
          });

          yield* client.posts.cancel({
            params: { postId: draft.id, workspaceId },
          });
        })
      ),
    timeout
  );

  it.effect(
    "refuses media of its own that is not the workspace's",
    () =>
      onPostsWithLibraryAt(
        start,
        Effect.gen(function* refusesUnknown() {
          const workspaceId = yield* freshWorkspace;
          const bluesky = yield* connect(workspaceId, "bluesky");
          const client = yield* editorIn(workspaceId);
          const unknown = yield* newId(MediaAssetIdSchema);

          const refused = yield* client.posts
            .create({
              params: { workspaceId },
              payload: {
                channelIds: [bluesky],
                content: {
                  media: [],
                  overrides: [
                    {
                      channelId: bluesky,
                      media: attached([unknown, "not-an-id"]),
                      text: "Here",
                    },
                  ],
                  text: "A synthetic post",
                },
              },
            })
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "UnknownMedia");
        })
      ),
    timeout
  );

  it.effect(
    "lets a draft go of a file only one channel showed",
    () =>
      onPostsWithLibraryAt(
        start,
        Effect.gen(function* releasesFromDraft() {
          const workspaceId = yield* freshWorkspace;
          const bluesky = yield* connect(workspaceId, "bluesky");
          const client = yield* editorIn(workspaceId);
          const photo = yield* storeMedia(workspaceId);

          const draft = yield* client.posts.create({
            params: { workspaceId },
            payload: {
              channelIds: [bluesky],
              content: {
                media: [],
                overrides: [
                  {
                    channelId: bluesky,
                    media: attached([photo]),
                    text: "Here",
                  },
                ],
                text: "A synthetic post",
              },
            },
          });

          const release = yield* MediaInPosts.use((inPosts) =>
            inPosts.release(workspaceId, MediaAssetIdSchema.make(photo))
          ).pipe(Effect.provide(MediaInPosts.layer));

          assert.deepStrictEqual(release, {
            _tag: "released",
            drafts: [PostIdSchema.make(draft.id)],
          });

          const kept = yield* client.posts.get({
            params: { postId: draft.id, workspaceId },
          });

          assert.deepStrictEqual(kept.content.overrides, [
            { channelId: bluesky, media: [], text: "Here" },
          ]);
        })
      ),
    timeout
  );
});

describe("removing a channel from a scheduled post", () => {
  it.effect(
    "answers the post without it, and refuses the last one",
    () =>
      onPostsWithLibraryAt(
        start,
        Effect.gen(function* removes() {
          const workspaceId = yield* freshWorkspace;
          const bluesky = yield* connect(workspaceId, "bluesky");
          const mastodon = yield* connect(workspaceId, "mastodon");
          const client = yield* editorIn(workspaceId);

          const post = yield* client.posts.send({
            headers: {},
            params: { workspaceId },
            payload: {
              channelIds: [bluesky, mastodon],
              content: { media: [], overrides: [], text: "A synthetic post" },
              when: { _tag: "at", ...later },
            },
            query: {},
          });

          const onBluesky = post.targets.find(
            ({ channelId }) => channelId === bluesky
          );

          const onMastodon = post.targets.find(
            ({ channelId }) => channelId === mastodon
          );

          assert(onBluesky !== undefined && onMastodon !== undefined);

          const removed = yield* client.posts.removeTarget({
            params: { postId: post.id, targetId: onBluesky.id, workspaceId },
          });

          assert.strictEqual(removed.status, "scheduled");
          assert.deepStrictEqual(
            removed.targets.map(({ channelId, dropped, status }) => ({
              channelId,
              dropped,
              status,
            })),
            post.targets.map(({ channelId }) =>
              channelId === bluesky
                ? { channelId, dropped: true, status: "cancelled" }
                : { channelId, dropped: undefined, status: "pending" }
            )
          );

          const again = yield* client.posts
            .removeTarget({
              params: { postId: post.id, targetId: onBluesky.id, workspaceId },
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            again,
            new TargetStatusConflict({ status: "cancelled" })
          );

          const last = yield* client.posts
            .removeTarget({
              params: { postId: post.id, targetId: onMastodon.id, workspaceId },
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(last, new LastTargetLeft());

          const response = yield* client.posts.removeTarget({
            params: { postId: post.id, targetId: onMastodon.id, workspaceId },
            responseMode: "response-only",
          });

          assert.strictEqual(response.status, 409);

          yield* client.posts.cancel({
            params: { postId: post.id, workspaceId },
          });
        })
      ),
    timeout
  );
});
