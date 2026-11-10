import { Context, DateTime, Effect, Layer, Option } from "effect";

import { ConnectedChannels } from "#analytics/application/connected-channels.ts";
import { TrackedChannels } from "#analytics/application/tracked-channels.ts";
import { utcDayOf } from "#analytics/domain/account-metrics.ts";
import type { UtcDay } from "#analytics/domain/account-metrics.ts";
import type {
  ConnectedChannel,
  TrackedChannel,
} from "#analytics/domain/tracked-channel.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

/** One day of a channel's account, as the store keeps it. */
export interface StoredAccountDay {
  readonly day: UtcDay;
  readonly followers: number | null;
  readonly following: number | null;
  readonly posts: number | null;
  readonly reach: number | null;
  readonly views: number | null;
}

/** What the in-memory stores hold, for tests to read and arrange. */
export class StoredChannels extends Context.Service<
  StoredChannels,
  {
    /** Connects channels, as the channels context would list them. */
    readonly connect: (
      ...channels: readonly ConnectedChannel[]
    ) => Effect.Effect<void>;
    readonly disconnect: (channelId: ChannelId) => Effect.Effect<void>;
    readonly tracked: (
      channelId: ChannelId
    ) => Effect.Effect<Option.Option<TrackedChannel>>;
    /** A channel's days, oldest first. */
    readonly days: (
      channelId: ChannelId
    ) => Effect.Effect<readonly StoredAccountDay[]>;
  }
>()("test/analytics/StoredChannels") {}

/**
 * TrackedChannels and ConnectedChannels in memory, behaving as the
 * Postgres ones do.
 */
export const MemoryTrackedChannels = Layer.effectContext(
  Effect.sync(() => {
    const connected = new Map<ChannelId, ConnectedChannel>();
    const tracked = new Map<ChannelId, TrackedChannel>();
    const days = new Map<ChannelId, Map<UtcDay, StoredAccountDay>>();

    const dueBy = (at: DateTime.Utc) =>
      [...tracked.values()]
        .filter((channel) =>
          DateTime.isLessThanOrEqualTo(channel.nextCollectionAt, at)
        )
        .toSorted(
          (left, right) =>
            DateTime.Order(left.nextCollectionAt, right.nextCollectionAt) ||
            left.channelId.localeCompare(right.channelId)
        );

    const merge = (
      channelId: ChannelId,
      day: UtcDay,
      told: Partial<Omit<StoredAccountDay, "day">>
    ) => {
      const kept = days.get(channelId) ?? new Map<UtcDay, StoredAccountDay>();

      const before = kept.get(day) ?? {
        day,
        followers: null,
        following: null,
        posts: null,
        reach: null,
        views: null,
      };

      kept.set(day, {
        day,
        followers: told.followers ?? before.followers,
        following: told.following ?? before.following,
        posts: told.posts ?? before.posts,
        reach: told.reach ?? before.reach,
        views: told.views ?? before.views,
      });
      days.set(channelId, kept);
    };

    const store = TrackedChannels.of({
      countDue: (at) => Effect.sync(() => dueBy(at).length),
      due: (at, limit) => Effect.sync(() => dueBy(at).slice(0, limit)),
      follow: (channels) =>
        Effect.sync(() => {
          let added = 0;

          for (const channel of channels) {
            if (!tracked.has(channel.channelId)) {
              tracked.set(channel.channelId, channel);
              added += 1;
            }
          }

          return added;
        }),
      forget: (channelIds) =>
        Effect.sync(() => {
          for (const channelId of channelIds) {
            tracked.delete(channelId);
            days.delete(channelId);
          }
        }),
      saveReadings: (reads) =>
        Effect.sync(() => {
          for (const { channel, collectedAt, reading } of reads) {
            if (tracked.has(channel.channelId)) {
              tracked.set(channel.channelId, channel);

              merge(channel.channelId, utcDayOf(collectedAt), {
                followers: Option.getOrNull(reading.counters.followers),
                following: Option.getOrNull(reading.counters.following),
                posts: Option.getOrNull(reading.counters.posts),
              });

              for (const day of reading.days) {
                merge(channel.channelId, day.day, {
                  reach: Option.getOrNull(day.reach),
                  views: Option.getOrNull(day.views),
                });
              }
            }
          }
        }),
      saveSchedules: (channels) =>
        Effect.sync(() => {
          for (const channel of channels) {
            if (tracked.has(channel.channelId)) {
              tracked.set(channel.channelId, channel);
            }
          }
        }),
    });

    const listing = ConnectedChannels.of({
      after: (after, limit) =>
        Effect.sync(() =>
          [...connected.values()]
            .toSorted((left, right) =>
              left.channelId.localeCompare(right.channelId)
            )
            .filter(({ channelId }) =>
              Option.match(after, {
                onNone: () => true,
                onSome: (last) => channelId > last,
              })
            )
            .slice(0, limit)
        ),
    });

    const stored = StoredChannels.of({
      connect: (...channels) =>
        Effect.sync(() => {
          for (const channel of channels) {
            connected.set(channel.channelId, channel);
          }
        }),
      days: (channelId) =>
        Effect.sync(() =>
          [...(days.get(channelId)?.values() ?? [])].toSorted((left, right) =>
            left.day.localeCompare(right.day)
          )
        ),
      disconnect: (channelId) =>
        Effect.sync(() => {
          connected.delete(channelId);
        }),
      tracked: (channelId) =>
        Effect.sync(() => Option.fromUndefinedOr(tracked.get(channelId))),
    });

    return Context.make(TrackedChannels, store).pipe(
      Context.add(ConnectedChannels, listing),
      Context.add(StoredChannels, stored)
    );
  })
);
