import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import {
  AccountPaceRef,
  CollectAccounts,
} from "#analytics/application/collect-accounts.ts";
import type { AccountPace } from "#analytics/application/collect-accounts.ts";
import { MetricsReader } from "#analytics/application/metrics-reader.ts";
import type {
  AccountRequest,
  MetricsReadFailure,
} from "#analytics/application/metrics-reader.ts";
import {
  AccountCounters,
  UtcDaySchema,
} from "#analytics/domain/account-metrics.ts";
import type { AccountReading } from "#analytics/domain/account-metrics.ts";
import type { ConnectedChannel } from "#analytics/domain/tracked-channel.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import {
  MemoryTrackedChannels,
  StoredChannels,
} from "#test/analytics/fakes/memory-tracked-channels.ts";

const workspaceId = WorkspaceIdSchema.make(
  "3f1d2c4b-5a69-4788-9a0b-1c2d3e4f5a6c"
);

const channelOf = (
  index: number,
  platform: ConnectedChannel["platform"] = "mastodon"
): ConnectedChannel => ({
  channelId: ChannelIdSchema.make(
    `01900000-0000-7000-8000-${String(index).padStart(12, "0")}`
  ),
  platform,
  workspaceId,
});

type Answer = (
  request: AccountRequest
) => Effect.Effect<AccountReading, MetricsReadFailure>;

const followersOf = (followers: number): AccountReading => ({
  counters: new AccountCounters({
    followers: Option.some(followers),
    following: Option.some(7),
  }),
  days: [],
});

// The requests the reader was asked for, in order.
const asked = Ref.makeUnsafe<readonly AccountRequest[]>([]);

const collectionWith = (answer: Answer, pace: Partial<AccountPace> = {}) =>
  CollectAccounts.layer.pipe(
    Layer.provide(
      Layer.succeed(AccountPaceRef, {
        budget: Duration.minutes(40),
        channelConcurrency: 16,
        channelsPerPage: 500,
        ...pace,
      })
    ),
    Layer.provide(
      Layer.succeed(
        MetricsReader,
        MetricsReader.of({
          account: (request) =>
            Ref.update(asked, (before) => [...before, request]).pipe(
              Effect.andThen(answer(request))
            ),
          read: () => Effect.fail(new PlatformUnavailable()),
        })
      )
    ),
    Layer.provideMerge(MemoryTrackedChannels)
  );

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const runAt = (iso: string) =>
  TestClock.setTime(DateTime.toEpochMillis(utc(iso)) + 1500).pipe(
    Effect.andThen(CollectAccounts.use((collect) => collect.run(utc(iso))))
  );

const connect = (...channels: readonly ConnectedChannel[]) =>
  StoredChannels.use((stored) => stored.connect(...channels));

const daysOf = (channelId: ChannelId) =>
  StoredChannels.use((stored) => stored.days(channelId));

const nextOf = (channelId: ChannelId) =>
  StoredChannels.use((stored) => stored.tracked(channelId)).pipe(
    Effect.map(
      Option.map((channel) => DateTime.formatIso(channel.nextCollectionAt))
    )
  );

const day = (written: string) => UtcDaySchema.make(written);

const noDay = {
  followers: null,
  following: null,
  posts: null,
  reach: null,
  views: null,
};

describe("the collection of accounts' numbers", () => {
  it.effect(
    "follows each connected channel from the run after it was connected, and reads it once a day",
    () =>
      Effect.gen(function* daily() {
        const first = channelOf(1);
        const second = channelOf(2);
        let followers = 100;

        yield* Effect.gen(function* checks() {
          yield* connect(first);

          const started = yield* runAt("2031-05-01T10:37:00.000Z");

          assert.deepStrictEqual(started, {
            deferred: 0,
            discovered: 1,
            ended: 0,
            left: 0,
            read: 1,
            skipped: 0,
          });

          // Not again the same day, whatever runs come.
          followers = 104;
          yield* connect(second);

          const later = yield* runAt("2031-05-01T11:37:00.000Z");

          assert.strictEqual(later.read, 1);
          assert.strictEqual(later.discovered, 1);

          followers = 110;

          const nextDay = yield* runAt("2031-05-02T10:37:00.000Z");

          assert.strictEqual(nextDay.read, 1);

          assert.deepStrictEqual(yield* daysOf(first.channelId), [
            { ...noDay, day: day("2031-05-01"), followers: 100, following: 7 },
            { ...noDay, day: day("2031-05-02"), followers: 110, following: 7 },
          ]);
          assert.deepStrictEqual(yield* daysOf(second.channelId), [
            { ...noDay, day: day("2031-05-01"), followers: 104, following: 7 },
          ]);
          assert.deepStrictEqual(
            yield* nextOf(first.channelId),
            Option.some("2031-05-03T10:37:00.000Z")
          );
        }).pipe(
          Effect.provide(
            collectionWith(() => Effect.sync(() => followersOf(followers)))
          )
        );
      })
  );

  it.effect(
    "keeps the days a platform counted, and revises one read before",
    () =>
      Effect.gen(function* insights() {
        const channel = channelOf(3, "threads");
        let views = 40;

        yield* Effect.gen(function* checks() {
          yield* connect(channel);
          yield* runAt("2031-05-03T10:37:00.000Z");

          views = 55;
          yield* runAt("2031-05-04T10:37:00.000Z");

          assert.deepStrictEqual(yield* daysOf(channel.channelId), [
            { ...noDay, day: day("2031-05-02"), views: 55 },
            { ...noDay, day: day("2031-05-03"), followers: 9 },
            { ...noDay, day: day("2031-05-04"), followers: 9 },
          ]);
        }).pipe(
          Effect.provide(
            collectionWith(() =>
              Effect.sync(() => ({
                counters: new AccountCounters({ followers: Option.some(9) }),
                days: [
                  {
                    day: day("2031-05-02"),
                    reach: Option.none(),
                    views: Option.some(views),
                  },
                ],
              }))
            )
          )
        );
      })
  );

  it.effect(
    "passes a paused channel over for a day, asks an unsupported one again a week later, and forgets a disconnected one with what it read",
    () =>
      Effect.gen(function* refusals() {
        const paused = channelOf(4);
        const unsupported = channelOf(5, "googleBusiness");
        const gone = channelOf(6);

        const reasons = new Map<ChannelId, ChannelUnreadable["reason"]>([
          [paused.channelId, "paused"],
          [unsupported.channelId, "unsupported"],
        ]);

        yield* Effect.gen(function* checks() {
          yield* connect(paused, unsupported, gone);

          const first = yield* runAt("2031-05-05T10:37:00.000Z");

          assert.strictEqual(first.read, 1);
          assert.strictEqual(first.skipped, 2);

          assert.deepStrictEqual(
            yield* nextOf(paused.channelId),
            Option.some("2031-05-06T10:37:00.000Z")
          );
          assert.deepStrictEqual(
            yield* nextOf(unsupported.channelId),
            Option.some("2031-05-12T10:37:00.000Z")
          );
          // Nothing is kept of a channel that tells nothing.
          assert.deepStrictEqual(yield* daysOf(paused.channelId), []);

          reasons.set(gone.channelId, "disconnected");
          yield* StoredChannels.use((stored) =>
            stored.disconnect(gone.channelId)
          );

          const second = yield* runAt("2031-05-06T10:37:00.000Z");

          assert.strictEqual(second.ended, 1);
          assert.deepStrictEqual(yield* nextOf(gone.channelId), Option.none());
          assert.deepStrictEqual(yield* daysOf(gone.channelId), []);
        }).pipe(
          Effect.provide(
            collectionWith(({ channelId }) => {
              const reason = reasons.get(channelId);

              return reason === undefined
                ? Effect.succeed(followersOf(3))
                : Effect.fail(new ChannelUnreadable({ reason }));
            })
          )
        );
      })
  );

  it.effect(
    "puts a channel whose platform is down off to the next run, behind the others",
    () =>
      Effect.gen(function* down() {
        const failing = channelOf(7);
        const working = channelOf(8);

        yield* Effect.gen(function* checks() {
          yield* connect(failing, working);

          const first = yield* runAt("2031-05-07T10:37:00.000Z");

          assert.strictEqual(first.read, 1);
          assert.strictEqual(first.deferred, 1);
          assert.deepStrictEqual(
            yield* nextOf(failing.channelId),
            Option.some("2031-05-07T11:37:00.000Z")
          );
        }).pipe(
          Effect.provide(
            collectionWith(({ channelId }) =>
              channelId === failing.channelId
                ? Effect.fail(new PlatformUnavailable())
                : Effect.succeed(followersOf(1))
            )
          )
        );
      })
  );

  it.effect(
    "starts no read past its budget, and says what it left for the next run",
    () =>
      Effect.gen(function* budget() {
        const channels = [channelOf(11), channelOf(12), channelOf(13)];

        yield* Effect.gen(function* checks() {
          yield* connect(...channels);
          yield* Ref.set(asked, []);

          const report = yield* runAt("2031-05-08T10:37:00.000Z");

          // Each read takes 25 minutes, one channel at a time: two start
          // within 40 minutes, the third waits for the next run.
          assert.strictEqual(report.read, 2);
          assert.strictEqual(report.left, 1);
          assert.lengthOf(yield* Ref.get(asked), 2);
        }).pipe(
          Effect.provide(
            collectionWith(
              () =>
                TestClock.adjust(Duration.minutes(25)).pipe(
                  Effect.as(followersOf(1))
                ),
              { channelConcurrency: 1 }
            )
          )
        );
      })
  );
});
