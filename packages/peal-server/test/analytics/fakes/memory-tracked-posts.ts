import { Context, DateTime, Effect, Layer, Option, Ref } from "effect";

import { TrackedPosts } from "#analytics/application/tracked-posts.ts";
import type { LatestPublication } from "#analytics/application/tracked-posts.ts";
import type { PostMetrics } from "#analytics/domain/post-metrics.ts";
import { TrackedPost } from "#analytics/domain/tracked-post.ts";
import type { PostTargetId } from "#shared/domain/ids.ts";

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

/**
 * TrackedPosts in memory, as the Drizzle store behaves: posts by target,
 * the due ones taking turns between channels, each channel's by when they
 * are due then target id, a reading saved with its snapshot, a schedule
 * saved on its own.
 */
export const MemoryTrackedPosts = Layer.effectContext(
  Effect.gen(function* MemoryTrackedPosts() {
    const entries = yield* Ref.make(new Map<PostTargetId, Entry>());

    const update = (targetId: PostTargetId, change: (entry: Entry) => Entry) =>
      Ref.update(entries, (before) => {
        const entry = before.get(targetId);

        return entry === undefined
          ? before
          : new Map(before).set(targetId, change(entry));
      });

    const store = TrackedPosts.of({
      due: (at, limit) =>
        Ref.get(entries).pipe(
          Effect.map((all) => {
            const due = [...all.values()]
              .flatMap(({ post }) =>
                Option.exists(nextAtOf(post), (nextAt) =>
                  DateTime.isLessThanOrEqualTo(nextAt, at)
                )
                  ? [post]
                  : []
              )
              .toSorted(byDue);

            // Each post's turn on its channel, as row_number() numbers it.
            const seen = new Map<string, number>();
            const turns = new Map<PostTargetId, number>();

            for (const post of due) {
              const turn = (seen.get(post.channelId) ?? 0) + 1;

              seen.set(post.channelId, turn);
              turns.set(post.targetId, turn);
            }

            return due
              .toSorted(
                (left, right) =>
                  (turns.get(left.targetId) ?? 0) -
                    (turns.get(right.targetId) ?? 0) || byDue(left, right)
              )
              .slice(0, limit);
          })
        ),
      latestPublication: (before) =>
        Ref.get(entries).pipe(
          Effect.map((all) => {
            const [latest] = [...all.values()]
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
          })
        ),
      saveReading: (post) =>
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
        })),
      saveSchedule: (post) =>
        update(post.targetId, (entry) => ({
          ...entry,
          post: withCollection(entry.post, post.collection),
        })),
      track: (posts) =>
        Ref.modify(entries, (before) => {
          const after = new Map(before);
          let added = 0;

          for (const post of posts) {
            if (!after.has(post.targetId)) {
              after.set(post.targetId, { post, snapshots: [] });
              added += 1;
            }
          }

          return [added, after];
        }),
    });

    return Context.make(TrackedPosts, store).pipe(
      Context.add(
        StoredPosts,
        StoredPosts.of({
          post: (targetId) =>
            Ref.get(entries).pipe(
              Effect.map((all) =>
                Option.fromUndefinedOr(all.get(targetId)?.post)
              )
            ),
          snapshots: (targetId) =>
            Ref.get(entries).pipe(
              Effect.map((all) => all.get(targetId)?.snapshots ?? [])
            ),
        })
      )
    );
  })
);
