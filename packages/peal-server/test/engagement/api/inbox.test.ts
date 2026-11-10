import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import {
  Api,
  Forbidden,
  InboxActionUnavailable,
  InboxCommentNotFound,
  InboxThreadNotFound,
  ReplyInvalid,
  ReplyPending,
  ReplyStatusConflict,
} from "peal-contract";

import { SendReply } from "#engagement/application/send-reply.ts";
import { InboxApiLive } from "#engagement/container.ts";
import type { Permission } from "#shared/domain/access.ts";
import { memberOf } from "#test/channels/support.ts";
import { makeWorld } from "#test/engagement/fakes/world.ts";
import type { World } from "#test/engagement/fakes/world.ts";
import {
  channelId,
  comment,
  commentId,
  publishedAt,
  thread,
  workspaceId,
} from "#test/engagement/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The inbox endpoints on their real use cases, over the in-memory world.
// Each request acts as a member, as the WorkspaceAccess middleware would.

const clientAs = (world: World, permissions: readonly Permission[]) =>
  HttpApiTest.groups(Api, ["inbox"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        InboxApiLive.pipe(
          Layer.provideMerge(securityTest(memberOf(workspaceId, permissions))),
          Layer.provide(world.layer)
        ),
        HttpServer.layerServices
      )
    )
  );

const worldWithComments = (): World => {
  const world = makeWorld();
  const post = thread(50);

  world.state.threads.set(post.id, post);
  world.state.channels.set(channelId(1), {
    platform: "mastodon",
    scopes: ["read:statuses", "write:statuses"],
  });

  for (const n of [101, 102]) {
    const kept = comment(n, {}, post);

    world.state.comments.set(kept.id, kept);
  }

  return world;
};

const params = { workspaceId };

const editor = permissionsFor("editor");

describe("the inbox endpoints", () => {
  it.effect("list the threads with comments, and show one whole", () => {
    const world = worldWithComments();

    return Effect.gen(function* reads() {
      const client = yield* clientAs(world, permissionsFor("viewer"));
      const page = yield* client.inbox.listThreads({ params, query: {} });

      assert.deepStrictEqual(
        page.items.map(({ comments, id, unanswered }) => ({
          comments,
          id,
          unanswered,
        })),
        [{ comments: 2, id: thread(50).id, unanswered: 2 }]
      );
      assert.isNull(page.nextCursor);

      const detail = yield* client.inbox.getThread({
        params: { ...params, threadId: thread(50).id },
      });

      assert.strictEqual(detail.platform, "mastodon");
      assert.deepStrictEqual(detail.abilities, {
        delete: "unsupported",
        hide: "unsupported",
        like: "reconnect",
        read: "available",
        reply: "available",
        withdraw: "available",
      });
      assert.deepStrictEqual(
        detail.comments.map(({ author, state, text }) => ({
          handle: author?.handle,
          state,
          text,
        })),
        [
          {
            handle: "reader101@social.example",
            state: "new",
            text: "Comment 101",
          },
          {
            handle: "reader102@social.example",
            state: "new",
            text: "Comment 102",
          },
        ]
      );
    });
  });

  it.effect(
    "answer a comment with a reply on its way, and show how it ended",
    () => {
      const world = worldWithComments();

      return Effect.gen(function* replies() {
        const client = yield* clientAs(world, editor);

        const reply = yield* client.inbox.reply({
          params: { ...params, commentId: commentId(101) },
          payload: { text: "Thank you!" },
        });

        assert.strictEqual(reply.status, "sending");
        assert.isNull(reply.settledAt);
        assert.strictEqual(reply.text, "@reader101@social.example Thank you!");

        const again = yield* client.inbox
          .reply({
            params: { ...params, commentId: commentId(101) },
            payload: { text: "Thank you!" },
          })
          .pipe(Effect.flip);

        assert.instanceOf(again, ReplyPending);
        assert.strictEqual(again.replyId, reply.id);

        // The job runs.
        const [job] = world.state.jobs;

        assert.isDefined(job);

        yield* SendReply.use((send) => send.run(job)).pipe(
          Effect.provide(world.layer)
        );

        const detail = yield* client.inbox.getThread({
          params: { ...params, threadId: thread(50).id },
        });

        assert.deepStrictEqual(
          detail.replies.map(({ permalink, reason, status }) => ({
            permalink,
            reason,
            status,
          })),
          [
            {
              permalink: "https://social.example/@studio/3001",
              reason: null,
              status: "sent",
            },
          ]
        );
        assert.strictEqual(detail.comments[0]?.state, "answered");
        assert.strictEqual(detail.thread.unanswered, 1);

        const confirmed = yield* client.inbox
          .confirmReply({
            params: { ...params, replyId: reply.id },
            payload: { sent: true },
          })
          .pipe(Effect.flip);

        assert.instanceOf(confirmed, ReplyStatusConflict);
        assert.strictEqual(confirmed.status, "sent");

        const withdrawn = yield* client.inbox.withdrawReply({
          params: { ...params, replyId: reply.id },
        });

        assert.strictEqual(withdrawn.status, "withdrawn");
      });
    }
  );

  it.effect(
    "refuse what a reader may not do, and what a platform does not offer",
    () => {
      const world = worldWithComments();

      return Effect.gen(function* refuses() {
        const viewer = yield* clientAs(world, permissionsFor("viewer"));
        const member = yield* clientAs(world, editor);
        const comment101 = { ...params, commentId: commentId(101) };

        const forbidden = yield* viewer.inbox
          .reply({ params: comment101, payload: { text: "Hello" } })
          .pipe(Effect.flip);

        assert.instanceOf(forbidden, Forbidden);

        const hidden = yield* member.inbox
          .moderate({ params: comment101, payload: { action: "hide" } })
          .pipe(Effect.flip);

        assert.instanceOf(hidden, InboxActionUnavailable);
        assert.deepStrictEqual(
          [hidden.ability, hidden.standing],
          ["hide", "unsupported"]
        );

        const long = yield* member.inbox
          .reply({ params: comment101, payload: { text: "a".repeat(490) } })
          .pipe(Effect.flip);

        assert.instanceOf(long, ReplyInvalid);
        assert.deepStrictEqual(
          [long.reason, long.maximum, long.unit],
          ["tooLong", 500, "characters"]
        );

        const blank = yield* member.inbox
          .reply({ params: comment101, payload: { text: "   " } })
          .pipe(Effect.flip);

        assert.instanceOf(blank, ReplyInvalid);
        assert.strictEqual(blank.reason, "empty");
        assert.lengthOf(world.state.jobs, 0);
      });
    }
  );

  it.effect("find nothing under an id that is not theirs, or not an id", () => {
    const world = worldWithComments();

    return Effect.gen(function* misses() {
      const client = yield* clientAs(world, editor);

      const noThread = yield* client.inbox
        .getThread({ params: { ...params, threadId: "not-an-id" } })
        .pipe(Effect.flip);

      const noComment = yield* client.inbox
        .setAnswered({
          params: { ...params, commentId: commentId(999) },
          payload: { answered: true },
        })
        .pipe(Effect.flip);

      assert.instanceOf(noThread, InboxThreadNotFound);
      assert.instanceOf(noComment, InboxCommentNotFound);
    });
  });

  it.effect(
    "mark a comment answered without a reply, and page by cursor",
    () => {
      const world = worldWithComments();
      const other = thread(51);

      world.state.threads.set(other.id, other);

      const later = comment(
        201,
        { writtenAt: DateTime.addDuration(publishedAt, "2 hours") },
        other
      );

      world.state.comments.set(later.id, later);

      return Effect.gen(function* marks() {
        const client = yield* clientAs(world, editor);

        const first = yield* client.inbox.listThreads({
          params,
          query: { limit: 1 },
        });

        assert.deepStrictEqual(
          first.items.map(({ id }) => id),
          [other.id]
        );
        assert.isNotNull(first.nextCursor);

        const second = yield* client.inbox.listThreads({
          params,
          query: { cursor: first.nextCursor ?? "", limit: 1 },
        });

        assert.deepStrictEqual(
          second.items.map(({ id }) => id),
          [thread(50).id]
        );

        const answered = yield* client.inbox.setAnswered({
          params: { ...params, commentId: later.id },
          payload: { answered: true },
        });

        assert.strictEqual(answered.state, "answered");

        const waiting = yield* client.inbox.listThreads({
          params,
          query: { unanswered: "true" },
        });

        assert.deepStrictEqual(
          waiting.items.map(({ id }) => id),
          [thread(50).id]
        );
      });
    }
  );
});
