import { assert, describe, expect, it } from "@effect/vitest";
import { Duration, Effect, Fiber, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { TestClock } from "effect/testing";
import {
  Api,
  LivePostNotChangeable,
  PostContentInvalid,
  PostNotFound,
} from "peal-contract";
import type { Member, Permission } from "peal-contract";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { livePostChangePermission } from "#publishing/domain/live-post-change.ts";
import { refused as forbiddenFor } from "#shared/api/forbidden.ts";
import { newId } from "#shared/application/ids.ts";
import { PostIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { FakeRemovals } from "#test/publishing/fakes/fake-live-post-clients.ts";
import {
  eventually,
  isFinished,
} from "#test/publishing/infrastructure/harness.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import { securityTest } from "#workspace/api/security.ts";
import { withheldWhileImpersonating } from "#workspace/domain/membership.ts";
import { publishingPermissions } from "#workspace/domain/oauth-grant.ts";
import { partnerKeyPermissions } from "#workspace/domain/partner-key.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";
import type { Role } from "#workspace/domain/roles.ts";

// The endpoints that unpublish a live post, on the in-memory cluster: a
// fake platform publishes, another deletes.

const timeout = 60_000;

const start = "2026-07-01T08:00:00Z";

const freshId = newId(WorkspaceIdSchema);

const clientWith = (
  userId: string,
  workspaceId: WorkspaceId,
  permissions: readonly Permission[]
) => {
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

const clientAs = (userId: string, workspaceId: WorkspaceId, role: Role) =>
  clientWith(userId, workspaceId, permissionsFor(role));

// A post sent now on `channels`, once it went out.
const sentOn = Effect.fn("test.sentOn")(function* sentOn(
  client: Effect.Success<ReturnType<typeof clientAs>>,
  workspaceId: WorkspaceId,
  channelIds: readonly string[],
  text: string
) {
  const post = yield* client.posts.send({
    headers: {},
    params: { workspaceId },
    payload: {
      channelIds: [...channelIds],
      content: { media: [], overrides: [], text },
      when: { _tag: "now" },
    },
    query: {},
  });

  yield* eventually(
    "the post went out",
    isFinished(PostIdSchema.make(post.id))
  );

  return yield* client.posts.get({ params: { postId: post.id, workspaceId } });
});

describe("who may unpublish", () => {
  it("is who may publish: owners, admins and editors", () => {
    expect(livePostChangePermission).toBe("post:publish");
    expect(
      (["owner", "admin", "editor", "contributor", "viewer"] as const).filter(
        (role) => permissionsFor(role).includes(livePostChangePermission)
      )
    ).toStrictEqual(["owner", "admin", "editor"]);
  });

  it("takes workspace:publish of an OAuth client, and is withheld while staff act as a member", () => {
    expect(publishingPermissions.has(livePostChangePermission)).toBeTruthy();
    expect(
      withheldWhileImpersonating.has(livePostChangePermission)
    ).toBeTruthy();
    // A partner's key may be given it.
    expect(partnerKeyPermissions).toContain(livePostChangePermission);
  });
});

describe("the unpublishing endpoints", () => {
  it.effect(
    "unpublish a channel, list the changes, and show the target removed",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* unpublishes() {
          const workspaceId = yield* freshId;
          const editor = yield* clientAs(yield* freshId, workspaceId, "editor");
          const viewer = yield* clientAs(yield* freshId, workspaceId, "viewer");

          const contributor = yield* clientAs(
            yield* freshId,
            workspaceId,
            "contributor"
          );

          const mastodon = yield* connect(workspaceId, "mastodon");
          const sent = yield* sentOn(editor, workspaceId, [mastodon], "Live");
          const [target] = sent.targets;

          assert(target !== undefined);
          assert.strictEqual(target.removedAt, null);

          const params = { postId: sent.id, targetId: target.id, workspaceId };

          assert.deepStrictEqual(
            yield* Effect.all([
              viewer.posts
                .unpublishTarget({ params, query: {} })
                .pipe(Effect.flip),
              contributor.posts
                .unpublishTarget({ params, query: {} })
                .pipe(Effect.flip),
              contributor.posts
                .unpublish({ params: { postId: sent.id, workspaceId } })
                .pipe(Effect.flip),
            ]),
            [
              forbiddenFor("missingPermission", "post:publish"),
              forbiddenFor("missingPermission", "post:publish"),
              forbiddenFor("missingPermission", "post:publish"),
            ]
          );

          // Another workspace finds nothing of it.
          const stranger = yield* clientAs(
            yield* freshId,
            yield* freshId,
            "editor"
          );

          assert.deepStrictEqual(
            yield* stranger.posts
              .unpublishTarget({
                params: { ...params, workspaceId: yield* freshId },
                query: {},
              })
              .pipe(Effect.flip),
            new PostNotFound()
          );

          const change = yield* editor.posts.unpublishTarget({
            params,
            query: {},
          });

          assert.strictEqual(change.kind, "unpublish");
          assert.strictEqual(change.targetId, target.id);
          assert.strictEqual(change.partsLeft, 1);

          yield* eventually(
            "the change is done",
            viewer.posts
              .changes({ params: { postId: sent.id, workspaceId } })
              .pipe(
                Effect.map(({ items }) =>
                  items.some(({ status }) => status === "done")
                )
              )
          );

          const { items } = yield* viewer.posts.changes({
            params: { postId: sent.id, workspaceId },
          });

          assert.deepStrictEqual(
            items.map(({ code, id, partsLeft, status }) => [
              id,
              status,
              partsLeft,
              code,
            ]),
            [[change.id, "done", 0, null]]
          );

          const after = yield* viewer.posts.get({
            params: { postId: sent.id, workspaceId },
          });

          assert.strictEqual(after.targets[0]?.status, "published");
          assert.isNotNull(after.targets[0]?.removedAt ?? null);
          assert.strictEqual(after.targets[0]?.permalink, target.permalink);

          assert.deepStrictEqual(
            yield* editor.posts
              .unpublishTarget({ params, query: {} })
              .pipe(Effect.flip),
            new LivePostNotChangeable({ reason: "alreadyRemoved" })
          );

          // Found among the removed posts, and not among the others.
          const removed = yield* viewer.posts.search({
            params: { workspaceId },
            query: { removed: "true" },
          });

          const kept = yield* viewer.posts.search({
            params: { workspaceId },
            query: { removed: "false" },
          });

          assert.deepStrictEqual(
            removed.items.map(({ id }) => id),
            [sent.id]
          );
          assert.deepStrictEqual(kept.items, []);
        })
      ),
    timeout
  );

  it.effect(
    "unpublish a whole post channel by channel, and wait for a change",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* whole() {
          const workspaceId = yield* freshId;
          const editor = yield* clientAs(yield* freshId, workspaceId, "editor");
          const mastodon = yield* connect(workspaceId, "mastodon");
          const threads = yield* connect(workspaceId, "threads");

          const sent = yield* sentOn(
            editor,
            workspaceId,
            [mastodon, threads],
            "On two channels"
          );

          const onMastodon = sent.targets.find(
            ({ channelId }) => channelId === mastodon
          );

          const onThreads = sent.targets.find(
            ({ channelId }) => channelId === threads
          );

          assert(onMastodon !== undefined && onThreads !== undefined);

          // The deletion answers only when the test lets it.
          yield* FakeRemovals.use((removals) =>
            removals.script(mastodon, [{ _tag: "hang" }])
          );

          const asked = yield* editor.posts.unpublish({
            params: { postId: sent.id, workspaceId },
          });

          assert.deepStrictEqual(
            asked.changes.map(({ status, targetId }) => [targetId, status]),
            [[onMastodon.id, "pending"]]
          );
          assert.deepStrictEqual(asked.refused, [
            { reason: "notSupported", targetId: onThreads.id },
          ]);

          // Asked again while it is pending, with a wait: refused at once.
          assert.deepStrictEqual(
            yield* editor.posts
              .unpublishTarget({
                params: {
                  postId: sent.id,
                  targetId: onMastodon.id,
                  workspaceId,
                },
                query: { wait: 30 },
              })
              .pipe(Effect.flip),
            new LivePostNotChangeable({ reason: "changeInProgress" })
          );

          yield* FakeRemovals.use((removals) => removals.release(mastodon));

          // A wait on a change already done answers it as it is.
          yield* eventually(
            "the change is done",
            editor.posts
              .changes({ params: { postId: sent.id, workspaceId } })
              .pipe(
                Effect.map(({ items }) =>
                  items.every(({ status }) => status === "done")
                )
              )
          );
        })
      ),
    timeout
  );

  it.effect("answer a change once it ended, within the wait", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* waits() {
        const workspaceId = yield* freshId;
        const editor = yield* clientAs(yield* freshId, workspaceId, "editor");
        const mastodon = yield* connect(workspaceId, "mastodon");
        const sent = yield* sentOn(editor, workspaceId, [mastodon], "Waited");
        const [target] = sent.targets;

        assert(target !== undefined);

        const waiting = yield* editor.posts
          .unpublishTarget({
            params: { postId: sent.id, targetId: target.id, workspaceId },
            query: { wait: 30 },
          })
          .pipe(Effect.forkChild);

        for (
          let round = 0;
          round < 100 && waiting.pollUnsafe() === undefined;
          round += 1
        ) {
          yield* TestClock.adjust(Duration.millis(500));
          yield* TestClock.withLive(Effect.sleep(Duration.millis(20)));
        }

        const change = yield* Fiber.join(waiting);

        assert.strictEqual(change.status, "done");
        assert.strictEqual(change.partsLeft, 0);
      })
    )
  );
});

describe("the editing endpoint", () => {
  it.effect(
    "edits a channel's text, refuses who may not and what does not fit, and shows the target edited",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* edits() {
          const workspaceId = yield* freshId;
          const editor = yield* clientAs(yield* freshId, workspaceId, "editor");
          const viewer = yield* clientAs(yield* freshId, workspaceId, "viewer");

          const contributor = yield* clientAs(
            yield* freshId,
            workspaceId,
            "contributor"
          );

          const mastodon = yield* connect(workspaceId, "mastodon");
          const other = yield* connect(workspaceId, "mastodon");
          const bluesky = yield* connect(workspaceId, "bluesky");

          const sent = yield* sentOn(
            editor,
            workspaceId,
            [mastodon, other, bluesky],
            "Live with a typo"
          );

          const on = (channelId: string) => {
            const found = sent.targets.find(
              (target) => target.channelId === channelId
            );

            assert(found !== undefined);

            return {
              postId: sent.id,
              targetId: found.id,
              workspaceId,
            };
          };

          assert.strictEqual(sent.targets[0]?.editedAt, null);

          const fix = { text: "Live, corrected" };

          assert.deepStrictEqual(
            yield* Effect.all([
              viewer.posts
                .editTarget({ params: on(mastodon), payload: fix, query: {} })
                .pipe(Effect.flip),
              contributor.posts
                .editTarget({ params: on(mastodon), payload: fix, query: {} })
                .pipe(Effect.flip),
            ]),
            [
              forbiddenFor("missingPermission", "post:publish"),
              forbiddenFor("missingPermission", "post:publish"),
            ]
          );

          assert.deepStrictEqual(
            yield* editor.posts
              .editTarget({ params: on(bluesky), payload: fix, query: {} })
              .pipe(Effect.flip),
            new LivePostNotChangeable({ reason: "notSupported" })
          );

          const tooLong = yield* editor.posts
            .editTarget({
              params: on(mastodon),
              payload: { text: "x".repeat(501) },
              query: {},
            })
            .pipe(Effect.flip);

          assert.isTrue(
            tooLong instanceof PostContentInvalid &&
              tooLong.violations.map(({ _tag }) => _tag).join(",") ===
                "textTooLong"
          );

          const change = yield* editor.posts.editTarget({
            params: on(mastodon),
            payload: { part: 0, text: "Live, corrected" },
            query: {},
          });

          assert.strictEqual(change.kind, "edit");
          assert.strictEqual(change.partsLeft, 1);
          assert.notProperty(change, "text");

          yield* eventually(
            "the edit is done",
            viewer.posts
              .changes({ params: { postId: sent.id, workspaceId } })
              .pipe(
                Effect.map(({ items }) =>
                  items.some(({ status }) => status === "done")
                )
              )
          );

          const after = yield* viewer.posts.get({
            params: { postId: sent.id, workspaceId },
          });

          const edited = after.targets.find(
            ({ channelId }) => channelId === mastodon
          );

          assert.isNotNull(edited?.editedAt ?? null);
          assert.strictEqual(edited?.status, "published");
          assert.strictEqual(
            after.targets.find(({ channelId }) => channelId === other)
              ?.editedAt,
            null
          );
          assert.deepStrictEqual(after.content.overrides, [
            { channelId: mastodon, text: "Live, corrected" },
          ]);
          assert.strictEqual(after.content.text, "Live with a typo");
        })
      ),
    timeout
  );
});
