import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import {
  Api,
  PostNotFound,
  PostStatusConflict,
  TargetStatusConflict,
} from "peal-contract";
import type { Member, Permission, PostContent } from "peal-contract";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { refused as forbiddenFor } from "#shared/api/forbidden.ts";
import { newId } from "#shared/application/ids.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PostIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  eventually,
  isFinished,
  isSuspended,
  setTime,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";
import type { Role } from "#workspace/domain/roles.ts";

// The endpoints that follow a post through its life: the drafts page,
// discarding, unscheduling, and reposting or confirming a channel once the
// post went out.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const freshId = newId(WorkspaceIdSchema);

// A client whose every request acts as the user, with the role's rights.
const clientAs = (userId: string, workspaceId: WorkspaceId, role: Role) => {
  const permissions: readonly Permission[] = permissionsFor(role);

  const member: Member = {
    permissions,
    principal: { _tag: "user", impersonatedBy: null, userId },
    workspaceId,
  };

  return HttpApiTest.groups(Api, ["posts"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        PostsHandlers.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );
};

const text = (body: string): PostContent => ({
  media: [],
  overrides: [],
  text: body,
});

describe("the drafts endpoints", () => {
  it.effect(
    "list the drafts newest first, and discard one as its author may",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* drafts() {
          const workspaceId = yield* freshId;
          const authorId = yield* freshId;
          const author = yield* clientAs(authorId, workspaceId, "contributor");

          const colleague = yield* clientAs(
            yield* freshId,
            workspaceId,
            "contributor"
          );

          const editor = yield* clientAs(yield* freshId, workspaceId, "editor");
          const channelId = yield* connect(workspaceId, "mastodon");
          const params = { workspaceId };

          const created = yield* Effect.forEach(
            ["One", "Two", "Three"],
            (body) =>
              author.posts.create({
                params,
                payload: { channelIds: [channelId], content: text(body) },
              })
          );

          const [one, two, three] = created;

          assert(one !== undefined && two !== undefined && three !== undefined);
          assert.strictEqual(one.authorId, authorId);

          // Scheduled, it is no longer a draft.
          yield* editor.posts.reschedule({
            params: { postId: three.id, workspaceId },
            payload: { at: utc("2026-06-16T08:00:00Z"), timeZone: "UTC" },
          });

          const page = yield* author.posts.drafts({
            params,
            query: { limit: 1 },
          });

          assert.deepStrictEqual(
            page.items.map(({ id }) => id),
            [two.id]
          );
          assert.strictEqual(page.nextCursor, two.id);

          const rest = yield* author.posts.drafts({
            params,
            query: { cursor: two.id },
          });

          assert.deepStrictEqual(
            rest.items.map(({ content }) => content.text),
            ["One"]
          );
          assert.isNull(rest.nextCursor);

          const malformed = yield* author.posts.drafts({
            params,
            query: { cursor: "not-a-post" },
            responseMode: "response-only",
          });

          assert.strictEqual(malformed.status, 400);

          assert.deepStrictEqual(
            yield* colleague.posts
              .discard({ params: { postId: one.id, workspaceId } })
              .pipe(Effect.flip),
            forbiddenFor("missingPermission", "post:delete")
          );

          const discarded = yield* author.posts.discard({
            params: { postId: one.id, workspaceId },
            responseMode: "response-only",
          });

          assert.strictEqual(discarded.status, 204);

          assert.deepStrictEqual(
            yield* editor.posts
              .get({ params: { postId: one.id, workspaceId } })
              .pipe(Effect.flip),
            new PostNotFound()
          );

          yield* editor.posts.discard({
            params: { postId: two.id, workspaceId },
          });

          assert.deepStrictEqual(
            yield* editor.posts
              .discard({ params: { postId: three.id, workspaceId } })
              .pipe(Effect.flip),
            new PostStatusConflict({ status: "scheduled" })
          );

          assert.lengthOf(
            (yield* author.posts.drafts({ params, query: {} })).items,
            0
          );

          yield* editor.posts.cancel({
            params: { postId: three.id, workspaceId },
          });
        })
      ),
    timeout
  );
});

describe("the unschedule endpoint", () => {
  it.effect(
    "takes a scheduled post back to draft, to edit and schedule again",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* unschedules() {
          const workspaceId = yield* freshId;
          const editor = yield* clientAs(yield* freshId, workspaceId, "editor");

          const contributor = yield* clientAs(
            yield* freshId,
            workspaceId,
            "contributor"
          );

          const channelId = yield* connect(workspaceId, "mastodon");

          const draft = yield* editor.posts.create({
            params: { workspaceId },
            payload: { channelIds: [channelId], content: text("Soon") },
          });

          const params = { postId: draft.id, workspaceId };

          yield* editor.posts.schedule({
            params,
            payload: {
              at: utc("2026-06-16T08:00:00Z"),
              channelIds: [channelId],
              timeZone: "Europe/Paris",
            },
          });

          assert.deepStrictEqual(
            yield* contributor.posts.unschedule({ params }).pipe(Effect.flip),
            forbiddenFor("missingPermission", "post:schedule")
          );

          const unscheduled = yield* editor.posts.unschedule({ params });

          assert.strictEqual(unscheduled.status, "draft");
          assert.isNull(unscheduled.schedule);

          assert.deepStrictEqual(
            yield* editor.posts.unschedule({ params }).pipe(Effect.flip),
            new PostStatusConflict({ status: "draft" })
          );

          const edited = yield* editor.posts.update({
            params,
            payload: { channelIds: [channelId], content: text("Later") },
          });

          assert.strictEqual(edited.content.text, "Later");

          const again = yield* editor.posts.reschedule({
            params,
            payload: { at: utc("2026-06-17T08:00:00Z"), timeZone: "UTC" },
          });

          assert.strictEqual(again.status, "scheduled");

          yield* editor.posts.cancel({ params });
        })
      ),
    timeout
  );
});

describe("the outcome endpoints", () => {
  it.effect(
    "list attempts, repost a failed channel and confirm an unconfirmed one",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* outcomes() {
          const workspaceId = yield* freshId;
          const editor = yield* clientAs(yield* freshId, workspaceId, "editor");
          const viewer = yield* clientAs(yield* freshId, workspaceId, "viewer");
          const refused = yield* connect(workspaceId, "mastodon");
          const lost = yield* connect(workspaceId, "bluesky");

          yield* FakePlatform.use((platform) =>
            Effect.all([
              platform.script(refused, [
                {
                  _tag: "fail",
                  failure: new BadRequest({ code: "duplicate" }),
                },
              ]),
              platform.script(lost, [{ _tag: "loseResponse" }]),
            ])
          );

          const draft = yield* editor.posts.create({
            params: { workspaceId },
            payload: { channelIds: [refused, lost], content: text("Live") },
          });

          const params = { postId: draft.id, workspaceId };

          yield* editor.posts.schedule({
            params,
            payload: {
              at: utc("2026-06-15T08:00:00Z"),
              channelIds: [refused, lost],
              timeZone: "UTC",
            },
          });

          const postId = PostIdSchema.make(draft.id);

          yield* eventually("the job sleeps", isSuspended(postId));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finishes", isFinished(postId));

          const sent = yield* viewer.posts.get({ params });
          const onRefused = sent.targets.find((t) => t.channelId === refused);
          const onLost = sent.targets.find((t) => t.channelId === lost);

          assert(onRefused !== undefined && onLost !== undefined);
          assert.strictEqual(sent.outcome, "unconfirmed");
          assert.strictEqual(onRefused.failureReason, "contentRejected");
          assert.strictEqual(onLost.status, "unconfirmed");
          assert.strictEqual(onLost.unconfirmedReason, "noResponse");

          const attempts = yield* viewer.posts.attempts({ params });

          assert.deepStrictEqual(
            attempts.map(({ attempt, result, retryAt, round, targetId }) => [
              targetId,
              round,
              attempt,
              result,
              retryAt,
            ]),
            [
              [onRefused.id, 1, 1, "contentRejected", null],
              [onLost.id, 1, 1, "unconfirmed", null],
            ].toSorted(([a], [b]) => String(a).localeCompare(String(b)))
          );

          assert.deepStrictEqual(
            yield* viewer.posts
              .repost({ params: { ...params, targetId: onRefused.id } })
              .pipe(Effect.flip),
            forbiddenFor("missingPermission", "post:schedule")
          );

          // An editor of another workspace finds nothing of the post there.
          const elsewhere = yield* freshId;
          const stranger = yield* clientAs(yield* freshId, elsewhere, "editor");
          const strangerParams = { postId: draft.id, workspaceId: elsewhere };

          assert.deepStrictEqual(
            yield* Effect.all([
              stranger.posts
                .attempts({ params: strangerParams })
                .pipe(Effect.flip),
              stranger.posts
                .repost({
                  params: { ...strangerParams, targetId: onRefused.id },
                })
                .pipe(Effect.flip),
              stranger.posts
                .confirm({
                  params: { ...strangerParams, targetId: onLost.id },
                  payload: { _tag: "notPublished" },
                })
                .pipe(Effect.flip),
            ]),
            [new PostNotFound(), new PostNotFound(), new PostNotFound()]
          );

          const reposted = yield* editor.posts.repost({
            params: { ...params, targetId: onRefused.id },
          });

          assert.strictEqual(reposted.status, "publishing");
          assert.deepStrictEqual(
            reposted.targets
              .filter(({ id }) => id === onRefused.id)
              .map(({ round, status }) => [round, status]),
            [[2, "pending"]]
          );

          yield* eventually("the repost finishes", isFinished(postId));

          const confirmed = yield* editor.posts.confirm({
            params: { ...params, targetId: onLost.id },
            payload: {
              _tag: "published",
              permalink: "https://bsky.example/profile/peal/post/1",
            },
          });

          assert.strictEqual(confirmed.outcome, "published");
          assert.deepStrictEqual(
            confirmed.targets
              .filter(({ id }) => id === onLost.id)
              .map(({ permalink, status }) => [status, permalink]),
            [["published", "https://bsky.example/profile/peal/post/1"]]
          );

          assert.deepStrictEqual(
            yield* editor.posts
              .confirm({
                params: { ...params, targetId: onLost.id },
                payload: { _tag: "notPublished" },
              })
              .pipe(Effect.flip),
            new TargetStatusConflict({ status: "published" })
          );

          assert.deepStrictEqual(
            yield* editor.posts
              .repost({ params: { ...params, targetId: "not-a-target" } })
              .pipe(Effect.flip),
            new PostNotFound()
          );

          const after = yield* viewer.posts.attempts({ params });

          assert.deepStrictEqual(
            after
              .filter(({ targetId }) => targetId === onRefused.id)
              .map(({ result, round }) => [round, result]),
            [
              [1, "contentRejected"],
              [2, "published"],
            ]
          );
        })
      ),
    timeout
  );
});

describe("the send endpoint", () => {
  it.effect(
    "creates and sends a post in one call, once per idempotency key",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* sends() {
          const workspaceId = yield* freshId;
          const editorId = yield* freshId;
          const editor = yield* clientAs(editorId, workspaceId, "editor");

          const contributor = yield* clientAs(
            yield* freshId,
            workspaceId,
            "contributor"
          );

          const channelId = yield* connect(workspaceId, "mastodon");
          const params = { workspaceId };
          const headers = { "idempotency-key": "synthetic-key-api" };

          const payload = {
            channelIds: [channelId],
            content: text("A synthetic post, sent in one call."),
            when: {
              _tag: "at",
              at: utc("2026-06-15T09:00:00Z"),
              timeZone: "Europe/Paris",
            },
          } as const;

          const sent = yield* editor.posts.send({ headers, params, payload });

          assert.strictEqual(sent.status, "scheduled");
          assert.strictEqual(sent.authorId, editorId);
          assert.strictEqual(sent.scheduledBy, editorId);
          assert.deepStrictEqual(sent.createdVia, sent.scheduledVia);

          // Sent again, written another way: the same request, the same post.
          const again = yield* editor.posts.send({
            headers,
            params,
            payload: {
              ...payload,
              when: {
                _tag: "at",
                at: utc("2026-06-15T09:00:00.000Z"),
                timeZone: "Europe/Paris",
              },
            },
          });

          assert.strictEqual(again.id, sent.id);

          const reused = yield* editor.posts
            .send({
              headers,
              params,
              payload: { ...payload, content: text("Something else.") },
            })
            .pipe(Effect.flip);

          assert.strictEqual(reused._tag, "IdempotencyKeyReused");

          // Every violation comes at once, and nothing is made.
          const refused = yield* editor.posts
            .send({
              headers: {},
              params,
              payload: {
                channelIds: [channelId],
                content: text("a".repeat(600)),
                when: { _tag: "now" },
              },
            })
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "PostContentInvalid");

          const zone = yield* editor.posts
            .send({
              headers: {},
              params,
              payload: {
                ...payload,
                when: { _tag: "now", timeZone: "+01:00" },
              },
            })
            .pipe(Effect.flip);

          assert.strictEqual(zone._tag, "InvalidTimeZone");

          const denied = yield* contributor.posts
            .send({ headers: {}, params, payload })
            .pipe(Effect.flip);

          assert.strictEqual(denied._tag, "Forbidden");

          // Nothing goes out from this test.
          const cancelled = yield* editor.posts.cancel({
            params: { ...params, postId: sent.id },
          });

          assert.strictEqual(cancelled.status, "cancelled");
        })
      ),
    timeout
  );
});
