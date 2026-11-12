import { and, asc, eq, gt, gte, inArray, lt, or, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

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

const at = (instant: DateTime.Utc) =>
  sql`${DateTime.formatIso(instant)}::timestamptz`;

// The outcomes that say a channel failed, as the posts' `outcome` filter
// names them: none went out, or some did and others failed.
const failedOutcomes = ["failed", "partiallyPublished"];

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

const counted = (condition: ReturnType<typeof sql>) =>
  sql<number>`(count(*) FILTER (WHERE ${condition}))::int`;

/**
 * The counts and the agenda across workspaces, in one query each, with
 * every workspace's id in one parameter (`anyUuid`), on the index of a
 * workspace's posts by time (`posts_workspace_scheduled_at`).
 */
export const DrizzlePostAttentionReads = Layer.effect(
  PostAttentionReads,
  Effect.gen(function* DrizzlePostAttentionReads() {
    const db = yield* Drizzle;

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
      countsIn: (
        workspaceIds,
        { finishedFrom, scheduledFrom, scheduledTo }
      ) => {
        const scheduledAhead = sql`${posts.status} = 'scheduled' AND ${posts.scheduledAt} >= ${at(scheduledFrom)} AND ${posts.scheduledAt} < ${at(scheduledTo)}`;

        const awaiting = sql`${posts.status} = 'awaitingApproval'`;

        const finishedSince = sql`${posts.status} = 'finished' AND ${posts.finishedAt} >= ${at(finishedFrom)}`;

        const failedSince = sql`${finishedSince} AND ${inArray(posts.outcome, failedOutcomes)}`;

        const unconfirmedSince = sql`${finishedSince} AND ${posts.outcome} = 'unconfirmed'`;

        return db
          .select({
            awaitingApproval: counted(awaiting),
            failedLast7Days: counted(failedSince),
            scheduledNext7Days: counted(scheduledAhead),
            unconfirmedLast7Days: counted(unconfirmedSince),
            workspaceId: posts.workspaceId,
          })
          .from(posts)
          .where(
            and(
              anyUuid(posts.workspaceId, workspaceIds),
              or(
                sql`(${scheduledAhead})`,
                sql`(${awaiting})`,
                sql`(${failedSince})`,
                sql`(${unconfirmedSince})`
              )
            )
          )
          .groupBy(posts.workspaceId)
          .pipe(
            Effect.mapError(failed),
            Effect.map(
              (rows) =>
                new Map(
                  rows.map(
                    ({
                      workspaceId,
                      ...counts
                    }): readonly [WorkspaceId, AttentionCounts] => [
                      WorkspaceIdSchema.make(workspaceId),
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
