import { Context, DateTime, Effect, Layer, Option } from "effect";

import { TrackedPosts } from "#analytics/application/tracked-posts.ts";
import type {
  DueChannel,
  LatestPublication,
} from "#analytics/application/tracked-posts.ts";
import type { PostMetrics } from "#analytics/domain/post-metrics.ts";
import { TrackedPost } from "#analytics/domain/tracked-post.ts";
import type { ChannelId, PostTargetId } from "#shared/domain/ids.ts";

/** A snapshot the store kept. */
export interface StoredSnapshot {
  readonly collectedAt: DateTime.Utc;
  readonly metrics: PostMetrics;
}

/** What the store holds, for tests to look at. */
export class StoredPosts extends Context.Service<
  StoredPosts,
  {
    readonly post: (
      targetId: PostTargetId
    ) => Effect.Effect<Option.Option<TrackedPost>>;
    readonly snapshots: (
      targetId: PostTargetId
    ) => Effect.Effect<readonly StoredSnapshot[]>;
  }
>()("test/analytics/StoredPosts") {}

interface Entry {
  readonly post: TrackedPost;
  readonly snapshots: readonly StoredSnapshot[];
}

// The post as stored, with only its schedule changed.
const withCollection = (
  stored: TrackedPost,
  collection: TrackedPost["collection"]
) =>
  new TrackedPost({
    channelId: stored.channelId,
    collection,
    lastCollectedAt: stored.lastCollectedAt,
    latest: stored.latest,
    permalink: stored.permalink,
    platformPostId: stored.platformPostId,
    postId: stored.postId,
    publishedAt: stored.publishedAt,
    targetId: stored.targetId,
    workspaceId: stored.workspaceId,
  });

const nextAtOf = (post: TrackedPost) =>
  post.collection._tag === "collecting"
    ? Option.some(post.collection.nextAt)
    : Option.none();

// The order a channel's posts come due in: when, then target id.
const byDue = (left: TrackedPost, right: TrackedPost) =>
  Option.match(Option.all([nextAtOf(left), nextAtOf(right)]), {
    onNone: () => 0,
    onSome: ([leftAt, rightAt]) => DateTime.Order(leftAt, rightAt),
  }) || left.targetId.localeCompare(right.targetId);

const isDue = (post: TrackedPost, at: DateTime.Utc) =>
  Option.exists(nextAtOf(post), (nextAt) =>
    DateTime.isLessThanOrEqualTo(nextAt, at)
  );

// The order channels with due posts come in: how long they waited, then id.
const byWait = (left: DueChannel, right: DueChannel) =>
  DateTime.Order(left.dueSince, right.dueSince) ||
  left.channelId.localeCompare(right.channelId);

/**
 * TrackedPosts in memory, as the Drizzle store behaves: posts by target,
 * the channels with due ones by how long they waited, each channel's posts
 * by when they are due then target id, a reading saved with its snapshot, a schedule
 * saved on its own.
 */
export const MemoryTrackedPosts = Layer.effectContext(
  Effect.sync(() => {
    // Changed in place: a run saves tens of thousands of posts.
    const entries = new Map<PostTargetId, Entry>();

    const update = (targetId: PostTargetId, change: (entry: Entry) => Entry) =>
      Effect.sync(() => {
        const entry = entries.get(targetId);

        if (entry !== undefined) {
          entries.set(targetId, change(entry));
        }
      });

    const saveReading = (post: TrackedPost) =>
      update(post.targetId, (entry) => ({
        post,
        snapshots: Option.match(
          Option.all({
            collectedAt: post.lastCollectedAt,
            metrics: post.latest,
          }),
          {
            onNone: () => entry.snapshots,
            onSome: (snapshot) => [...entry.snapshots, snapshot],
          }
        ),
      }));

    const saveSchedule = (post: TrackedPost) =>
      update(post.targetId, (entry) => ({
        ...entry,
        post: withCollection(entry.post, post.collection),
      }));

    const store = TrackedPosts.of({
      countDue: (at) =>
        Effect.sync(
          () =>
            [...entries.values()].filter(({ post }) => isDue(post, at)).length
        ),
      dueChannels: (at, limit, after) =>
        Effect.sync(() => {
          const since = new Map<ChannelId, DateTime.Utc>();

          for (const { post } of entries.values()) {
            const nextAt = nextAtOf(post);

            if (Option.isSome(nextAt) && isDue(post, at)) {
              const known = since.get(post.channelId);

              since.set(
                post.channelId,
                known === undefined
                  ? nextAt.value
                  : DateTime.min(known, nextAt.value)
              );
            }
          }

          return [...since]
            .flatMap(([channelId, dueSince]) => {
              const channel: DueChannel = { channelId, dueSince };

              return Option.exists(after, (last) => byWait(channel, last) <= 0)
                ? []
                : [channel];
            })
            .toSorted(byWait)
            .slice(0, limit);
        }),
      dueOn: (at, channelIds, perChannel) =>
        Effect.sync(() => {
          const wanted = new Set<ChannelId>(channelIds);
          const taken = new Map<ChannelId, number>();

          return [...entries.values()]
            .flatMap(({ post }) =>
              isDue(post, at) && wanted.has(post.channelId) ? [post] : []
            )
            .toSorted(byDue)
            .filter((post) => {
              const turn = (taken.get(post.channelId) ?? 0) + 1;

              taken.set(post.channelId, turn);

              return turn <= perChannel;
            });
        }),
      latestPublication: (before) =>
        Effect.sync(() => {
          const [latest] = [...entries.values()]
            .flatMap(({ post }) =>
              DateTime.isLessThanOrEqualTo(post.publishedAt, before)
                ? [post]
                : []
            )
            .toSorted(
              (left, right) =>
                DateTime.Order(right.publishedAt, left.publishedAt) ||
                right.targetId.localeCompare(left.targetId)
            );

          return Option.fromUndefinedOr(latest).pipe(
            Option.map(({ publishedAt, targetId }): LatestPublication => ({
              publishedAt,
              targetId,
            }))
          );
        }),
      saveReading,
      saveReadings: (posts) =>
        Effect.forEach(posts, saveReading, { discard: true }),
      saveSchedule,
      saveSchedules: (posts) =>
        Effect.forEach(posts, saveSchedule, { discard: true }),
      track: (posts) =>
        Effect.sync(() => {
          let added = 0;

          for (const post of posts) {
            if (!entries.has(post.targetId)) {
              entries.set(post.targetId, { post, snapshots: [] });
              added += 1;
            }
          }

          return added;
        }),
    });

    return Context.make(TrackedPosts, store).pipe(
      Context.add(
        StoredPosts,
        StoredPosts.of({
          post: (targetId) =>
            Effect.sync(() =>
              Option.fromUndefinedOr(entries.get(targetId)?.post)
            ),
          snapshots: (targetId) =>
            Effect.sync(() => entries.get(targetId)?.snapshots ?? []),
        })
      )
    );
  })
);
