import {
  and,
  asc,
  count,
  desc,
  eq,
  getColumns,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql as drizzleSql,
} from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { Digest } from "effect/crypto";
import { SqlClient } from "effect/sql";

import { EngagementStore } from "#engagement/application/ports/engagement-store.ts";
import type {
  DueChannel,
  Journalled,
  LatestFollowed,
  ReplyKey,
  ThreadCursor,
  ThreadFilter,
  ThreadSummary,
} from "#engagement/application/ports/engagement-store.ts";
import { Comment } from "#engagement/domain/comment.ts";
import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";
import { Reply } from "#engagement/domain/reply.ts";
import type { ReplyStatus } from "#engagement/domain/reply.ts";
import { Thread } from "#engagement/domain/thread.ts";
import type { ThreadCollection } from "#engagement/domain/thread.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { ChannelIdSchema, PostTargetIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { holdFollowingLock } from "./following-lock.ts";
import { comments, erasedWorkspaces, replies, threads } from "./schema.ts";

type ThreadRow = typeof threads.$inferSelect;

type CommentRow = typeof comments.$inferSelect;

type ReplyRow = typeof replies.$inferSelect;

// Rows are decoded with the domain's schemas, so a row the domain could
// not have written fails loudly instead of being trusted.
const decodeThread = Schema.decodeUnknownEffect(Thread);
const decodeComment = Schema.decodeUnknownEffect(Comment);
const decodeReply = Schema.decodeUnknownEffect(Reply);

const utc = (date: Date | null) =>
  date === null ? undefined : DateTime.fromDateUnsafe(date);

const instant = (date: Date | null) => Option.fromUndefinedOr(utc(date));

const date = (at: DateTime.Utc) => DateTime.toDateUtc(at);

const iso = (at: Option.Option<DateTime.Utc>) =>
  at.pipe(Option.map(DateTime.formatIso), Option.getOrNull);

const failed = (cause: unknown) => new DatabaseError({ cause });

const collectionOf = (row: ThreadRow) =>
  row.nextCollectionAt === null
    ? { _tag: "ended", at: utc(row.endedAt), reason: row.endReason }
    : { _tag: "collecting", nextAt: utc(row.nextCollectionAt) };

const threadOf = (row: ThreadRow) =>
  decodeThread({
    authorId: Option.fromNullOr(row.authorId),
    channelId: row.channelId,
    collection: collectionOf(row),
    id: row.id,
    lastCollectedAt: instant(row.lastCollectedAt),
    permalink: Option.fromNullOr(row.permalink),
    platformPostId: row.platformPostId,
    postId: row.postId,
    publishedAt: utc(row.publishedAt),
    targetId: row.targetId,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const summaryOf = (row: ThreadRow) =>
  threadOf(row).pipe(
    Effect.map((thread): ThreadSummary => ({
      comments: row.commentCount,
      lastCommentAt: instant(row.lastCommentAt),
      thread,
      unanswered: row.unansweredCount,
    }))
  );

const commentOf = (row: CommentRow) =>
  decodeComment({
    answeredAt: instant(row.answeredAt),
    author:
      row.authorPlatformId === null
        ? Option.none()
        : Option.some({
            displayName: Option.fromNullOr(row.authorDisplayName),
            handle: row.authorHandle ?? "",
            platformId: row.authorPlatformId,
          }),
    channelId: row.channelId,
    id: row.id,
    liked: row.liked,
    parentPlatformId: Option.fromNullOr(row.parentPlatformId),
    permalink: Option.fromNullOr(row.permalink),
    platformCommentId: row.platformCommentId,
    receivedAt: utc(row.receivedAt),
    state: row.state,
    text: row.text,
    threadId: row.threadId,
    workspaceId: row.workspaceId,
    writtenAt: utc(row.writtenAt),
  }).pipe(Effect.orDie);

const statusOf = (row: ReplyRow) => {
  if (row.status === "sending") {
    return { _tag: "sending", attemptedAt: instant(row.attemptedAt) };
  }

  if (row.status === "sent") {
    return {
      _tag: "sent",
      at: utc(row.settledAt),
      permalink: Option.fromNullOr(row.permalink),
      platformCommentId: Option.fromNullOr(row.platformCommentId),
    };
  }

  if (row.status === "withdrawn") {
    return { _tag: "withdrawn", at: utc(row.settledAt) };
  }

  return { _tag: row.status, at: utc(row.settledAt), reason: row.reason };
};

const replyOf = (row: ReplyRow) =>
  decodeReply({
    authorId: Option.fromNullOr(row.authorId),
    channelId: row.channelId,
    commentId: row.commentId,
    createdAt: utc(row.createdAt),
    id: row.id,
    status: statusOf(row),
    text: row.text,
    threadId: row.threadId,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const scheduleColumns = (collection: ThreadCollection) =>
  collection._tag === "collecting"
    ? {
        endReason: null,
        endedAt: null,
        nextCollectionAt: date(collection.nextAt),
      }
    : {
        endReason: collection.reason,
        endedAt: date(collection.at),
        nextCollectionAt: null,
      };

const threadRowOf = (thread: Thread) => ({
  ...scheduleColumns(thread.collection),
  authorId: Option.getOrNull(thread.authorId),
  channelId: thread.channelId,
  id: thread.id,
  lastCollectedAt: thread.lastCollectedAt.pipe(
    Option.map(date),
    Option.getOrNull
  ),
  permalink: Option.getOrNull(thread.permalink),
  platformPostId: thread.platformPostId,
  postId: thread.postId,
  publishedAt: date(thread.publishedAt),
  targetId: thread.targetId,
  workspaceId: thread.workspaceId,
});

// Threads' schedules as one JSON document, which Postgres reads as rows:
// one statement and one parameter, however many threads.
const schedulesOf = (saved: readonly Thread[]) =>
  JSON.stringify(
    saved.map((thread) => {
      const schedule = scheduleColumns(thread.collection);

      return {
        end_reason: schedule.endReason,
        ended_at: schedule.endedAt,
        id: thread.id,
        last_collected_at: iso(thread.lastCollectedAt),
        next_collection_at: schedule.nextCollectionAt,
      };
    })
  );

const commentsOfJson = (saved: readonly Comment[]) =>
  JSON.stringify(
    saved.map((comment) => ({
      answered_at: iso(comment.answeredAt),
      author_display_name: comment.author.pipe(
        Option.flatMap(({ displayName }) => displayName),
        Option.getOrNull
      ),
      author_handle: comment.author.pipe(
        Option.map(({ handle }) => handle),
        Option.getOrNull
      ),
      author_platform_id: comment.author.pipe(
        Option.map(({ platformId }) => platformId),
        Option.getOrNull
      ),
      channel_id: comment.channelId,
      id: comment.id,
      liked: comment.liked,
      parent_platform_id: Option.getOrNull(comment.parentPlatformId),
      permalink: Option.getOrNull(comment.permalink),
      platform_comment_id: comment.platformCommentId,
      received_at: DateTime.formatIso(comment.receivedAt),
      state: comment.state,
      text: comment.text,
      thread_id: comment.threadId,
      workspace_id: comment.workspaceId,
      written_at: DateTime.formatIso(comment.writtenAt),
    }))
  );

interface StatusColumns {
  readonly attemptedAt: string | null;
  readonly permalink: string | null;
  readonly platformCommentId: string | null;
  readonly reason: string | null;
  readonly settledAt: string | null;
}

const unsettled: StatusColumns = {
  attemptedAt: null,
  permalink: null,
  platformCommentId: null,
  reason: null,
  settledAt: null,
};

const statusColumns = (status: ReplyStatus): StatusColumns => {
  if (status._tag === "sending") {
    return {
      ...unsettled,
      attemptedAt: iso(status.attemptedAt),
    };
  }

  if (status._tag === "sent") {
    return {
      ...unsettled,
      permalink: Option.getOrNull(status.permalink),
      platformCommentId: Option.getOrNull(status.platformCommentId),
      settledAt: DateTime.formatIso(status.at),
    };
  }

  if (status._tag === "withdrawn") {
    return { ...unsettled, settledAt: DateTime.formatIso(status.at) };
  }

  return {
    ...unsettled,
    reason: status.reason,
    settledAt: DateTime.formatIso(status.at),
  };
};

const decodeDueChannels = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      channelId: ChannelIdSchema,
      dueSince: Schema.DateTimeUtcFromDate,
    })
  )
);

const decodeLatest = Schema.decodeUnknownEffect(
  Schema.Struct({
    publishedAt: Schema.DateTimeUtcFromDate,
    targetId: PostTargetIdSchema,
  })
);

const waiting = drizzleSql<boolean>`(${threads.unansweredCount} > 0)`;

// Threads after `cursor` in the list's order: those with comments waiting
// first, then by latest comment, then id, all descending.
const afterCursor = (cursor: ThreadCursor) =>
  drizzleSql`(${waiting}, ${threads.lastCommentAt}, ${threads.id}) < (${cursor.waiting}::boolean, ${DateTime.formatIso(cursor.lastCommentAt)}::timestamptz, ${cursor.threadId}::uuid)`;

const filtered = (workspaceId: WorkspaceId, filter: ThreadFilter) =>
  and(
    eq(threads.workspaceId, workspaceId),
    gt(threads.commentCount, 0),
    filter.unanswered ? gt(threads.unansweredCount, 0) : undefined,
    filter.channelId.pipe(
      Option.map((channelId) => eq(threads.channelId, channelId)),
      Option.getOrUndefined
    ),
    filter.postId.pipe(
      Option.map((postId) => eq(threads.postId, postId)),
      Option.getOrUndefined
    )
  );

/** The engagement context's rows, in its schema, through Drizzle. */
const encoder = new TextEncoder();

const decodeReplyId = Schema.decodeUnknownEffect(ReplyIdSchema);

export const DrizzleEngagementStore = Layer.effect(
  EngagementStore,
  Effect.gen(function* DrizzleEngagementStore() {
    const db = yield* Drizzle;
    const sql = yield* SqlClient.SqlClient;
    const digest = yield* Digest.Digest;

    // Under the following lock, which no erasure in progress holds then: a
    // workspace erased since its posts were listed is passed over.
    const followLocked = Effect.fn("EngagementStore.followLocked")(
      function* followLocked(followed: readonly Thread[]) {
        yield* holdFollowingLock(sql);

        const erased = yield* db
          .select({ workspaceId: erasedWorkspaces.workspaceId })
          .from(erasedWorkspaces)
          .where(
            inArray(erasedWorkspaces.workspaceId, [
              ...new Set(followed.map(({ workspaceId }) => workspaceId)),
            ])
          );

        const gone = new Set(erased.map(({ workspaceId }) => workspaceId));

        const kept = followed.filter(
          ({ workspaceId }) => !gone.has(workspaceId)
        );

        if (kept.length === 0) {
          return 0;
        }

        const inserted = yield* db
          .insert(threads)
          .values(kept.map(threadRowOf))
          .onConflictDoNothing()
          .returning({ id: threads.id });

        return inserted.length;
      }
    );

    const follow = Effect.fn("EngagementStore.follow")(function* follow(
      followed: readonly Thread[]
    ) {
      if (followed.length === 0) {
        return 0;
      }

      return yield* sql
        .withTransaction(followLocked(followed))
        .pipe(Effect.mapError(failed));
    });

    const latestFollowed = Effect.fn("EngagementStore.latestFollowed")(
      function* latestFollowed(before: DateTime.Utc) {
        const [row] = yield* db
          .select({
            publishedAt: threads.publishedAt,
            targetId: threads.targetId,
          })
          .from(threads)
          .where(lte(threads.publishedAt, date(before)))
          .orderBy(desc(threads.publishedAt), desc(threads.targetId))
          .limit(1)
          .pipe(Effect.mapError(failed));

        if (row === undefined) {
          return Option.none<LatestFollowed>();
        }

        const latest: LatestFollowed = yield* decodeLatest(row).pipe(
          Effect.orDie
        );

        return Option.some(latest);
      }
    );

    const dueChannels = Effect.fn("EngagementStore.dueChannels")(
      function* dueChannels(
        at: DateTime.Utc,
        limit: number,
        after: Option.Option<DueChannel>
      ) {
        const dueSince = drizzleSql<Date>`min(${threads.nextCollectionAt})`;

        const rows = yield* db
          .select({ channelId: threads.channelId, dueSince })
          .from(threads)
          .where(
            and(
              isNotNull(threads.nextCollectionAt),
              lte(threads.nextCollectionAt, date(at))
            )
          )
          .groupBy(threads.channelId)
          .having(
            after.pipe(
              Option.map(
                (last) =>
                  drizzleSql`(${dueSince}, ${threads.channelId}) > (${DateTime.formatIso(last.dueSince)}::timestamptz, ${last.channelId}::uuid)`
              ),
              Option.getOrUndefined
            )
          )
          .orderBy(asc(dueSince), asc(threads.channelId))
          .limit(limit)
          .pipe(Effect.mapError(failed));

        return yield* decodeDueChannels(rows).pipe(Effect.orDie);
      }
    );

    const dueOn = Effect.fn("EngagementStore.dueOn")(function* dueOn(
      at: DateTime.Utc,
      channelIds: readonly ChannelId[],
      perChannel: number
    ) {
      if (channelIds.length === 0) {
        return [];
      }

      // Each channel's due threads, numbered in the order they came due.
      const ranked = db
        .select({
          ...getColumns(threads),
          turn: drizzleSql<number>`row_number() OVER (PARTITION BY ${threads.channelId} ORDER BY ${threads.nextCollectionAt}, ${threads.id})`.as(
            "turn"
          ),
        })
        .from(threads)
        .where(
          and(
            isNotNull(threads.nextCollectionAt),
            lte(threads.nextCollectionAt, date(at)),
            // One array parameter, however many channels.
            drizzleSql`${threads.channelId} = ANY(string_to_array(${channelIds.join(",")}, ',')::uuid[])`
          )
        )
        .as("ranked");

      const rows = yield* db
        .select()
        .from(ranked)
        .where(lte(ranked.turn, perChannel))
        .orderBy(
          asc(ranked.channelId),
          asc(ranked.nextCollectionAt),
          asc(ranked.id)
        )
        .pipe(Effect.mapError(failed));

      return yield* Effect.all(rows.map(threadOf));
    });

    const countDue = Effect.fn("EngagementStore.countDue")(function* countDue(
      at: DateTime.Utc
    ) {
      const [row] = yield* db
        .select({ due: count() })
        .from(threads)
        .where(
          and(
            isNotNull(threads.nextCollectionAt),
            lte(threads.nextCollectionAt, date(at))
          )
        )
        .pipe(Effect.mapError(failed));

      return row?.due ?? 0;
    });

    const saveCollections = Effect.fn("EngagementStore.saveCollections")(
      function* saveCollections(saved: readonly Thread[]) {
        if (saved.length === 0) {
          return;
        }

        yield* sql`
          UPDATE engagement.threads AS thread
          SET next_collection_at = saved.next_collection_at,
              ended_at = saved.ended_at,
              end_reason = saved.end_reason,
              last_collected_at = saved.last_collected_at
          FROM jsonb_to_recordset(${schedulesOf(saved)}::jsonb) AS saved(
            id uuid,
            next_collection_at timestamptz,
            ended_at timestamptz,
            end_reason text,
            last_collected_at timestamptz
          )
          WHERE thread.id = saved.id
            -- A thread whose post was removed while it was read stays
            -- ended.
            AND thread.end_reason IS DISTINCT FROM 'removed'
        `.pipe(Effect.mapError(failed));
      }
    );

    const commentsOf = Effect.fn("EngagementStore.commentsOf")(
      function* commentsOf(threadId: string) {
        const rows = yield* db
          .select()
          .from(comments)
          .where(eq(comments.threadId, threadId))
          .orderBy(asc(comments.writtenAt), asc(comments.id))
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map(commentOf));
      }
    );

    // The comments first, for the threads still there (one erased with its
    // workspace meanwhile keeps none), then those threads' counts.
    const saveComments = Effect.fn("EngagementStore.saveComments")(
      function* saveComments(saved: readonly Comment[]) {
        if (saved.length === 0) {
          return;
        }

        const threadIds = [
          ...new Set(saved.map(({ threadId }) => threadId)),
        ].join(",");

        yield* sql
          .withTransaction(
            Effect.gen(function* saving() {
              yield* sql`
                INSERT INTO engagement.comments (
                  id, thread_id, workspace_id, channel_id, platform_comment_id,
                  parent_platform_id, author_platform_id, author_handle,
                  author_display_name, text, written_at, received_at, state,
                  answered_at, liked, permalink
                )
                SELECT saved.id, saved.thread_id, saved.workspace_id,
                       saved.channel_id, saved.platform_comment_id,
                       saved.parent_platform_id, saved.author_platform_id,
                       saved.author_handle, saved.author_display_name,
                       saved.text, saved.written_at, saved.received_at,
                       saved.state, saved.answered_at, saved.liked,
                       saved.permalink
                FROM jsonb_to_recordset(${commentsOfJson(saved)}::jsonb) AS saved(
                  id uuid,
                  thread_id uuid,
                  workspace_id uuid,
                  channel_id uuid,
                  platform_comment_id text,
                  parent_platform_id text,
                  author_platform_id text,
                  author_handle text,
                  author_display_name text,
                  text text,
                  written_at timestamptz,
                  received_at timestamptz,
                  state text,
                  answered_at timestamptz,
                  liked boolean,
                  permalink text
                )
                JOIN engagement.threads AS thread ON thread.id = saved.thread_id
                ON CONFLICT (thread_id, platform_comment_id) DO UPDATE
                SET parent_platform_id = excluded.parent_platform_id,
                    author_platform_id = excluded.author_platform_id,
                    author_handle = excluded.author_handle,
                    author_display_name = excluded.author_display_name,
                    text = excluded.text,
                    state = excluded.state,
                    answered_at = excluded.answered_at,
                    liked = excluded.liked,
                    permalink = excluded.permalink
              `;

              yield* sql`
                UPDATE engagement.threads AS thread
                SET comment_count = counted.shown,
                    unanswered_count = counted.waiting,
                    last_comment_at = counted.latest
                FROM (
                  SELECT thread_id,
                         count(*) FILTER (WHERE state <> 'deleted')::integer AS shown,
                         count(*) FILTER (WHERE state = 'new')::integer AS waiting,
                         max(written_at) FILTER (WHERE state <> 'deleted') AS latest
                  FROM engagement.comments
                  WHERE thread_id = ANY(string_to_array(${threadIds}, ',')::uuid[])
                  GROUP BY thread_id
                ) AS counted
                WHERE thread.id = counted.thread_id
              `;
            })
          )
          .pipe(Effect.mapError(failed));
      }
    );

    const thread = Effect.fn("EngagementStore.thread")(function* thread(
      threadId: string
    ) {
      const [row] = yield* db
        .select()
        .from(threads)
        .where(eq(threads.id, threadId))
        .limit(1)
        .pipe(Effect.mapError(failed));

      return row === undefined
        ? Option.none<ThreadSummary>()
        : Option.some(yield* summaryOf(row));
    });

    const listThreads = Effect.fn("EngagementStore.listThreads")(
      function* listThreads(
        workspaceId: WorkspaceId,
        filter: ThreadFilter,
        page: {
          readonly after: Option.Option<ThreadCursor>;
          readonly limit: number;
        }
      ) {
        const rows = yield* db
          .select()
          .from(threads)
          .where(
            and(
              filtered(workspaceId, filter),
              page.after.pipe(Option.map(afterCursor), Option.getOrUndefined)
            )
          )
          .orderBy(desc(waiting), desc(threads.lastCommentAt), desc(threads.id))
          .limit(page.limit)
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map(summaryOf));
      }
    );

    const comment = Effect.fn("EngagementStore.comment")(function* comment(
      commentId: string
    ) {
      const [row] = yield* db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1)
        .pipe(Effect.mapError(failed));

      return row === undefined
        ? Option.none<Comment>()
        : Option.some(yield* commentOf(row));
    });

    const repliesOf = Effect.fn("EngagementStore.repliesOf")(
      function* repliesOf(threadId: string) {
        const rows = yield* db
          .select()
          .from(replies)
          .where(eq(replies.threadId, threadId))
          .orderBy(asc(replies.id))
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map(replyOf));
      }
    );

    const reply = Effect.fn("EngagementStore.reply")(function* reply(
      replyId: string
    ) {
      const [row] = yield* db
        .select()
        .from(replies)
        .where(eq(replies.id, replyId))
        .limit(1)
        .pipe(Effect.mapError(failed));

      return row === undefined
        ? Option.none<Reply>()
        : Option.some(yield* replyOf(row));
    });

    const strandedReplies = Effect.fn("EngagementStore.strandedReplies")(
      function* strandedReplies(
        writtenBefore: DateTime.Utc,
        calledBefore: DateTime.Utc,
        limit: number
      ) {
        const rows = yield* db
          .select()
          .from(replies)
          .where(
            and(
              eq(replies.status, "sending"),
              lte(replies.createdAt, DateTime.toDateUtc(writtenBefore)),
              or(
                isNull(replies.callClaimedAt),
                lte(replies.callClaimedAt, DateTime.toDateUtc(calledBefore))
              )
            )
          )
          .orderBy(asc(replies.createdAt), asc(replies.id))
          .limit(limit)
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map(replyOf));
      }
    );

    const hashOf = (text: string) =>
      digest
        .digestHex(Digest.sha256, encoder.encode(text))
        .pipe(Effect.mapError(failed));

    // The reply a key made in the workspace, compared with the request
    // that comes with the key now.
    const madeUnder = Effect.fn("EngagementStore.madeUnder")(
      function* madeUnder(saved: Reply, keyDigest: string) {
        const [row] = yield* db
          .select()
          .from(replies)
          .where(
            and(
              eq(replies.workspaceId, saved.workspaceId),
              eq(replies.keyDigest, keyDigest)
            )
          )
          .limit(1)
          .pipe(Effect.mapError(failed));

        if (row === undefined) {
          return Option.none<Journalled>();
        }

        const earlier = yield* replyOf(row);

        const same =
          earlier.commentId === saved.commentId && earlier.text === saved.text;

        return Option.some<Journalled>(
          same ? { _tag: "replayed", reply: earlier } : { _tag: "keyReused" }
        );
      }
    );

    // Insert only, and only when no unique index refuses it: one reply on
    // its way or unconfirmed a comment, one reply a key. A reply whose
    // comment went, with its thread or its workspace, is dropped: the
    // insert selects its comment, and finds none.
    const journalReply = Effect.fn("EngagementStore.journalReply")(
      function* journalReply(saved: Reply, key: Option.Option<ReplyKey>) {
        const keyDigest = Option.isSome(key)
          ? yield* hashOf(key.value.key)
          : null;

        if (Option.isSome(key) && keyDigest !== null) {
          // A use of the key older than its lifetime is forgotten.
          yield* sql`
            UPDATE engagement.replies SET key_digest = NULL
            WHERE workspace_id = ${saved.workspaceId}::uuid
              AND key_digest = ${keyDigest}
              AND created_at <= ${DateTime.formatIso(key.value.since)}::timestamptz
          `.pipe(Effect.mapError(failed));

          const made = yield* madeUnder(saved, keyDigest);

          if (Option.isSome(made)) {
            return made.value;
          }
        }

        const status = statusColumns(saved.status);

        const inserted = yield* sql`
          INSERT INTO engagement.replies (
            id, thread_id, comment_id, workspace_id, channel_id, author_id,
            text, created_at, status, attempted_at, settled_at, reason,
            platform_comment_id, permalink, key_digest
          )
          SELECT ${saved.id}::uuid, comment.thread_id, comment.id,
                 comment.workspace_id, comment.channel_id,
                 ${Option.getOrNull(saved.authorId)}::uuid, ${saved.text},
                 ${DateTime.formatIso(saved.createdAt)}::timestamptz,
                 ${saved.status._tag}, ${status.attemptedAt}::timestamptz,
                 ${status.settledAt}::timestamptz, ${status.reason}::text,
                 ${status.platformCommentId}::text, ${status.permalink}::text,
                 ${keyDigest}::text
          FROM engagement.comments AS comment
          WHERE comment.id = ${saved.commentId}::uuid
          ON CONFLICT DO NOTHING
          RETURNING id
        `.pipe(Effect.mapError(failed));

        if (inserted.length === 1) {
          const journalled: Journalled = { _tag: "journalled" };

          return journalled;
        }

        // Refused: by the key, used by a request that came just before,
        // by a reply to the comment that is not settled, or the comment
        // is gone.
        if (keyDigest !== null) {
          const made = yield* madeUnder(saved, keyDigest);

          if (Option.isSome(made)) {
            return made.value;
          }
        }

        const [pending] = yield* db
          .select({ id: replies.id })
          .from(replies)
          .where(
            and(
              eq(replies.commentId, saved.commentId),
              inArray(replies.status, ["sending", "unconfirmed"])
            )
          )
          .limit(1)
          .pipe(Effect.mapError(failed));

        const refused: Journalled =
          pending === undefined
            ? { _tag: "dropped" }
            : {
                _tag: "pending",
                replyId: yield* decodeReplyId(pending.id).pipe(Effect.orDie),
              };

        return refused;
      }
    );

    // Only from the status it was read in, attempt included.
    const advanceReply = Effect.fn("EngagementStore.advanceReply")(
      function* advanceReply(next: Reply, from: Reply) {
        const status = statusColumns(next.status);
        const before = statusColumns(from.status);

        const moved = yield* sql`
          UPDATE engagement.replies
          SET status = ${next.status._tag},
              attempted_at = ${status.attemptedAt}::timestamptz,
              settled_at = ${status.settledAt}::timestamptz,
              reason = ${status.reason}::text,
              platform_comment_id = ${status.platformCommentId}::text,
              permalink = ${status.permalink}::text
          WHERE id = ${next.id}::uuid
            AND status = ${from.status._tag}
            AND attempted_at IS NOT DISTINCT FROM ${before.attemptedAt}::timestamptz
          RETURNING id
        `.pipe(Effect.mapError(failed));

        return moved.length === 1;
      }
    );

    const claimCall = Effect.fn("EngagementStore.claimCall")(
      function* claimCall(replyId: string, at: DateTime.Utc) {
        const claimed = yield* sql`
          UPDATE engagement.replies
          SET call_claimed_at = ${DateTime.formatIso(at)}::timestamptz
          WHERE id = ${replyId}::uuid AND status = 'sending'
          RETURNING id
        `.pipe(Effect.mapError(failed));

        return claimed.length === 1;
      }
    );

    const purge = Effect.fn("EngagementStore.purge")(function* purge(
      endedBefore: DateTime.Utc,
      limit: number
    ) {
      const expired = db
        .select({ id: threads.id })
        .from(threads)
        .where(
          and(
            isNotNull(threads.endedAt),
            lte(threads.endedAt, date(endedBefore))
          )
        )
        .orderBy(asc(threads.endedAt))
        .limit(limit);

      const deleted = yield* db
        .delete(threads)
        .where(inArray(threads.id, expired))
        .returning({ id: threads.id })
        .pipe(Effect.mapError(failed));

      return deleted.length;
    });

    const lockThread = (threadId: string) =>
      sql`
        SELECT 1 FROM engagement.threads WHERE id = ${threadId} FOR UPDATE
      `.pipe(Effect.asVoid, Effect.mapError(failed));

    return EngagementStore.of({
      advanceReply,
      claimCall,
      comment,
      commentsOf,
      countDue,
      dueChannels,
      dueOn,
      follow,
      journalReply,
      latestFollowed,
      listThreads,
      lockThread,
      purge,
      repliesOf,
      reply,
      saveCollections,
      saveComments,
      strandedReplies,
      thread,
    });
  })
).pipe(Layer.provide(Digest.layerWebCrypto));
