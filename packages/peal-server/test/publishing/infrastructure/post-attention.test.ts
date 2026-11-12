import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { PostAttention } from "#publishing/application/post-attention.ts";
import { DrizzlePostAttentionReads } from "#publishing/infrastructure/drizzle-post-attention-reads.ts";
import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// What needs attention in several workspaces at once, and their agenda, in
// Postgres. The rows are workspaces of the test's own, at instants no other
// suite uses (2053), and deleted after: none is left scheduled.

const AttentionTest = PostAttention.layer.pipe(
  Layer.provide(DrizzlePostAttentionReads),
  Layer.provideMerge(DatabaseTest)
);

const utc = (iso: string) => DateTime.makeUnsafe(iso);

// The instant the counts are read at.
const now = utc("2053-03-10T12:00:00.000Z");

interface Row {
  readonly channels?: readonly ChannelId[];
  readonly finishedAt?: string;
  readonly outcome?: string;
  readonly scheduledAt?: string;
  readonly status: string;
  readonly text?: string;
}

const instant = (iso: string | undefined) =>
  iso === undefined ? null : DateTime.toDateUtc(utc(iso));

const insert = Effect.fn("test.insert")(function* insert(
  workspaceId: WorkspaceId,
  row: Row
) {
  const sql = yield* SqlClient.SqlClient;
  const postId = yield* newId(PostIdSchema);

  yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text, scheduled_at, schedule_zone, finished_at, outcome) VALUES (${postId}, ${workspaceId}, ${row.status}, ${row.text ?? "A synthetic post"}, ${instant(row.scheduledAt)}, ${row.scheduledAt === undefined ? null : "Europe/Paris"}, ${instant(row.finishedAt)}, ${row.outcome ?? null})`;

  for (const channelId of row.channels ?? []) {
    const targetId = yield* newId(PostTargetIdSchema);

    yield* sql`INSERT INTO publishing.post_targets (id, post_id, channel_id, status) VALUES (${targetId}, ${postId}, ${channelId}, 'pending')`;
  }

  return postId;
});

const deleteAll = (workspaceIds: readonly WorkspaceId[]) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`DELETE FROM publishing.posts WHERE workspace_id IN ${sql.in(workspaceIds)}`
  ).pipe(Effect.orDie);

const finished = (outcome: string, finishedAt: string): Row => ({
  finishedAt,
  outcome,
  scheduledAt: "2053-03-01T09:00:00.000Z",
  status: "finished",
});

layer(AttentionTest)("posts needing attention across workspaces", (it) => {
  it.effect(
    "are counted per workspace, within 7 days on either side of now, and a workspace with none is left out",
    () =>
      Effect.gen(function* counted() {
        const first = yield* freshWorkspace;
        const second = yield* freshWorkspace;
        const empty = yield* freshWorkspace;

        const rows: readonly (readonly [WorkspaceId, Row])[] = [
          // Scheduled: now is included, 7 days from now is not.
          [
            first,
            { scheduledAt: "2053-03-10T12:00:00.000Z", status: "scheduled" },
          ],
          [
            first,
            { scheduledAt: "2053-03-17T11:59:59.999Z", status: "scheduled" },
          ],
          [
            first,
            { scheduledAt: "2053-03-17T12:00:00.000Z", status: "scheduled" },
          ],
          // Overdue, and not ahead: left to the job that publishes it.
          [
            first,
            { scheduledAt: "2053-03-10T11:59:59.999Z", status: "scheduled" },
          ],
          // Waiting for an approval, whatever its time.
          [
            first,
            {
              scheduledAt: "2053-03-01T09:00:00.000Z",
              status: "awaitingApproval",
            },
          ],
          [
            first,
            {
              scheduledAt: "2053-05-01T09:00:00.000Z",
              status: "awaitingApproval",
            },
          ],
          // Finished: 7 days ago is included, a moment before is not.
          [first, finished("failed", "2053-03-03T12:00:00.000Z")],
          [first, finished("partiallyPublished", "2053-03-09T08:00:00.000Z")],
          [first, finished("failed", "2053-03-03T11:59:59.999Z")],
          [first, finished("unconfirmed", "2053-03-08T08:00:00.000Z")],
          [first, finished("published", "2053-03-08T08:00:00.000Z")],
          [first, finished("cancelled", "2053-03-08T08:00:00.000Z")],
          // Not counted: a draft, a cancelled post, one publishing.
          [first, { status: "draft" }],
          [
            first,
            { scheduledAt: "2053-03-11T09:00:00.000Z", status: "cancelled" },
          ],
          [
            first,
            { scheduledAt: "2053-03-10T11:00:00.000Z", status: "publishing" },
          ],
          [
            second,
            { scheduledAt: "2053-03-12T09:00:00.000Z", status: "scheduled" },
          ],
          [second, finished("unconfirmed", "2053-03-10T11:00:00.000Z")],
          [second, finished("unconfirmed", "2053-03-10T12:00:00.000Z")],
        ];

        for (const [workspaceId, row] of rows) {
          yield* insert(workspaceId, row);
        }

        const counts = yield* PostAttention.use((attention) =>
          attention.countsIn([first, second, empty], now)
        ).pipe(Effect.ensuring(deleteAll([first, second])));

        assert.deepStrictEqual(counts.get(first), {
          awaitingApproval: 2,
          failedLast7Days: 2,
          scheduledNext7Days: 2,
          unconfirmedLast7Days: 1,
        });
        assert.deepStrictEqual(counts.get(second), {
          awaitingApproval: 0,
          failedLast7Days: 0,
          scheduledNext7Days: 1,
          unconfirmedLast7Days: 2,
        });
        assert.isFalse(counts.has(empty));
      })
  );

  it.effect(
    "are listed across workspaces by time then id, a page at a time, without repeating one",
    () =>
      Effect.gen(function* agenda() {
        const first = yield* freshWorkspace;
        const second = yield* freshWorkspace;
        const other = yield* freshWorkspace;
        const channel = yield* newId(ChannelIdSchema);
        const otherChannel = yield* newId(ChannelIdSchema);

        const ids: PostId[] = [];

        const add = (workspaceId: WorkspaceId, row: Row) =>
          insert(workspaceId, row).pipe(
            Effect.tap((postId) => Effect.sync(() => ids.push(postId)))
          );

        // Interleaved by time across the two workspaces, two at the same
        // instant, which their ids order.
        yield* add(first, {
          channels: [channel, otherChannel],
          scheduledAt: "2053-04-01T08:00:00.000Z",
          status: "scheduled",
          text: `${"Long line\nof text ".repeat(20)}end`,
        });
        yield* add(second, {
          scheduledAt: "2053-04-01T09:00:00.000Z",
          status: "awaitingApproval",
        });
        yield* add(first, {
          scheduledAt: "2053-04-01T09:00:00.000Z",
          status: "finished",
        });
        yield* add(second, {
          scheduledAt: "2053-04-02T09:00:00.000Z",
          status: "publishing",
        });
        // Left out: past the range, a draft, a cancelled post, and a
        // workspace not asked about.
        yield* insert(first, {
          scheduledAt: "2053-04-08T00:00:00.000Z",
          status: "scheduled",
        });
        yield* insert(first, { status: "draft" });
        yield* insert(first, {
          scheduledAt: "2053-04-03T09:00:00.000Z",
          status: "cancelled",
        });
        yield* insert(other, {
          scheduledAt: "2053-04-03T09:00:00.000Z",
          status: "scheduled",
        });

        const range = {
          from: utc("2053-04-01T00:00:00.000Z"),
          to: utc("2053-04-08T00:00:00.000Z"),
          workspaceIds: [first, second],
        };

        const pages = yield* Effect.gen(function* read() {
          const attention = yield* PostAttention;

          const one = yield* attention.agenda({
            ...range,
            after: Option.none(),
            limit: 3,
          });

          const last = one.at(-1);

          assert.isDefined(last);

          const two = yield* attention.agenda({
            ...range,
            after: Option.some({
              postId: last.postId,
              scheduledAt: last.scheduledAt,
            }),
            limit: 3,
          });

          return { one, two };
        }).pipe(Effect.ensuring(deleteAll([first, second, other])));

        // The two at nine o'clock are ordered by id, the earlier first.
        assert.deepStrictEqual(
          [...pages.one, ...pages.two].map(({ postId }) => postId),
          ids
        );

        const [opening] = pages.one;

        assert.isDefined(opening);
        assert.strictEqual(opening.workspaceId, first);
        assert.strictEqual(opening.timeZone, "Europe/Paris");
        assert.strictEqual(opening.status, "scheduled");
        assert.sameMembers([...opening.channelIds], [channel, otherChannel]);
        assert.isAtMost(opening.excerpt.length, 140);
        assert.notInclude(opening.excerpt, "\n");
        assert.deepStrictEqual(
          pages.two.map(({ status }) => status),
          ["publishing"]
        );
      })
  );
});
