import { assert, describe, it } from "@effect/vitest";
import {
  Api,
  Forbidden,
  InvalidTimeRange,
  InvalidTimeZone,
  PostContentInvalid,
  PostNotFound,
  PostStatusConflict,
  ScheduleInPast,
  UnknownChannels,
  UnknownMedia,
} from "acme-contract";
import type { Member, PostContent, SchedulePost } from "acme-contract";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import { utc } from "#test/publishing/infrastructure/harness.ts";
import {
  attachableImage,
  connect,
  onPostsServerAt,
} from "#test/publishing/posts-server.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

// A client of the posts endpoints whose every request acts as the member, as
// the WorkspaceAccess middleware would hand them to the handlers.
const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["posts"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        PostsHandlers.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const as = (
  role: "contributor" | "editor" | "viewer",
  workspaceId: WorkspaceId
) => clientAs(memberOf(workspaceId, permissionsFor(role)));

const text = (body: string): PostContent => ({
  media: [],
  overrides: [],
  text: body,
});

const freshWorkspace = newId(WorkspaceIdSchema);

describe("the posts endpoints", () => {
  it.effect(
    "create, read, edit, schedule, move and cancel a post",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* lifecycle() {
          const workspaceId = yield* freshWorkspace;
          const bluesky = yield* connect(workspaceId, "bluesky");
          const mastodon = yield* connect(workspaceId, "mastodon");
          const client = yield* as("editor", workspaceId);

          const createdResponse = yield* client.posts.create({
            params: { workspaceId },
            payload: { channelIds: [bluesky], content: text("First words") },
            responseMode: "response-only",
          });

          assert.strictEqual(createdResponse.status, 201);

          const created = yield* client.posts.create({
            params: { workspaceId },
            payload: {
              channelIds: [bluesky],
              content: {
                media: [
                  { altText: "A synthetic chart", mediaId: attachableImage },
                ],
                overrides: [{ channelId: bluesky, text: "For Bluesky" }],
                text: "First words",
              },
            },
          });

          assert.strictEqual(created.status, "draft");
          assert.isNull(created.schedule);
          assert.deepStrictEqual(created.content.overrides, [
            { channelId: bluesky, text: "For Bluesky" },
          ]);
          assert.deepStrictEqual(
            created.targets.map(({ channelId, status }) => [channelId, status]),
            [[bluesky, "pending"]]
          );

          const params = { postId: created.id, workspaceId };

          const updated = yield* client.posts.update({
            params,
            payload: {
              channelIds: [bluesky, mastodon],
              content: text("Better words #launch @acme_example"),
            },
          });

          assert.strictEqual(
            updated.content.text,
            "Better words #launch @acme_example"
          );
          assert.lengthOf(updated.targets, 2);

          assert.deepStrictEqual(yield* client.posts.get({ params }), updated);

          const scheduled = yield* client.posts.schedule({
            params,
            payload: {
              at: utc("2026-06-16T07:30:00Z"),
              channelIds: [mastodon],
              timeZone: "Europe/Paris",
            },
          });

          assert.strictEqual(scheduled.status, "scheduled");
          assert.deepStrictEqual(scheduled.schedule, {
            at: utc("2026-06-16T07:30:00Z"),
            timeZone: "Europe/Paris",
          });
          assert.deepStrictEqual(
            scheduled.targets.map(({ channelId }) => channelId),
            [mastodon]
          );

          const moved = yield* client.posts.reschedule({
            params,
            payload: {
              at: utc("2026-06-17T16:00:00Z"),
              timeZone: "America/New_York",
            },
          });

          assert.deepStrictEqual(moved.schedule, {
            at: utc("2026-06-17T16:00:00Z"),
            timeZone: "America/New_York",
          });

          const listed = yield* client.posts.list({
            params: { workspaceId },
            query: {
              from: utc("2026-06-15T00:00:00Z"),
              to: utc("2026-06-22T00:00:00Z"),
            },
          });

          assert.deepStrictEqual(
            listed.map(({ id }) => id),
            [created.id]
          );

          const cancelled = yield* client.posts.cancel({ params });

          assert.strictEqual(cancelled.status, "cancelled");
          assert.deepStrictEqual(
            cancelled.targets.map(({ status }) => status),
            ["cancelled"]
          );
        })
      ),
    timeout
  );

  it.effect(
    "answer 422 with every violation of the platforms' rules",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* contentInvalid() {
          const workspaceId = yield* freshWorkspace;
          const x = yield* connect(workspaceId, "x");
          const instagram = yield* connect(workspaceId, "instagram");
          const client = yield* as("editor", workspaceId);

          const draft = yield* client.posts.create({
            params: { workspaceId },
            payload: { channelIds: [], content: text("日".repeat(141)) },
          });

          const params = { postId: draft.id, workspaceId };

          const payload: SchedulePost = {
            at: utc("2026-06-16T07:30:00Z"),
            channelIds: [x, instagram],
            timeZone: "Europe/Paris",
          };

          const error = yield* client.posts
            .schedule({ params, payload })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            error,
            new PostContentInvalid({
              violations: [
                {
                  _tag: "textTooLong",
                  channelId: x,
                  length: 282,
                  maximum: 280,
                  platform: "x",
                  unit: "weighted",
                },
                {
                  _tag: "mediaRequired",
                  channelId: instagram,
                  platform: "instagram",
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

  it.effect(
    "answer 422 to channels, media, zones and times that cannot be used",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* unusable() {
          const workspaceId = yield* freshWorkspace;
          const other = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const theirs = yield* connect(other, "mastodon");
          const client = yield* as("editor", workspaceId);
          const workspace = { workspaceId };

          const foreign = yield* client.posts
            .create({
              params: workspace,
              payload: {
                channelIds: [theirs, "not-a-channel"],
                content: text("Hi"),
              },
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            foreign,
            new UnknownChannels({ channelIds: ["not-a-channel"] })
          );

          const elsewhere = yield* client.posts
            .create({
              params: workspace,
              payload: { channelIds: [theirs], content: text("Hi") },
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            elsewhere,
            new UnknownChannels({ channelIds: [theirs] })
          );

          // Until the media context can look assets up, none is attachable
          // on the server; here only one is.
          const image = yield* client.posts
            .create({
              params: workspace,
              payload: {
                channelIds: [mastodon],
                content: {
                  media: [
                    {
                      altText: "",
                      mediaId: "00000000-0000-7000-8000-00000000a002",
                    },
                  ],
                  overrides: [],
                  text: "Hi",
                },
              },
            })
            .pipe(Effect.flip);

          assert.instanceOf(image, UnknownMedia);

          const draft = yield* client.posts.create({
            params: workspace,
            payload: { channelIds: [mastodon], content: text("Hi") },
          });

          const params = { postId: draft.id, workspaceId };

          const zone = yield* client.posts
            .schedule({
              params,
              payload: {
                at: utc("2026-06-16T07:30:00Z"),
                channelIds: [mastodon],
                timeZone: "+01:00",
              },
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            zone,
            new InvalidTimeZone({ timeZone: "+01:00" })
          );

          const past = yield* client.posts
            .schedule({
              params,
              payload: {
                at: utc("2026-06-15T06:00:00Z"),
                channelIds: [mastodon],
                timeZone: "Europe/Paris",
              },
            })
            .pipe(Effect.flip);

          assert.instanceOf(past, ScheduleInPast);
        })
      ),
    timeout
  );

  it.effect(
    "answer 409 to editing a post that is no longer a draft",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* conflict() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const client = yield* as("editor", workspaceId);

          const draft = yield* client.posts.create({
            params: { workspaceId },
            payload: { channelIds: [mastodon], content: text("Hi") },
          });

          const params = { postId: draft.id, workspaceId };

          yield* client.posts.cancel({ params });

          const error = yield* client.posts
            .update({
              params,
              payload: { channelIds: [mastodon], content: text("Too late") },
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            error,
            new PostStatusConflict({ status: "cancelled" })
          );

          const response = yield* client.posts.cancel({
            params,
            responseMode: "response-only",
          });

          assert.strictEqual(response.status, 409);
        })
      ),
    timeout
  );

  it.effect(
    "answer 404 to another workspace's post, or to no post at all",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* notFound() {
          const theirs = yield* freshWorkspace;
          const mine = yield* freshWorkspace;
          const owner = yield* as("editor", theirs);

          const post = yield* owner.posts.create({
            params: { workspaceId: theirs },
            payload: { channelIds: [], content: text("Theirs") },
          });

          const client = yield* as("editor", mine);

          for (const postId of [post.id, "not-a-post-id"]) {
            const error = yield* client.posts
              .get({ params: { postId, workspaceId: mine } })
              .pipe(Effect.flip);

            assert.instanceOf(error, PostNotFound);
          }

          const response = yield* client.posts.cancel({
            params: { postId: post.id, workspaceId: mine },
            responseMode: "response-only",
          });

          assert.strictEqual(response.status, 404);
        })
      ),
    timeout
  );

  it.effect(
    "answer 403 to members their role does not allow",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* forbidden() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const viewer = yield* as("viewer", workspaceId);
          const contributor = yield* as("contributor", workspaceId);
          const workspace = { workspaceId };

          const refused = yield* viewer.posts
            .create({
              params: workspace,
              payload: { channelIds: [], content: text("Hi") },
            })
            .pipe(Effect.flip);

          assert.instanceOf(refused, Forbidden);

          const draft = yield* contributor.posts.create({
            params: workspace,
            payload: { channelIds: [mastodon], content: text("Hi") },
          });

          const response = yield* contributor.posts.schedule({
            params: { postId: draft.id, workspaceId },
            payload: {
              at: utc("2026-06-16T07:30:00Z"),
              channelIds: [mastodon],
              timeZone: "Europe/Paris",
            },
            responseMode: "response-only",
          });

          assert.strictEqual(response.status, 403);

          // A viewer reads.
          const read = yield* viewer.posts.get({
            params: { postId: draft.id, workspaceId },
          });

          assert.strictEqual(read.id, draft.id);
        })
      ),
    timeout
  );

  it.effect(
    "answer 400 to a range that cannot be listed",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* badRange() {
          const workspaceId = yield* freshWorkspace;
          const client = yield* as("viewer", workspaceId);

          const error = yield* client.posts
            .list({
              params: { workspaceId },
              query: {
                from: utc("2026-06-01T00:00:00Z"),
                to: utc("2026-09-01T00:00:00Z"),
              },
            })
            .pipe(Effect.flip);

          assert.instanceOf(error, InvalidTimeRange);

          const response = yield* client.posts.list({
            params: { workspaceId },
            query: {
              from: utc("2026-06-02T00:00:00Z"),
              to: utc("2026-06-01T00:00:00Z"),
            },
            responseMode: "response-only",
          });

          assert.strictEqual(response.status, 400);
        })
      ),
    timeout
  );
});
