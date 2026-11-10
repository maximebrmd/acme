import { DateTime, Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { ExpiredAnalytics } from "#analytics/application/expired-analytics.ts";
import type { RetentionCutoffs } from "#analytics/application/expired-analytics.ts";
import { DatabaseError } from "#shared/application/database-error.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const iso = (instant: DateTime.Utc) => DateTime.formatIso(instant);

/**
 * ExpiredAnalytics in Postgres. A post's platform is its channel's, which
 * the channels followed keep; deleting a post deletes its snapshots, which
 * reference it with ON DELETE CASCADE.
 */
export const SqlExpiredAnalytics = Layer.effect(
  ExpiredAnalytics,
  Effect.gen(function* SqlExpiredAnalytics() {
    const sql = yield* SqlClient.SqlClient;

    const purge = Effect.fn("ExpiredAnalytics.delete")(function* purge(
      cutoffs: RetentionCutoffs
    ) {
      const caps = JSON.stringify(
        cutoffs.byPlatform.map(({ before, platform }) => ({
          before: iso(before),
          platform,
        }))
      );

      const general = iso(cutoffs.before);

      const accountDays = yield* sql`
        DELETE FROM analytics.account_snapshots AS snapshot
        USING analytics.tracked_channels AS channel
        LEFT JOIN jsonb_to_recordset(${caps}::jsonb)
          AS cap(platform text, before timestamptz)
          ON cap.platform = channel.platform
        WHERE channel.channel_id = snapshot.channel_id
          AND snapshot.day < (coalesce(cap.before, ${general}::timestamptz) AT TIME ZONE 'UTC')::date
        RETURNING 1
      `;

      // Posts by when they went live: their counts are read for 30 days
      // after, so a post past its retention has no snapshot within it.
      const aged = yield* sql`
        DELETE FROM analytics.tracked_posts AS post
        USING analytics.tracked_posts AS same
        LEFT JOIN analytics.tracked_channels AS channel
          ON channel.channel_id = same.channel_id
        LEFT JOIN jsonb_to_recordset(${caps}::jsonb)
          AS cap(platform text, before timestamptz)
          ON cap.platform = channel.platform
        WHERE same.target_id = post.target_id
          AND post.published_at < coalesce(cap.before, ${general}::timestamptz)
        RETURNING 1
      `;

      // A channel that left its workspace: its posts go a month after,
      // then the channel's own row.
      const goneBefore = iso(cutoffs.disconnectedBefore);

      const gone = yield* sql`
        DELETE FROM analytics.tracked_posts AS post
        USING analytics.tracked_channels AS channel
        WHERE channel.channel_id = post.channel_id
          AND channel.gone_at < ${goneBefore}::timestamptz
        RETURNING 1
      `;

      yield* sql`
        DELETE FROM analytics.tracked_channels
        WHERE gone_at < ${goneBefore}::timestamptz
      `;

      const paidReads = yield* sql`
        DELETE FROM analytics.paid_reads
        WHERE day < (${iso(cutoffs.paidReadsBefore)}::timestamptz AT TIME ZONE 'UTC')::date
        RETURNING 1
      `;

      return {
        accountDays: accountDays.length,
        paidReads: paidReads.length,
        posts: aged.length + gone.length,
      };
    });

    return ExpiredAnalytics.of({
      delete: (cutoffs) => purge(cutoffs).pipe(Effect.mapError(failed)),
    });
  })
);
