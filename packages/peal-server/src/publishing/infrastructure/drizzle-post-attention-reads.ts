import { and, asc, eq, gt, gte, inArray, lt, or, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { PostAttentionReads } from "#publishing/application/post-attention-reads.ts";
import type { AttentionCounts } from "#publishing/application/post-attention-reads.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { anyUuid } from "#shared/infrastructure/any-uuid.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { posts, postTargets } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

// The outcomes that say a channel failed, as the posts' `outcome` filter
// names them: none went out, or some did and others failed.
const decodeCounts = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      awaitingApproval: Schema.Int,
      failedLast7Days: Schema.Int,
      scheduledNext7Days: Schema.Int,
      unconfirmedLast7Days: Schema.Int,
      workspaceId: WorkspaceIdSchema,
    })
  )
);

// Every workspace's id in one text parameter, split in the database, as
// `anyUuid` writes it for Drizzle.
const idsOf = (workspaceIds: readonly WorkspaceId[]) => workspaceIds.join(",");

// The statuses of a post with a time that goes out, or went out.
const agendaStatuses = [
  "awaitingApproval",
  "scheduled",
  "publishing",
  "finished",
];

// How much of a post's text the query reads: enough for the excerpt the
// domain cuts, which counts characters as a reader does, never the whole
// of a long text.
const textRead = 600;

const AgendaRowSchema = Schema.Struct({
  channelIds: Schema.String,
  postId: PostIdSchema,
  scheduledAt: Schema.DateTimeUtcFromDate,
  status: Schema.Literals([
    "awaitingApproval",
    "scheduled",
    "publishing",
    "finished",
  ]),
  textStart: Schema.String,
  timeZone: Schema.String,
  workspaceId: WorkspaceIdSchema,
});

const decodeAgendaRows = Schema.decodeUnknownEffect(
  Schema.Array(AgendaRowSchema)
);

const decodeChannelIds = Schema.decodeUnknownEffect(
  Schema.Array(ChannelIdSchema)
);

/**
 * The counts and the agenda across workspaces, in one query each, with
 * every workspace's id in one parameter (`anyUuid`), on the index of a
 * workspace's posts by time (`posts_workspace_scheduled_at`).
 */
export const DrizzlePostAttentionReads = Layer.effect(
  PostAttentionReads,
  Effect.gen(function* DrizzlePostAttentionReads() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return PostAttentionReads.of({
      agenda: ({ after, from, limit, to, workspaceIds }) =>
        db
          .select({
            channelIds: sql<string>`array_to_string(ARRAY(SELECT ${postTargets.channelId} FROM ${postTargets} WHERE ${postTargets.postId} = ${posts.id} ORDER BY ${postTargets.channelId}), ',')`,
            postId: posts.id,
            scheduledAt: posts.scheduledAt,
            status: posts.status,
            textStart: sql<string>`left(${posts.text}, ${textRead})`,
            timeZone: posts.scheduleZone,
            workspaceId: posts.workspaceId,
          })
          .from(posts)
          .where(
            and(
              anyUuid(posts.workspaceId, workspaceIds),
              inArray(posts.status, agendaStatuses),
              gte(posts.scheduledAt, DateTime.toDateUtc(from)),
              lt(posts.scheduledAt, DateTime.toDateUtc(to)),
              ...Option.toArray(
                after.pipe(
                  Option.map(({ postId, scheduledAt }) =>
                    or(
                      gt(posts.scheduledAt, DateTime.toDateUtc(scheduledAt)),
                      and(
                        eq(posts.scheduledAt, DateTime.toDateUtc(scheduledAt)),
                        gt(posts.id, postId)
                      )
                    )
                  )
                )
              )
            )
          )
          .orderBy(asc(posts.scheduledAt), asc(posts.id))
          .limit(limit)
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap((rows) => decodeAgendaRows(rows).pipe(Effect.orDie)),
            Effect.flatMap(
              Effect.forEach(({ channelIds, ...row }) =>
                decodeChannelIds(
                  channelIds === "" ? [] : channelIds.split(",")
                ).pipe(
                  Effect.orDie,
                  Effect.map((ids) => ({ ...row, channelIds: ids }))
                )
              )
            ),
            Effect.withSpan("PostAttentionReads.agenda")
          ),
      // One read an index serves for each thing counted, put together:
      // the posts going out by their time (`posts_workspace_scheduled_at`),
      // those waiting for an approval (`posts_workspace_awaiting_approval`)
      // and those that ended failed or to check by when they ended
      // (`posts_workspace_finished_attention`), so the cost follows what
      // is counted, never how many posts a workspace keeps.
      countsIn: (
        workspaceIds,
        { finishedFrom, scheduledFrom, scheduledTo }
      ) => {
        const ids = idsOf(workspaceIds);

        return client`
          SELECT
            workspace_id AS "workspaceId",
            (count(*) FILTER (WHERE kind = 'scheduled'))::int AS "scheduledNext7Days",
            (count(*) FILTER (WHERE kind = 'awaiting'))::int AS "awaitingApproval",
            (count(*) FILTER (WHERE kind = 'finished' AND outcome IN ('failed', 'partiallyPublished')))::int AS "failedLast7Days",
            (count(*) FILTER (WHERE kind = 'finished' AND outcome = 'unconfirmed'))::int AS "unconfirmedLast7Days"
          FROM (
            SELECT workspace_id, 'scheduled' AS kind, NULL::text AS outcome
            FROM publishing.posts
            WHERE workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])
              AND status = 'scheduled'
              AND scheduled_at >= ${DateTime.toDateUtc(scheduledFrom)}
              AND scheduled_at < ${DateTime.toDateUtc(scheduledTo)}
            UNION ALL
            SELECT workspace_id, 'awaiting', NULL
            FROM publishing.posts
            WHERE workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])
              AND status = 'awaitingApproval'
            UNION ALL
            SELECT workspace_id, 'finished', outcome
            FROM publishing.posts
            WHERE workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])
              AND status = 'finished'
              AND outcome IN ('failed', 'partiallyPublished', 'unconfirmed')
              AND finished_at >= ${DateTime.toDateUtc(finishedFrom)}
          ) AS attention
          GROUP BY workspace_id
        `.pipe(
          Effect.mapError(failed),
          Effect.flatMap((rows) => decodeCounts(rows).pipe(Effect.orDie)),
          Effect.map(
            (rows) =>
              new Map(
                rows.map(
                  ({
                    workspaceId,
                    ...counts
                  }): readonly [WorkspaceId, AttentionCounts] => [
                    workspaceId,
                    counts,
                  ]
                )
              )
          ),
          Effect.withSpan("PostAttentionReads.countsIn")
        );
      },
    });
  })
);
