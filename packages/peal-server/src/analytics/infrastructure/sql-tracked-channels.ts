import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { TrackedChannels } from "#analytics/application/tracked-channels.ts";
import type { AccountRead } from "#analytics/application/tracked-channels.ts";
import { utcDayOf } from "#analytics/domain/account-metrics.ts";
import { TrackedChannel } from "#analytics/domain/tracked-channel.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";

import { holdTrackingLock } from "./tracking-lock.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

// Rows are decoded with the domain's schema, so one it could not have
// written fails loudly.
const decodeChannels = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      channelId: ChannelIdSchema,
      lastCollectedAt: Schema.OptionFromNullOr(Schema.DateTimeUtcFromDate),
      nextCollectionAt: Schema.DateTimeUtcFromDate,
      platform: PlatformSchema,
      workspaceId: WorkspaceIdSchema,
    })
  )
);

const decodeCount = Schema.decodeUnknownEffect(
  Schema.Array(Schema.Struct({ count: Schema.Int }))
);

const iso = (instant: DateTime.Utc) => DateTime.formatIso(instant);

// The channels as one JSON document, which Postgres reads as rows: one
// statement and one parameter, however many channels.
const channelsOf = (channels: readonly TrackedChannel[]) =>
  JSON.stringify(
    channels.map((channel) => ({
      channel_id: channel.channelId,
      last_collected_at: channel.lastCollectedAt.pipe(
        Option.map(iso),
        Option.getOrNull
      ),
      next_collection_at: iso(channel.nextCollectionAt),
      platform: channel.platform,
      workspace_id: channel.workspaceId,
    }))
  );

interface DayRow {
  readonly channel_id: ChannelId;
  readonly collected_at: string;
  readonly day: string;
  readonly followers: number | null;
  readonly following: number | null;
  readonly posts: number | null;
  readonly reach: number | null;
  readonly views: number | null;
}

// One row a channel and a day: the counters under the day they were read
// on, and each day the platform counted, merged where they are the same
// day, as one statement may write a row once.
const dayRowsOf = (reads: readonly AccountRead[]) => {
  const rows = new Map<string, DayRow>();

  const merge = (
    told: Pick<DayRow, "channel_id" | "collected_at" | "day"> & Partial<DayRow>
  ) => {
    const key = `${told.channel_id}/${told.day}`;
    const before = rows.get(key);

    rows.set(key, {
      channel_id: told.channel_id,
      collected_at: told.collected_at,
      day: told.day,
      followers: told.followers ?? before?.followers ?? null,
      following: told.following ?? before?.following ?? null,
      posts: told.posts ?? before?.posts ?? null,
      reach: told.reach ?? before?.reach ?? null,
      views: told.views ?? before?.views ?? null,
    });
  };

  for (const { channel, collectedAt, reading } of reads) {
    const read = {
      channel_id: channel.channelId,
      collected_at: iso(collectedAt),
    };

    merge({
      ...read,
      day: utcDayOf(collectedAt),
      followers: Option.getOrNull(reading.counters.followers),
      following: Option.getOrNull(reading.counters.following),
      posts: Option.getOrNull(reading.counters.posts),
    });

    for (const day of reading.days) {
      merge({
        ...read,
        day: day.day,
        reach: Option.getOrNull(day.reach),
        views: Option.getOrNull(day.views),
      });
    }
  }

  return JSON.stringify([...rows.values()]);
};

const channelColumns = `
  channel_id uuid,
  workspace_id uuid,
  platform text,
  next_collection_at timestamptz,
  last_collected_at timestamptz
`;

/** The channels analytics follows and their days, in Postgres. */
export const SqlTrackedChannels = Layer.effect(
  TrackedChannels,
  Effect.gen(function* SqlTrackedChannels() {
    const sql = yield* SqlClient.SqlClient;

    // Under the tracking lock, which no erasure in progress holds then: a
    // channel of a workspace erased since it was listed is passed over.
    const followLocked = Effect.fn("TrackedChannels.followLocked")(
      function* followLocked(channels: readonly TrackedChannel[]) {
        yield* holdTrackingLock(sql);

        const rows = yield* sql`
          INSERT INTO analytics.tracked_channels
            (channel_id, workspace_id, platform, next_collection_at, last_collected_at)
          SELECT listed.channel_id, listed.workspace_id, listed.platform,
                 listed.next_collection_at, listed.last_collected_at
          FROM jsonb_to_recordset(${channelsOf(channels)}::jsonb)
            AS listed(${sql.unsafe(channelColumns)})
          WHERE NOT EXISTS (
            SELECT 1 FROM analytics.erased_workspaces erased
            WHERE erased.workspace_id = listed.workspace_id
          )
          ON CONFLICT DO NOTHING
          RETURNING channel_id
        `;

        return rows.length;
      }
    );

    const follow = Effect.fn("TrackedChannels.follow")(function* follow(
      channels: readonly TrackedChannel[]
    ) {
      if (channels.length === 0) {
        return 0;
      }

      return yield* sql
        .withTransaction(followLocked(channels))
        .pipe(Effect.mapError(failed));
    });

    const due = Effect.fn("TrackedChannels.due")(function* due(
      at: DateTime.Utc,
      limit: number
    ) {
      const rows = yield* sql`
        SELECT channel_id AS "channelId", workspace_id AS "workspaceId",
               platform, next_collection_at AS "nextCollectionAt",
               last_collected_at AS "lastCollectedAt"
        FROM analytics.tracked_channels
        WHERE next_collection_at <= ${iso(at)}::timestamptz
          AND gone_at IS NULL
        ORDER BY next_collection_at, channel_id
        LIMIT ${limit}
      `.pipe(Effect.mapError(failed));

      const decoded = yield* decodeChannels(rows).pipe(Effect.orDie);

      return decoded.map((row) => new TrackedChannel(row));
    });

    const countDue = Effect.fn("TrackedChannels.countDue")(function* countDue(
      at: DateTime.Utc
    ) {
      const rows = yield* sql`
        SELECT count(*)::int AS count FROM analytics.tracked_channels
        WHERE next_collection_at <= ${iso(at)}::timestamptz
          AND gone_at IS NULL
      `.pipe(Effect.mapError(failed));

      const [row] = yield* decodeCount(rows).pipe(Effect.orDie);

      return row?.count ?? 0;
    });

    const saveSchedules = Effect.fn("TrackedChannels.saveSchedules")(
      function* saveSchedules(channels: readonly TrackedChannel[]) {
        if (channels.length === 0) {
          return;
        }

        yield* sql`
          UPDATE analytics.tracked_channels AS channel
          SET next_collection_at = saved.next_collection_at,
              last_collected_at = saved.last_collected_at
          FROM jsonb_to_recordset(${channelsOf(channels)}::jsonb)
            AS saved(${sql.unsafe(channelColumns)})
          WHERE channel.channel_id = saved.channel_id
        `.pipe(Effect.mapError(failed));
      }
    );

    const saveReadings = Effect.fn("TrackedChannels.saveReadings")(
      function* saveReadings(reads: readonly AccountRead[]) {
        if (reads.length === 0) {
          return;
        }

        const channels = channelsOf(reads.map(({ channel }) => channel));

        // One statement: the channels first, under their row locks, then a
        // day for each channel that was still there, so one forgotten or
        // erased while it was read keeps none. A day already there keeps
        // what this read does not tell.
        yield* sql`
          WITH saved AS (
            UPDATE analytics.tracked_channels AS channel
            SET next_collection_at = read.next_collection_at,
                last_collected_at = read.last_collected_at
            FROM jsonb_to_recordset(${channels}::jsonb)
              AS read(${sql.unsafe(channelColumns)})
            WHERE channel.channel_id = read.channel_id
              AND channel.gone_at IS NULL
            RETURNING channel.channel_id
          )
          INSERT INTO analytics.account_snapshots AS snapshot
            (channel_id, day, collected_at, followers, following, posts, reach, views)
          SELECT told.channel_id, told.day, told.collected_at, told.followers,
                 told.following, told.posts, told.reach, told.views
          FROM jsonb_to_recordset(${dayRowsOf(reads)}::jsonb) AS told(
            channel_id uuid,
            day date,
            collected_at timestamptz,
            followers integer,
            following integer,
            posts integer,
            reach integer,
            views integer
          )
          JOIN saved ON saved.channel_id = told.channel_id
          ON CONFLICT (channel_id, day) DO UPDATE
          SET collected_at = excluded.collected_at,
              followers = coalesce(excluded.followers, snapshot.followers),
              following = coalesce(excluded.following, snapshot.following),
              posts = coalesce(excluded.posts, snapshot.posts),
              reach = coalesce(excluded.reach, snapshot.reach),
              views = coalesce(excluded.views, snapshot.views)
        `.pipe(Effect.mapError(failed));
      }
    );

    const forget = Effect.fn("TrackedChannels.forget")(function* forget(
      channelIds: readonly ChannelId[],
      at: DateTime.Utc
    ) {
      if (channelIds.length === 0) {
        return;
      }

      // Marked gone from when they were first found so, which a
      // disconnection already recorded (AnalyticsRecords.channelGone):
      // the retention job deletes their days and posts from that moment.
      yield* sql`
        UPDATE analytics.tracked_channels
        SET gone_at = coalesce(gone_at, ${iso(at)}::timestamptz)
        WHERE channel_id = ANY(string_to_array(${channelIds.join(",")}, ',')::uuid[])
      `.pipe(Effect.mapError(failed));
    });

    return TrackedChannels.of({
      countDue,
      due,
      follow,
      forget,
      saveReadings,
      saveSchedules,
    });
  })
);
