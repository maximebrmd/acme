import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  lte,
  or,
} from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { FeedStore } from "#publishing/application/feed-store.ts";
import type { FeedItemRecord } from "#publishing/application/feed-store.ts";
import {
  FeedItemOutcomeSchema,
  FeedItemReasonSchema,
  FeedPictureSkipSchema,
} from "#publishing/domain/feed-item-outcome.ts";
import { Feed } from "#publishing/domain/feed.ts";
import type { FeedStatus } from "#publishing/domain/feed.ts";
import { ItemDigestSchema } from "#publishing/domain/item-digest.ts";
import type { ItemDigest } from "#publishing/domain/item-digest.ts";
import { PostOriginSchema } from "#publishing/domain/post-origin.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { feedItems, feeds } from "./schema.ts";

type Row = typeof feeds.$inferSelect;

type ItemRow = typeof feedItems.$inferSelect;

// Rows are decoded with the domain's schema, so a row the domain could not
// have written (a bug, or a hand edit) fails loudly instead of being trusted.
const decodeFeed = Schema.decodeUnknownEffect(Feed);

const decodeItem = Schema.decodeUnknownEffect(
  Schema.Struct({
    digest: ItemDigestSchema,
    itemAt: Schema.Option(Schema.DateTimeUtc),
    outcome: FeedItemOutcomeSchema,
    pictureSkipped: Schema.Option(FeedPictureSkipSchema),
    postId: Schema.Option(PostIdSchema),
    reason: Schema.Option(FeedItemReasonSchema),
    seenAt: Schema.DateTimeUtc,
  })
);

const encodeOrigin = Schema.encodeSync(PostOriginSchema);

const failed = (cause: unknown) => new DatabaseError({ cause });

const utc = (date: Date) => DateTime.fromDateUnsafe(date);

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const optionalUtc = (value: Date | null) =>
  Option.fromNullOr(value).pipe(Option.map(utc));

const statusOf = (row: Row) => {
  if (row.status === "paused") {
    return { _tag: "paused", pausedAt: row.statusAt && utc(row.statusAt) };
  }

  if (row.status === "stopped") {
    return {
      _tag: "stopped",
      reason: row.stopReason,
      stoppedAt: row.statusAt && utc(row.statusAt),
    };
  }

  return { _tag: row.status };
};

const toFeed = (row: Row) =>
  decodeFeed({
    attachPicture: row.attachPicture,
    channelIds: row.channelIds,
    channelSetId: Option.fromNullOr(row.channelSetId),
    createdAt: utc(row.createdAt),
    etag: Option.fromNullOr(row.etag),
    failingSince: optionalUtc(row.failingSince),
    id: row.id,
    lastCheckedAt: optionalUtc(row.lastCheckedAt),
    lastFailure: Option.fromNullOr(row.lastFailure),
    lastModified: Option.fromNullOr(row.lastModified),
    mode: row.mode,
    nextCheckAt: utc(row.nextCheckAt),
    queueId: Option.fromNullOr(row.queueId),
    since: utc(row.since),
    startedBy: Option.fromNullOr(row.startedBy),
    startedVia: row.startedVia,
    status: statusOf(row),
    template: row.template,
    title: Option.fromNullOr(row.title),
    updatedAt: utc(row.updatedAt),
    url: row.url,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const feedsFrom = Effect.forEach((row: Row) => toFeed(row));

const feedFrom = (rows: readonly Row[]) => {
  const [row] = rows;

  return row === undefined
    ? Effect.succeed(Option.none<Feed>())
    : toFeed(row).pipe(Effect.map(Option.some));
};

const toItem = (row: ItemRow): Effect.Effect<FeedItemRecord> =>
  decodeItem({
    digest: row.itemDigest,
    itemAt: optionalUtc(row.itemAt),
    outcome: row.outcome,
    pictureSkipped: Option.fromNullOr(row.pictureSkipped),
    postId: Option.fromNullOr(row.postId),
    reason: Option.fromNullOr(row.reason),
    seenAt: utc(row.seenAt),
  }).pipe(Effect.orDie);

const itemsFrom = Effect.forEach((row: ItemRow) => toItem(row));

const statusColumns = (status: FeedStatus) => {
  if (status._tag === "paused") {
    return {
      status: status._tag,
      statusAt: date(status.pausedAt),
      stopReason: null,
    };
  }

  if (status._tag === "stopped") {
    return {
      status: status._tag,
      statusAt: date(status.stoppedAt),
      stopReason: status.reason,
    };
  }

  return { status: status._tag, statusAt: null, stopReason: null };
};

// Everything that changes of a feed once it is started.
const changing = (feed: Feed) => ({
  ...statusColumns(feed.status),
  attachPicture: feed.attachPicture,
  channelIds: [...feed.channelIds],
  channelSetId: Option.getOrNull(feed.channelSetId),
  etag: Option.getOrNull(feed.etag),
  failingSince: feed.failingSince.pipe(Option.map(date), Option.getOrNull),
  lastCheckedAt: feed.lastCheckedAt.pipe(Option.map(date), Option.getOrNull),
  lastFailure: Option.getOrNull(feed.lastFailure),
  lastModified: Option.getOrNull(feed.lastModified),
  mode: feed.mode,
  nextCheckAt: date(feed.nextCheckAt),
  queueId: Option.getOrNull(feed.queueId),
  since: date(feed.since),
  template: feed.template,
  title: Option.getOrNull(feed.title),
  updatedAt: date(feed.updatedAt),
  url: feed.url,
});

const inWorkspace = (workspaceId: string, feedId: string) =>
  and(eq(feeds.workspaceId, workspaceId), eq(feeds.id, feedId));

// The outcomes that made a post, or are making one: what a day counts.
const making = ["made", "heldBack", "claimed", "abandoned"];

/** Feeds and their items in the publishing schema, through Drizzle. */
export const DrizzleFeedStore = Layer.effect(
  FeedStore,
  Effect.gen(function* DrizzleFeedStore() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return FeedStore.of({
      abandonClaims: (feedId) =>
        db
          .update(feedItems)
          .set({ outcome: "abandoned" })
          .where(
            and(eq(feedItems.feedId, feedId), eq(feedItems.outcome, "claimed"))
          )
          .pipe(Effect.asVoid, Effect.mapError(failed)),
      byId: (workspaceId, feedId) =>
        db
          .select()
          .from(feeds)
          .where(inWorkspace(workspaceId, feedId))
          .pipe(Effect.mapError(failed), Effect.flatMap(feedFrom)),
      // A transaction's advisory lock, in the two-key form: the first key
      // names what is claimed, the second the workspace.
      claim: (workspaceId) =>
        client`SELECT pg_advisory_xact_lock(hashtext('peal-server/publishing/feeds'), hashtext(${workspaceId}))`.pipe(
          Effect.asVoid,
          Effect.mapError(failed)
        ),
      claimed: (feedId) =>
        db
          .select()
          .from(feedItems)
          .where(
            and(eq(feedItems.feedId, feedId), eq(feedItems.outcome, "claimed"))
          )
          .orderBy(asc(feedItems.seenAt))
          .pipe(Effect.mapError(failed), Effect.flatMap(itemsFrom)),
      count: (workspaceId) =>
        db
          .select({ feeds: count() })
          .from(feeds)
          .where(eq(feeds.workspaceId, workspaceId))
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => row?.feeds ?? 0)
          ),
      due: (now, after, limit) =>
        db
          .select()
          .from(feeds)
          .where(
            and(
              eq(feeds.status, "active"),
              lte(feeds.nextCheckAt, date(now)),
              ...Option.toArray(
                after.pipe(
                  Option.map(({ id, nextCheckAt }) =>
                    or(
                      gt(feeds.nextCheckAt, date(nextCheckAt)),
                      and(
                        eq(feeds.nextCheckAt, date(nextCheckAt)),
                        gt(feeds.id, id)
                      )
                    )
                  )
                )
              )
            )
          )
          .orderBy(asc(feeds.nextCheckAt), asc(feeds.id))
          .limit(limit)
          .pipe(Effect.mapError(failed), Effect.flatMap(feedsFrom)),
      forgetChannelSet: (workspaceId, setId) =>
        db
          .update(feeds)
          .set({ channelSetId: null })
          .where(
            and(
              eq(feeds.workspaceId, workspaceId),
              eq(feeds.channelSetId, setId)
            )
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
      insert: (feed) =>
        db
          .insert(feeds)
          .values({
            ...changing(feed),
            createdAt: date(feed.createdAt),
            id: feed.id,
            startedBy: Option.getOrNull(feed.startedBy),
            startedVia: encodeOrigin(feed.startedVia),
            workspaceId: feed.workspaceId,
          })
          .pipe(Effect.asVoid, Effect.mapError(failed)),
      items: (feedId, limit) =>
        db
          .select()
          .from(feedItems)
          .where(eq(feedItems.feedId, feedId))
          .orderBy(desc(feedItems.seenAt), desc(feedItems.itemDigest))
          .limit(limit)
          .pipe(Effect.mapError(failed), Effect.flatMap(itemsFrom)),
      list: (workspaceId, after, limit) =>
        db
          .select()
          .from(feeds)
          .where(
            and(
              eq(feeds.workspaceId, workspaceId),
              ...Option.toArray(
                after.pipe(Option.map((id) => gt(feeds.id, id)))
              )
            )
          )
          .orderBy(asc(feeds.id))
          .limit(limit)
          .pipe(Effect.mapError(failed), Effect.flatMap(feedsFrom)),
      listed: (feedId, digests, at) =>
        digests.length === 0
          ? Effect.void
          : db
              .update(feedItems)
              .set({ lastSeenAt: date(at) })
              .where(
                and(
                  eq(feedItems.feedId, feedId),
                  inArray(feedItems.itemDigest, [...digests])
                )
              )
              .pipe(Effect.asVoid, Effect.mapError(failed)),
      lock: (workspaceId, feedId) =>
        db
          .select()
          .from(feeds)
          .where(inWorkspace(workspaceId, feedId))
          .for("update")
          .pipe(Effect.mapError(failed), Effect.flatMap(feedFrom)),
      lockUnlessHeld: (feedId) =>
        db
          .select()
          .from(feeds)
          .where(eq(feeds.id, feedId))
          .for("update", { skipLocked: true })
          .pipe(Effect.mapError(failed), Effect.flatMap(feedFrom)),
      madeSince: (feedId, since) =>
        db
          .select({ made: count() })
          .from(feedItems)
          .where(
            and(
              eq(feedItems.feedId, feedId),
              inArray(feedItems.outcome, making),
              gte(feedItems.seenAt, date(since))
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => row?.made ?? 0)
          ),
      overdue: (before) =>
        db
          .select({ late: count() })
          .from(feeds)
          .where(
            and(eq(feeds.status, "active"), lt(feeds.nextCheckAt, date(before)))
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => row?.late ?? 0)
          ),
      prune: (kept) =>
        client`
          DELETE FROM publishing.feed_items AS item
          USING (
            SELECT feed_id, item_digest,
              row_number() OVER (PARTITION BY feed_id ORDER BY last_seen_at DESC, seen_at DESC, item_digest DESC) AS place,
              max(last_seen_at) OVER (PARTITION BY feed_id) AS latest
            FROM publishing.feed_items
          ) AS ranked
          WHERE item.feed_id = ranked.feed_id
            AND item.item_digest = ranked.item_digest
            AND ranked.place > ${kept}
            AND item.last_seen_at < ranked.latest
          RETURNING item.feed_id`.pipe(
          Effect.map((rows) => rows.length),
          Effect.mapError(failed)
        ),
      record: (feedId, items) =>
        items.length === 0
          ? Effect.succeed(new Set<ItemDigest>())
          : db
              .insert(feedItems)
              .values(
                items.map((item) => ({
                  feedId,
                  itemAt: item.itemAt.pipe(Option.map(date), Option.getOrNull),
                  itemDigest: item.digest,
                  lastSeenAt: date(item.seenAt),
                  outcome: item.outcome,
                  pictureSkipped: Option.getOrNull(item.pictureSkipped),
                  postId: Option.getOrNull(item.postId),
                  reason: Option.getOrNull(item.reason),
                  seenAt: date(item.seenAt),
                }))
              )
              .onConflictDoNothing()
              .returning({ digest: feedItems.itemDigest })
              .pipe(
                Effect.mapError(failed),
                Effect.map(
                  (rows) =>
                    new Set(
                      rows.map(({ digest }) => ItemDigestSchema.make(digest))
                    )
                )
              ),
      remove: (workspaceId, feedId) =>
        db
          .delete(feeds)
          .where(inWorkspace(workspaceId, feedId))
          .returning({ id: feeds.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      seen: (feedId, digests) =>
        digests.length === 0
          ? Effect.succeed(new Set<ItemDigest>())
          : db
              .select({ digest: feedItems.itemDigest })
              .from(feedItems)
              .where(
                and(
                  eq(feedItems.feedId, feedId),
                  inArray(feedItems.itemDigest, [...digests])
                )
              )
              .pipe(
                Effect.mapError(failed),
                Effect.map(
                  (rows) =>
                    new Set(
                      rows.map(({ digest }) => ItemDigestSchema.make(digest))
                    )
                )
              ),
      settle: (feedId, digest, outcome, reason, postId) =>
        db
          .update(feedItems)
          .set({
            outcome,
            postId: Option.getOrNull(postId),
            reason: Option.getOrNull(reason),
          })
          .where(
            and(eq(feedItems.feedId, feedId), eq(feedItems.itemDigest, digest))
          )
          .pipe(Effect.asVoid, Effect.mapError(failed)),
      settleClaim: (feedId, digest, outcome, reason) =>
        db
          .update(feedItems)
          .set({ outcome, reason: Option.getOrNull(reason) })
          .where(
            and(
              eq(feedItems.feedId, feedId),
              eq(feedItems.itemDigest, digest),
              eq(feedItems.outcome, "claimed")
            )
          )
          .returning({ digest: feedItems.itemDigest })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      skipPicture: (feedId, digest, reason) =>
        db
          .update(feedItems)
          .set({ pictureSkipped: reason })
          .where(
            and(eq(feedItems.feedId, feedId), eq(feedItems.itemDigest, digest))
          )
          .pipe(Effect.asVoid, Effect.mapError(failed)),
      update: (feed) =>
        db
          .update(feeds)
          .set({
            ...changing(feed),
            // Who acts for it changes when someone takes it over.
            startedBy: Option.getOrNull(feed.startedBy),
            startedVia: encodeOrigin(feed.startedVia),
          })
          .where(inWorkspace(feed.workspaceId, feed.id))
          .pipe(Effect.asVoid, Effect.mapError(failed)),
    });
  })
);
