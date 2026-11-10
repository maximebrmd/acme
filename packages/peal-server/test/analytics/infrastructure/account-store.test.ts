import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { AnalyticsRecords } from "#analytics/application/analytics-records.ts";
import { ConnectedChannels } from "#analytics/application/connected-channels.ts";
import { TrackedChannels } from "#analytics/application/tracked-channels.ts";
import {
  AccountCounters,
  UtcDaySchema,
} from "#analytics/domain/account-metrics.ts";
import {
  accountRead,
  accountSkipped,
  followChannel,
} from "#analytics/domain/tracked-channel.ts";
import { ChannelsConnectedChannels } from "#analytics/infrastructure/channels-connected-channels.ts";
import { DrizzleAnalyticsRecords } from "#analytics/infrastructure/drizzle-analytics-records.ts";
import { SqlTrackedChannels } from "#analytics/infrastructure/sql-tracked-channels.ts";
import { ChannelDirectory } from "#channels/application/channel-directory.ts";
import { DrizzleChannelDirectory } from "#channels/infrastructure/drizzle-channel-directory.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { forgetWorkspace, newChannelId } from "#test/analytics/support.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
import { seedChannel } from "#test/workspace/integration/seed.ts";

// The accounts' store on Postgres, at instants no other suite uses.

const StoreTest = Layer.mergeAll(
  SqlTrackedChannels,
  DrizzleAnalyticsRecords,
  ChannelsConnectedChannels.pipe(Layer.provideMerge(DrizzleChannelDirectory))
).pipe(Layer.provideMerge(DatabaseTest));

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const day = (written: string) => UtcDaySchema.make(written);

const DayRowsSchema = Schema.Array(
  Schema.Struct({
    day: Schema.String,
    followers: Schema.NullOr(Schema.Int),
    following: Schema.NullOr(Schema.Int),
    posts: Schema.NullOr(Schema.Int),
    reach: Schema.NullOr(Schema.Int),
    views: Schema.NullOr(Schema.Int),
  })
);

const daysOf = (channelId: ChannelId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`SELECT day::text AS day, followers, following, posts, reach, views
          FROM analytics.account_snapshots WHERE channel_id = ${channelId} ORDER BY day`
  ).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(DayRowsSchema)),
    Effect.orDie
  );

const tracking = (workspaceId: WorkspaceId, channelId: ChannelId, at: string) =>
  followChannel({ channelId, platform: "mastodon", workspaceId }, utc(at));

layer(StoreTest, { excludeTestServices: true })("the accounts' store", (it) => {
  it.effect(
    "follows a channel once, keeps one snapshot a day, and revises a day read before",
    () =>
      Effect.gen(function* keeps() {
        const workspaceId = yield* freshWorkspace;
        const channels = yield* TrackedChannels;
        const channelId = yield* newChannelId;

        const followed = tracking(
          workspaceId,
          channelId,
          "2042-02-01T10:37:00Z"
        );

        yield* Effect.gen(function* checks() {
          assert.strictEqual(yield* channels.follow([followed]), 1);
          assert.strictEqual(yield* channels.follow([followed]), 0);

          const due = yield* channels.due(utc("2042-02-01T10:37:00Z"), 5000);

          assert.deepStrictEqual(
            due.filter((channel) => channel.channelId === channelId),
            [followed]
          );

          const first = accountRead(
            followed,
            utc("2042-02-01T10:37:02Z"),
            utc("2042-02-01T10:37:00Z")
          );

          yield* channels.saveReadings([
            {
              channel: first,
              collectedAt: utc("2042-02-01T10:37:02Z"),
              reading: {
                counters: new AccountCounters({
                  followers: Option.some(120),
                  following: Option.some(8),
                }),
                days: [
                  {
                    day: day("2042-01-31"),
                    reach: Option.none(),
                    views: Option.some(40),
                  },
                ],
              },
            },
          ]);

          // The same day again: the counters are the latest, and what
          // the read does not tell stays.
          yield* channels.saveReadings([
            {
              channel: first,
              collectedAt: utc("2042-02-01T22:37:02Z"),
              reading: {
                counters: new AccountCounters({
                  followers: Option.some(125),
                }),
                days: [
                  {
                    day: day("2042-01-31"),
                    reach: Option.some(30),
                    views: Option.some(52),
                  },
                ],
              },
            },
          ]);

          assert.deepStrictEqual(yield* daysOf(channelId), [
            {
              day: "2042-01-31",
              followers: null,
              following: null,
              posts: null,
              reach: 30,
              views: 52,
            },
            {
              day: "2042-02-01",
              followers: 125,
              following: 8,
              posts: null,
              reach: null,
              views: null,
            },
          ]);

          // Read: no longer due that day, due the next.
          const sameDay = yield* channels.due(
            utc("2042-02-02T10:36:59Z"),
            5000
          );

          assert.isFalse(
            sameDay.some((channel) => channel.channelId === channelId)
          );

          const next = yield* channels.due(utc("2042-02-02T10:37:00Z"), 5000);

          assert.deepStrictEqual(
            next.filter((channel) => channel.channelId === channelId),
            [first]
          );

          yield* channels.saveSchedules([
            accountSkipped(first, utc("2042-02-02T10:37:00Z")),
          ]);

          const exported = yield* AnalyticsRecords.use((records) =>
            records.exportAccounts(workspaceId)
          );

          assert.deepStrictEqual(
            exported.map(({ day: exportedDay, followers, views }) => ({
              day: exportedDay,
              followers,
              views,
            })),
            [
              { day: "2042-01-31", followers: null, views: 52 },
              { day: "2042-02-01", followers: 125, views: null },
            ]
          );

          yield* channels.forget([channelId], utc("2042-02-03T10:37:00Z"));

          // Gone: no longer due, whenever.
          const afterwards = yield* channels.due(
            utc("2042-03-01T10:37:00Z"),
            5000
          );

          assert.isFalse(
            afterwards.some((channel) => channel.channelId === channelId)
          );

          // Its days stay until the retention job takes them, a week
          // after it left, or the same account takes them back.
          assert.lengthOf(yield* daysOf(channelId), 2);
        }).pipe(Effect.ensuring(forgetWorkspace(workspaceId)));
      })
  );

  it.effect(
    "keeps nothing of a channel forgotten while it was read, nor follows one of an erased workspace",
    () =>
      Effect.gen(function* erased() {
        const workspaceId = yield* freshWorkspace;
        const channels = yield* TrackedChannels;
        const channelId = yield* newChannelId;

        const followed = tracking(
          workspaceId,
          channelId,
          "2042-02-03T10:37:00Z"
        );

        yield* Effect.gen(function* checks() {
          yield* channels.follow([followed]);

          yield* AnalyticsRecords.use((records) =>
            records.eraseWorkspace(workspaceId)
          );

          yield* channels.saveReadings([
            {
              channel: followed,
              collectedAt: utc("2042-02-03T10:37:02Z"),
              reading: {
                counters: new AccountCounters({ followers: Option.some(1) }),
                days: [],
              },
            },
          ]);

          assert.deepStrictEqual(yield* daysOf(channelId), []);
          assert.strictEqual(yield* channels.follow([followed]), 0);
        }).pipe(Effect.ensuring(forgetWorkspace(workspaceId)));
      })
  );

  it.effect("lists the connected channels a page at a time, by id", () =>
    Effect.gen(function* lists() {
      const workspaceId = yield* freshWorkspace;
      const connected = yield* ConnectedChannels;
      const directory = yield* ChannelDirectory;

      yield* Effect.addFinalizer(() => forgetWorkspace(workspaceId));

      const first = yield* seedChannel(workspaceId, "@one@social.example");
      const second = yield* seedChannel(workspaceId, "@two@social.example");
      const mine: readonly string[] = [first, second].toSorted();

      // Other suites' channels are listed too: walk every page.
      const walked: string[] = [];
      let after = Option.none<ChannelId>();

      while (true) {
        const page = yield* connected.after(after, 2);

        walked.push(...page.map(({ channelId }) => channelId));
        after = Option.fromUndefinedOr(page.at(-1)?.channelId);

        if (page.length < 2) {
          break;
        }
      }

      assert.deepStrictEqual(
        walked.filter((channelId) => mine.includes(channelId)),
        mine
      );
      assert.deepStrictEqual(walked, walked.toSorted());

      const everyChannel = yield* directory.after(Option.none(), 100_000);
      const listed = everyChannel.find(({ channelId }) => channelId === first);

      assert.deepStrictEqual(listed, {
        channelId: first,
        platform: "mastodon",
        workspaceId,
      });
    }).pipe(Effect.scoped)
  );
});
