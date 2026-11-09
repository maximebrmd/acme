import { assert, describe, it } from "@effect/vitest";
import { Api, PostContentInvalid, UnknownMedia } from "peal-contract";
import type { PostContent, SchedulePost } from "peal-contract";
import { Duration, Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { newId } from "#shared/application/ids.ts";
import { MediaAssetIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import { utc } from "#test/publishing/infrastructure/harness.ts";
import {
  onPostsWithLibraryAt,
  removeMedia,
  storeMedia,
} from "#test/publishing/library-media.ts";
import { connect } from "#test/publishing/posts-server.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The posts endpoints with the media the media context holds: a post shows
// only ready media of its workspace, and is scheduled only with media each
// of its platforms takes.

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

const showing = (...mediaIds: readonly string[]): PostContent => ({
  media: mediaIds.map((mediaId) => ({
    altText: "A synthetic picture",
    mediaId,
  })),
  overrides: [],
  text: "A synthetic post",
});

describe("the posts endpoints, with media", () => {
  it.effect(
    "attach ready media of the workspace, and schedule them",
    () =>
      onPostsWithLibraryAt(
        start,
        Effect.gen(function* attachReady() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const client = yield* editorIn(workspaceId);
          const photo = yield* storeMedia(workspaceId);
          const second = yield* storeMedia(workspaceId);

          const draft = yield* client.posts.create({
            params: { workspaceId },
            payload: {
              channelIds: [mastodon],
              content: showing(second, photo),
            },
          });

          assert.deepStrictEqual(draft.content.media, [
            { altText: "A synthetic picture", mediaId: second },
            { altText: "A synthetic picture", mediaId: photo },
          ]);

          const scheduled = yield* client.posts.schedule({
            params: { postId: draft.id, workspaceId },
            payload: { ...later, channelIds: [mastodon] },
          });

          assert.strictEqual(scheduled.status, "scheduled");
          assert.deepStrictEqual(scheduled.content.media, draft.content.media);
        })
      ),
    timeout
  );

  it.effect(
    "answer 422 to media not ready, another workspace's, or unknown",
    () =>
      onPostsWithLibraryAt(
        start,
        Effect.gen(function* refuseUnusable() {
          const workspaceId = yield* freshWorkspace;
          const other = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const client = yield* editorIn(workspaceId);

          const ready = yield* storeMedia(workspaceId);

          const uploading = yield* storeMedia(workspaceId, {
            status: "uploaded",
          });

          const theirs = yield* storeMedia(other);
          const unknown = yield* newId(MediaAssetIdSchema);

          const refused = (...mediaIds: readonly string[]) =>
            client.posts
              .create({
                params: { workspaceId },
                payload: {
                  channelIds: [mastodon],
                  content: showing(...mediaIds),
                },
              })
              .pipe(Effect.flip);

          assert.deepStrictEqual(
            yield* refused(ready, uploading),
            new UnknownMedia({ mediaIds: [uploading] })
          );
          assert.deepStrictEqual(
            yield* refused(theirs, ready),
            new UnknownMedia({ mediaIds: [theirs] })
          );
          assert.deepStrictEqual(
            yield* refused(unknown),
            new UnknownMedia({ mediaIds: [unknown] })
          );

          const response = yield* client.posts.create({
            params: { workspaceId },
            payload: { channelIds: [mastodon], content: showing(uploading) },
            responseMode: "response-only",
          });

          assert.strictEqual(response.status, 422);

          // A draft's media is looked up again as it is scheduled: media
          // deleted since is unknown.
          const draft = yield* client.posts.create({
            params: { workspaceId },
            payload: { channelIds: [mastodon], content: showing(ready) },
          });

          yield* removeMedia(workspaceId, ready);

          const gone = yield* client.posts
            .schedule({
              params: { postId: draft.id, workspaceId },
              payload: { ...later, channelIds: [mastodon] },
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(gone, new UnknownMedia({ mediaIds: [ready] }));
        })
      ),
    timeout
  );

  it.effect(
    "answer 422 with each platform's media violations, channel by channel",
    () =>
      onPostsWithLibraryAt(
        start,
        Effect.gen(function* mediaViolations() {
          const workspaceId = yield* freshWorkspace;
          const bluesky = yield* connect(workspaceId, "bluesky");
          const threads = yield* connect(workspaceId, "threads");
          const x = yield* connect(workspaceId, "x");
          const instagram = yield* connect(workspaceId, "instagram");
          const client = yield* editorIn(workspaceId);

          // Five photos: Threads shows up to 20, Bluesky 4.
          const photos = yield* Effect.forEach(Array.from({ length: 5 }), () =>
            storeMedia(workspaceId)
          );

          const album = yield* client.posts.create({
            params: { workspaceId },
            payload: { channelIds: [], content: showing(...photos) },
          });

          const tooMany = yield* client.posts
            .schedule({
              params: { postId: album.id, workspaceId },
              payload: { ...later, channelIds: [threads, bluesky] },
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            tooMany,
            new PostContentInvalid({
              violations: [
                {
                  _tag: "tooManyMedia",
                  channelId: bluesky,
                  count: 5,
                  maximum: 4,
                  platform: "bluesky",
                },
              ],
            })
          );

          // A GIF and a video of two and a half minutes.
          const gif = yield* storeMedia(workspaceId, {
            byteSize: 1_000_000,
            contentType: "image/gif",
          });

          const clip = yield* storeMedia(workspaceId, {
            byteSize: 30_000_000,
            contentType: "video/mp4",
            dimensions: { height: 1920, width: 1080 },
            duration: Duration.seconds(150),
          });

          const mixed = yield* client.posts.create({
            params: { workspaceId },
            payload: { channelIds: [], content: showing(gif, clip) },
          });

          const params = { postId: mixed.id, workspaceId };

          const payload: SchedulePost = {
            ...later,
            channelIds: [x, instagram, threads],
          };

          const refused = yield* client.posts
            .schedule({ params, payload })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            refused,
            new PostContentInvalid({
              violations: [
                {
                  _tag: "videoTooLong",
                  channelId: x,
                  durationMs: 150_000,
                  maximumMs: 140_000,
                  mediaId: clip,
                  platform: "x",
                },
                { _tag: "mixedMedia", channelId: x, platform: "x" },
                {
                  _tag: "mediaTypeUnsupported",
                  channelId: instagram,
                  contentType: "image/gif",
                  mediaId: gif,
                  platform: "instagram",
                },
                {
                  _tag: "mediaTypeUnsupported",
                  channelId: threads,
                  contentType: "image/gif",
                  mediaId: gif,
                  platform: "threads",
                },
              ],
            })
          );

          const response = yield* client.posts.schedule({
            params,
            payload,
            responseMode: "response-only",
          });

          assert.strictEqual(response.status, 422);
        })
      ),
    timeout
  );
});
