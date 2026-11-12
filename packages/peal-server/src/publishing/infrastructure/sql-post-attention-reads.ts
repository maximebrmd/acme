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

// Before every post at an instant: what no cursor's id is less than.
const noPost = "00000000-0000-0000-0000-000000000000";

// Every workspace's id in one text parameter, split in the database, as
// `anyUuid` writes it: a statement takes 65,535 parameters at most.
const idsOf = (workspaceIds: readonly WorkspaceId[]) => workspaceIds.join(",");

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
 * The counts and the agenda across workspaces, in Postgres, one statement
 * each, every workspace's id in one parameter, each part on an index that
 * bounds what it reads.
 */
export const SqlPostAttentionReads = Layer.effect(
  PostAttentionReads,
  Effect.gen(function* SqlPostAttentionReads() {
    const client = yield* SqlClient.SqlClient;

    return PostAttentionReads.of({
      // A keyset per workspace, on the index of its posts by time
      // (`posts_workspace_scheduled_at`): each reads from the cursor on, a
      // page at most, so a page reads at most a page a workspace whatever
      // the range holds; then the page's rows alone get their text and
      // channels.
      agenda: ({ after, from, limit, to, workspaceIds }) => {
        const position = Option.getOrElse(after, () => ({
          postId: noPost,
          scheduledAt: from,
        }));

        const since = DateTime.toDateUtc(position.scheduledAt);

        return client`
          SELECT
            p.id AS "postId",
            p.workspace_id AS "workspaceId",
            p.scheduled_at AS "scheduledAt",
            p.schedule_zone AS "timeZone",
            p.status,
            left(p.text, ${textRead}) AS "textStart",
            array_to_string(ARRAY(
              SELECT t.channel_id FROM publishing.post_targets t
              WHERE t.post_id = p.id ORDER BY t.channel_id
            ), ',') AS "channelIds"
          FROM (
            SELECT q.id, q.scheduled_at
            FROM unnest(string_to_array(${idsOf(workspaceIds)}, ',')::uuid[]) AS w(id)
            CROSS JOIN LATERAL (
              SELECT id, scheduled_at FROM publishing.posts
              WHERE workspace_id = w.id
                AND status IN ('awaitingApproval', 'scheduled', 'publishing', 'finished')
                AND scheduled_at >= ${since}
                AND scheduled_at < ${DateTime.toDateUtc(to)}
                AND (scheduled_at > ${since} OR id > ${position.postId}::uuid)
              ORDER BY scheduled_at, id
              LIMIT ${limit}
            ) AS q
            ORDER BY q.scheduled_at, q.id
            LIMIT ${limit}
          ) AS page
          JOIN publishing.posts p ON p.id = page.id
          ORDER BY p.scheduled_at, p.id
        `.pipe(
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
        );
      },
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
