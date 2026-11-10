import { assert, describe, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { SqlClient } from "effect/sql";

import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { SendPostRequest } from "#publishing/application/post-scheduling.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  callsOn,
  eventually,
  isFinished,
  isSuspended,
  setTime,
  storedPost,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import { actorIn, contentOf } from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Creating and scheduling a post in one call, now or at an instant, and
// the idempotency key that keeps a request sent again from making a second
// post.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const paris = TimeZoneIdSchema.make("Europe/Paris");

const freshWorkspace = newId(WorkspaceIdSchema);

const postsIn = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        count: number;
      }>`SELECT count(*)::int AS count FROM publishing.posts WHERE workspace_id = ${workspaceId}`
  ).pipe(Effect.map((rows) => rows[0]?.count ?? 0));

const request = (
  channel: ChannelId,
  text: string,
  { at, key }: { readonly at?: string; readonly key?: string } = {}
): SendPostRequest => ({
  at: Option.fromUndefinedOr(at).pipe(Option.map(utc)),
  channelIds: [channel],
  content: contentOf(text),
  // The request as its caller sent it, which the key is kept with.
  idempotency: Option.fromUndefinedOr(key).pipe(
    Option.map((value) => ({
      fingerprint: JSON.stringify({ at, channel, text }),
      key: value,
    }))
  ),
  timeZone: paris,
});

describe("PostScheduling.send", () => {
  it.effect(
    "publishes now, through the rules a scheduled post goes through",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* publishesNow() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");

          const sent = yield* scheduling.send(
            actorIn(workspaceId),
            request(channel, "A synthetic post, out now.")
          );

          assert.isFalse(sent.replayed);
          assert.strictEqual(sent.post.status._tag, "scheduled");

          if (sent.post.status._tag === "scheduled") {
            assert.deepStrictEqual(sent.post.status.schedule.at, utc(start));
            assert.strictEqual(sent.post.status.schedule.timeZone, paris);
          }

          // No clock to move: its time has come.
          yield* eventually("the post finished", isFinished(sent.post.id));
          assert.lengthOf(yield* callsOn(channel), 1);

          // Too long for the platform: refused, and nothing is made.
          const refused = yield* scheduling
            .send(actorIn(workspaceId), request(channel, "a".repeat(600)))
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "PostContentRejected");
          assert.strictEqual(yield* postsIn(workspaceId), 1);

          // Drafting is not publishing.
          const denied = yield* scheduling
            .send(
              actorIn(workspaceId, permissionsFor("contributor")),
              request(channel, "A synthetic post nobody may send.")
            )
            .pipe(Effect.flip);

          assert.strictEqual(denied._tag, "MissingPermission");
        })
      ),
    timeout
  );

  it.effect(
    "answers a request sent again with the post the first one made",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* replays() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const elsewhere = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const other = yield* connect(elsewhere, "mastodon");
          const actor = actorIn(workspaceId);

          const once = request(channel, "A synthetic post, sent once.", {
            at: "2026-06-15T08:00:00Z",
            key: "synthetic-key-1",
          });

          // Sent twice at once, as a client that lost patience does.
          const [first, second] = yield* Effect.all(
            [scheduling.send(actor, once), scheduling.send(actor, once)],
            { concurrency: 2 }
          );

          assert.strictEqual(first.post.id, second.post.id);
          // One made it, the other was answered it.
          assert.notStrictEqual(first.replayed, second.replayed);
          assert.strictEqual(yield* postsIn(workspaceId), 1);

          // The same key with another request is a mistake, not a retry.
          const reused = yield* scheduling
            .send(
              actor,
              request(channel, "Another synthetic post.", {
                at: "2026-06-15T08:00:00Z",
                key: "synthetic-key-1",
              })
            )
            .pipe(Effect.flip);

          assert.strictEqual(reused._tag, "IdempotencyKeyReused");
          assert.strictEqual(yield* postsIn(workspaceId), 1);

          // A key is its workspace's: the same one elsewhere is another.
          const theirs = yield* scheduling.send(
            actorIn(elsewhere),
            request(other, "A synthetic post, sent once.", {
              at: "2026-06-15T08:00:00Z",
              key: "synthetic-key-1",
            })
          );

          assert.isFalse(theirs.replayed);
          assert.notStrictEqual(theirs.post.id, first.post.id);

          // Once it went out, the request sent again still answers the
          // post, as it is now, rather than that its time has passed.
          yield* eventually("the job is parked", isSuspended(first.post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finished", isFinished(first.post.id));

          const later = yield* scheduling.send(actor, once);

          assert.isTrue(later.replayed);
          assert.strictEqual(later.post.id, first.post.id);
          assert.strictEqual(later.post.status._tag, "finished");
          assert.lengthOf(yield* callsOn(channel), 1);
        })
      ),
    timeout
  );

  it.effect(
    "forgets a key a day later, and when its retention runs",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* expires() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const actor = actorIn(workspaceId);

          const keyed = (at: string) =>
            request(channel, "A synthetic post, weekly.", {
              at,
              key: "synthetic-key-2",
            });

          const first = yield* scheduling.send(
            actor,
            keyed("2026-06-20T08:00:00Z")
          );

          // A day on, less a minute: still the first request's key.
          yield* setTime("2026-06-16T06:59:00Z");

          const reused = yield* scheduling
            .send(actor, keyed("2026-06-27T08:00:00Z"))
            .pipe(Effect.flip);

          assert.strictEqual(reused._tag, "IdempotencyKeyReused");

          // A day on: the key is free again, whether or not the retention
          // ran meanwhile.
          yield* setTime("2026-06-16T07:00:00Z");

          const second = yield* scheduling.send(
            actor,
            keyed("2026-06-27T08:00:00Z")
          );

          assert.isFalse(second.replayed);
          assert.notStrictEqual(second.post.id, first.post.id);

          yield* setTime("2026-06-17T07:00:00Z");
          assert.isAtLeast(yield* scheduling.forgetExpiredKeys, 1);

          const third = yield* scheduling.send(
            actor,
            keyed("2026-07-04T08:00:00Z")
          );

          assert.isFalse(third.replayed);
          assert.strictEqual(yield* postsIn(workspaceId), 3);

          // Nothing of the three goes out in this test.
          yield* Effect.forEach([first, second, third], ({ post }) =>
            scheduling.cancel(actor, post.id)
          );

          assert.strictEqual(
            (yield* storedPost(third.post.id)).post.status._tag,
            "cancelled"
          );
        })
      ),
    timeout
  );
});
