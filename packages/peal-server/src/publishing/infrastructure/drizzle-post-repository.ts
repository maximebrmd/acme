import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { DateTime, Effect, Layer, Match, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import type { PostPosition } from "#publishing/application/post-listing.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import type {
  PostWithTargets,
  StoredPost,
} from "#publishing/application/post-repository.ts";
import { ExecutionIdSchema } from "#publishing/application/publication-scheduler.ts";
import type { ExecutionId } from "#publishing/application/publication-scheduler.ts";
import { LivePartSchema } from "#publishing/domain/live-part.ts";
import type { LivePart } from "#publishing/domain/live-part.ts";
import type { PostStatus } from "#publishing/domain/post-status.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { PostTargetStatus } from "#publishing/domain/post-target-status.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import { Post } from "#publishing/domain/post.ts";
import type { Schedule } from "#publishing/domain/schedule.ts";
import { TargetOptionsSchema } from "#publishing/domain/target-options.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import type { MediaAssetId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { pageConditions, pageOrder } from "./post-search-query.ts";
import { posts, postTargets } from "./schema.ts";

type PostRow = typeof posts.$inferSelect;

type TargetRow = typeof postTargets.$inferSelect;

// Rows are decoded with the domain's schemas, so a row the domain could not
// have written (a bug, or a hand edit) fails loudly instead of being trusted.
const decodePost = Schema.decodeUnknownEffect(Post);

const decodeTarget = Schema.decodeUnknownEffect(PostTarget);

// A target's options as their column holds them: JSON, tagged by platform.
const encodeOptions = Schema.encodeSync(TargetOptionsSchema);

const decodeExecution = Schema.decodeUnknownEffect(
  Schema.OptionFromNullOr(ExecutionIdSchema)
);

const utc = (date: Date | null) =>
  date === null ? undefined : DateTime.fromDateUnsafe(date);

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const scheduleOf = (row: PostRow) =>
  row.scheduledAt === null
    ? undefined
    : { at: utc(row.scheduledAt), timeZone: row.scheduleZone };

const postStatusOf = (row: PostRow) => {
  const schedule = scheduleOf(row);

  return {
    _tag: row.status,
    cancelledAt: utc(row.cancelledAt),
    finishedAt: utc(row.finishedAt),
    outcome: row.outcome ?? undefined,
    // A cancelled post keeps its time as an Option, as a draft had none.
    schedule:
      row.status === "cancelled" ? Option.fromUndefinedOr(schedule) : schedule,
    startedAt: utc(row.startedAt),
  };
};

const toStored = (row: PostRow) =>
  Effect.all({
    execution: decodeExecution(row.executionId),
    post: decodePost({
      attribution: {
        createdVia: Option.fromNullOr(row.createdVia),
        scheduledBy: Option.fromNullOr(row.scheduledBy),
        scheduledVia: Option.fromNullOr(row.scheduledVia),
      },
      authorId: Option.fromNullOr(row.authorId),
      content: {
        followUps: row.followUps,
        media: row.media,
        overrides: row.textOverrides,
        text: row.text,
      },
      id: row.id,
      queueId: Option.fromNullOr(row.queueId),
      scheduleRevision: row.scheduleRevision,
      status: postStatusOf(row),
      tagIds: row.tagIds,
      workspaceId: row.workspaceId,
    }),
  }).pipe(Effect.orDie);

const targetStatusOf = (row: TargetRow) => {
  const status = {
    _tag: row.status,
    attemptedAt: utc(row.startedAt),
    cancelRequested: row.cancelRequested,
    cancelledAt: utc(row.finishedAt),
    code: Option.fromNullOr(row.failureCode),
    failedAt: utc(row.finishedAt),
    permalink: Option.fromNullOr(row.permalink),
    platformPostId: Option.fromNullOr(row.platformPostId),
    publishedAt: utc(row.finishedAt),
    reason: row.failureReason ?? row.unconfirmedReason ?? undefined,
    startedAt: utc(row.startedAt),
  };

  const kept = row.keptPrivate ? { ...status, keptPrivate: true } : status;

  return row.removedAt === null
    ? kept
    : { ...kept, removedAt: utc(row.removedAt) };
};

// The parts that went live, as their column holds them: JSON.
const LivePartsJson = Schema.toCodecJson(Schema.Array(LivePartSchema));

const decodeLiveParts = Schema.decodeUnknownEffect(LivePartsJson);

const encodeLiveParts = Schema.encodeSync(LivePartsJson);

const decodeTargetRow = (row: TargetRow, liveParts: readonly LivePart[]) =>
  decodeTarget({
    channelId: row.channelId,
    id: row.id,
    liveParts,
    options: Option.fromNullOr(row.options),
    postId: row.postId,
    round: row.round,
    status: targetStatusOf(row),
  });

const toTarget = (row: TargetRow) =>
  decodeLiveParts(row.liveParts).pipe(
    Effect.flatMap((liveParts) => decodeTargetRow(row, liveParts)),
    Effect.orDie
  );

const scheduleColumns = (schedule: Option.Option<Schedule>) =>
  Option.match(schedule, {
    onNone: () => ({ scheduleZone: null, scheduledAt: null }),
    onSome: ({ at, timeZone }) => ({
      scheduleZone: timeZone,
      scheduledAt: date(at),
    }),
  });

// What the post says, as its columns hold it.
const contentColumns = ({ content }: Post) => ({
  followUps: content.followUps.map((part) => ({
    delaySeconds: part.delaySeconds,
    media: part.media.map(({ altText, mediaId }) => ({ altText, mediaId })),
    overrides: part.overrides.map(({ channelId, text }) => ({
      channelId,
      text,
    })),
    text: part.text,
  })),
  media: content.media.map(({ altText, mediaId }) => ({ altText, mediaId })),
  text: content.text,
  textOverrides: content.overrides.map(({ channelId, text }) => ({
    channelId,
    text,
  })),
});

// How the post was created and scheduled, as its columns hold it.
const attributionColumns = ({ attribution }: Post) => ({
  createdVia: Option.getOrNull(attribution.createdVia),
  scheduledBy: Option.getOrNull(attribution.scheduledBy),
  scheduledVia: Option.getOrNull(attribution.scheduledVia),
});

// Every column a status decides, so a write leaves no stale value behind.
const postColumns = (post: Post) => {
  const { status } = post;

  const cleared = {
    ...contentColumns(post),
    ...attributionColumns(post),
    cancelledAt: null,
    finishedAt: null,
    outcome: null,
    scheduleRevision: post.scheduleRevision,
    startedAt: null,
    status: status._tag,
    ...scheduleColumns(Option.none()),
  };

  return Match.valueTags(status, {
    awaitingApproval: ({ schedule }) => ({
      ...cleared,
      ...scheduleColumns(Option.some(schedule)),
    }),
    cancelled: ({ cancelledAt, schedule }) => ({
      ...cleared,
      ...scheduleColumns(schedule),
      cancelledAt: date(cancelledAt),
    }),
    draft: () => cleared,
    finished: ({ finishedAt, outcome, schedule, startedAt }) => ({
      ...cleared,
      ...scheduleColumns(Option.some(schedule)),
      finishedAt: date(finishedAt),
      outcome,
      startedAt: date(startedAt),
    }),
    publishing: ({ schedule, startedAt }) => ({
      ...cleared,
      ...scheduleColumns(Option.some(schedule)),
      startedAt: date(startedAt),
    }),
    scheduled: ({ schedule }) => ({
      ...cleared,
      ...scheduleColumns(Option.some(schedule)),
    }),
  });
};

const targetColumns = (status: PostTargetStatus) => {
  const cleared = {
    cancelRequested: false,
    failureCode: null,
    failureReason: null,
    finishedAt: null,
    keptPrivate: false,
    listedAt: null,
    permalink: null,
    platformPostId: null,
    removedAt: null,
    startedAt: null,
    status: status._tag,
    unconfirmedReason: null,
  };

  return Match.valueTags(status, {
    cancelled: ({ cancelledAt }) => ({
      ...cleared,
      finishedAt: date(cancelledAt),
    }),
    failed: ({ code, failedAt, reason }) => ({
      ...cleared,
      failureCode: Option.getOrNull(code),
      failureReason: reason,
      finishedAt: date(failedAt),
    }),
    pending: () => cleared,
    published: ({
      keptPrivate,
      permalink,
      platformPostId,
      publishedAt,
      removedAt,
    }) => ({
      ...cleared,
      finishedAt: date(publishedAt),
      keptPrivate: keptPrivate === true,
      // Listed for the contexts that follow publications from when it
      // went live; `listedFrom` says when a member confirmed it instead.
      listedAt: date(publishedAt),
      permalink: Option.getOrNull(permalink),
      platformPostId: Option.getOrNull(platformPostId),
      removedAt: removedAt === undefined ? null : date(removedAt),
    }),
    publishing: ({ cancelRequested, startedAt }) => ({
      ...cleared,
      cancelRequested,
      startedAt: date(startedAt),
    }),
    unconfirmed: ({ attemptedAt, reason }) => ({
      ...cleared,
      startedAt: date(attemptedAt),
      unconfirmedReason: reason,
    }),
  });
};

/**
 * When a target that becomes `next` is listed among the publications from:
 * when it went live, but for one a member confirmed by hand, which went
 * live when it was attempted, hours or days before anyone knew. Those that
 * follow publications (analytics, the inbox) read on from the latest they
 * know, so such a target is listed from `now`, when Peal learnt of it.
 */
const listedFrom = (
  next: PostTarget,
  current: PostTarget,
  now: DateTime.Utc
): Date | null => {
  if (next.status._tag !== "published") {
    return null;
  }

  return date(
    current.status._tag === "unconfirmed"
      ? DateTime.max(next.status.publishedAt, now)
      : next.status.publishedAt
  );
};

const targetFrom = (rows: readonly TargetRow[]) => {
  const [row] = rows;

  return row === undefined
    ? Effect.succeed(Option.none<PostTarget>())
    : toTarget(row).pipe(Effect.map(Option.some));
};

const storedFrom = (rows: readonly PostRow[]) => {
  const [row] = rows;

  return row === undefined
    ? Effect.succeed(Option.none<StoredPost>())
    : toStored(row).pipe(Effect.map(Option.some));
};

const failed = (cause: unknown) => new DatabaseError({ cause });

const optionsColumn = (target: PostTarget) =>
  target.options.pipe(Option.map(encodeOptions), Option.getOrNull);

const targetRow = (target: PostTarget) => ({
  ...targetColumns(target.status),
  channelId: target.channelId,
  id: target.id,
  liveParts: encodeLiveParts(target.liveParts),
  options: optionsColumn(target),
  postId: target.postId,
  round: target.round,
});

// Each post with its targets, in the order the posts came.
const withTargets = (
  postRows: readonly PostRow[],
  targetRows: readonly TargetRow[]
) =>
  Effect.all(
    postRows.map((row) =>
      Effect.all({
        post: toStored(row).pipe(Effect.map(({ post }) => post)),
        targets: Effect.all(
          targetRows.flatMap((target) =>
            target.postId === row.id ? [toTarget(target)] : []
          )
        ),
      })
    )
  );

const statusName = (status: PostStatus | PostTargetStatus) => status._tag;

// What a post's `media` column holds for one attachment, and its
// `follow_ups` for a part that shows it, to find the posts that show it in
// any part.
const showingMedia = (mediaId: MediaAssetId) =>
  or(
    sql`${posts.media} @> ${JSON.stringify([{ mediaId }])}::jsonb`,
    sql`${posts.followUps} @> ${JSON.stringify([{ media: [{ mediaId }] }])}::jsonb`
  );

/** Posts and targets in the publishing schema, through Drizzle. */
export const DrizzlePostRepository = Layer.effect(
  PostRepository,
  Effect.gen(function* DrizzlePostRepository() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    const selectPost = (postId: PostId) =>
      db.select().from(posts).where(eq(posts.id, postId));

    const selectTargets = (postId: PostId) =>
      db
        .select()
        .from(postTargets)
        .where(eq(postTargets.postId, postId))
        .orderBy(asc(postTargets.id));

    const selectTarget = (targetId: PostTargetId) =>
      db.select().from(postTargets).where(eq(postTargets.id, targetId));

    // The posts with their targets, in the order the posts came.
    const withTargetsOf = (postRows: readonly PostRow[]) =>
      Effect.gen(function* postsWithTargets() {
        if (postRows.length === 0) {
          const none: readonly PostWithTargets[] = [];

          return none;
        }

        const targetRows = yield* db
          .select()
          .from(postTargets)
          .where(
            inArray(
              postTargets.postId,
              postRows.map(({ id }) => id)
            )
          )
          .orderBy(asc(postTargets.id));

        return yield* withTargets(postRows, targetRows);
      });

    return PostRepository.of({
      channelsUsed: (workspaceId) =>
        db
          .selectDistinct({ channelId: postTargets.channelId })
          .from(postTargets)
          .innerJoin(posts, eq(posts.id, postTargets.postId))
          .where(eq(posts.workspaceId, workspaceId))
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) =>
              rows.map(({ channelId }) => ChannelIdSchema.make(channelId))
            )
          ),
      // A transaction's advisory lock, in the two-key form: the first key
      // names what is counted, the second the workspace and the month.
      claimMonth: (workspaceId, { from }) =>
        client`SELECT pg_advisory_xact_lock(hashtext('peal-server/publishing/monthly-posts'), hashtext(${`${workspaceId}:${DateTime.formatIso(from)}`}))`.pipe(
          Effect.mapError(failed),
          Effect.asVoid,
          Effect.withSpan("PostRepository.claimMonth")
        ),
      countGoingOut: (workspaceId, { from, to }, except) =>
        db
          .select({ going: count() })
          .from(posts)
          .where(
            and(
              eq(posts.workspaceId, workspaceId),
              gte(posts.scheduledAt, date(from)),
              lt(posts.scheduledAt, date(to)),
              notInArray(posts.status, ["draft", "cancelled"]),
              ...except.pipe(
                Option.map((postId) => ne(posts.id, postId)),
                Option.toArray
              )
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows[0]?.going ?? 0),
            Effect.withSpan("PostRepository.countGoingOut")
          ),
      countGoingOutBefore: (workspaceId, { from, to }, { at, postId }) =>
        db
          .select({ going: count() })
          .from(posts)
          .where(
            and(
              eq(posts.workspaceId, workspaceId),
              gte(posts.scheduledAt, date(from)),
              lt(posts.scheduledAt, date(to)),
              notInArray(posts.status, ["draft", "cancelled"]),
              or(
                lt(posts.scheduledAt, date(at)),
                and(eq(posts.scheduledAt, date(at)), lt(posts.id, postId))
              )
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows[0]?.going ?? 0),
            Effect.withSpan("PostRepository.countGoingOutBefore")
          ),
      find: (postId) =>
        selectPost(postId).pipe(
          Effect.mapError(failed),
          Effect.flatMap(storedFrom)
        ),
      findTarget: (targetId) =>
        selectTarget(targetId).pipe(
          Effect.mapError(failed),
          Effect.flatMap(targetFrom)
        ),
      insert: (post, targets) =>
        Effect.gen(function* insert() {
          yield* db.insert(posts).values({
            ...postColumns(post),
            authorId: Option.getOrNull(post.authorId),
            id: post.id,
            queueId: Option.getOrNull(post.queueId),
            tagIds: [...post.tagIds],
            workspaceId: post.workspaceId,
          });

          if (targets.length > 0) {
            yield* db.insert(postTargets).values(targets.map(targetRow));
          }
        }).pipe(Effect.mapError(failed)),
      listDrafts: (workspaceId, { after, limit }) =>
        Effect.gen(function* listDrafts() {
          // One more than asked tells whether another page follows.
          const postRows = yield* db
            .select()
            .from(posts)
            .where(
              and(
                eq(posts.workspaceId, workspaceId),
                eq(posts.status, "draft"),
                after.pipe(
                  Option.map((last) => lt(posts.id, last)),
                  Option.getOrUndefined
                )
              )
            )
            .orderBy(desc(posts.id))
            .limit(limit + 1);

          const page = postRows.slice(0, limit);
          const items = yield* withTargetsOf(page);
          const last = items.at(-1);

          return {
            items,
            next:
              postRows.length > limit && last !== undefined
                ? Option.some(last.post.id)
                : Option.none<PostId>(),
          };
        }).pipe(Effect.mapError(failed)),
      listScheduled: (
        workspaceId: WorkspaceId,
        from: DateTime.Utc,
        to: DateTime.Utc
      ) =>
        Effect.gen(function* listScheduled() {
          const postRows = yield* db
            .select()
            .from(posts)
            .where(
              and(
                eq(posts.workspaceId, workspaceId),
                gte(posts.scheduledAt, date(from)),
                lt(posts.scheduledAt, date(to))
              )
            )
            .orderBy(asc(posts.scheduledAt), asc(posts.id));

          return yield* withTargetsOf(postRows);
        }).pipe(Effect.mapError(failed)),
      lock: (postId) =>
        selectPost(postId)
          .for("update")
          .pipe(Effect.mapError(failed), Effect.flatMap(storedFrom)),
      lockTarget: (targetId) =>
        selectTarget(targetId)
          .for("update")
          .pipe(Effect.mapError(failed), Effect.flatMap(targetFrom)),
      lockTargets: (postId) =>
        selectTargets(postId)
          .for("update")
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toTarget))
          ),
      markRemoved: (targetId, removedAt) =>
        db
          .update(postTargets)
          .set({ removedAt: date(removedAt) })
          .where(
            and(
              eq(postTargets.id, targetId),
              eq(postTargets.status, "published"),
              isNull(postTargets.removedAt)
            )
          )
          .returning({ id: postTargets.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length === 1)
          ),
      remove: (postId) =>
        db
          .delete(posts)
          .where(eq(posts.id, postId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      search: (page) =>
        Effect.gen(function* search() {
          // No channel to be on, or no tag to have: no post, and no query.
          if (
            Option.exists(page.filter.channelIds, (ids) => ids.length === 0) ||
            Option.exists(page.filter.tagIds, (ids) => ids.length === 0)
          ) {
            return { items: [], next: Option.none() };
          }

          // One more than asked tells whether another page follows.
          const postRows = yield* db
            .select()
            .from(posts)
            .where(pageConditions(page))
            .orderBy(...pageOrder(page.sort))
            .limit(page.limit + 1);

          const rows = postRows.slice(0, page.limit);
          const last = rows.at(-1);

          return {
            items: yield* withTargetsOf(rows),
            next:
              postRows.length > page.limit && last !== undefined
                ? Option.some<PostPosition>({
                    postId: PostIdSchema.make(last.id),
                    scheduledAt:
                      last.scheduledAt === null
                        ? null
                        : DateTime.makeUnsafe(last.scheduledAt),
                    sort: page.sort,
                  })
                : Option.none(),
          };
        }).pipe(
          Effect.mapError(failed),
          Effect.withSpan("PostRepository.search")
        ),
      setExecution: (post, executionId: ExecutionId) =>
        db
          .update(posts)
          .set({ executionId })
          .where(
            and(
              eq(posts.id, post.id),
              eq(posts.scheduleRevision, post.scheduleRevision)
            )
          )
          .returning({ id: posts.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length === 1)
          ),
      setTags: (postId, tagIds) =>
        db
          .update(posts)
          .set({ tagIds: [...tagIds] })
          .where(eq(posts.id, postId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      setTargets: (postId, targets) =>
        Effect.gen(function* setTargets() {
          const kept = targets.map(({ id }) => id);

          yield* db
            .delete(postTargets)
            .where(
              and(
                eq(postTargets.postId, postId),
                kept.length === 0 ? undefined : notInArray(postTargets.id, kept)
              )
            );

          // A target the post had keeps its status and round, and takes
          // the options it is given.
          if (targets.length > 0) {
            yield* db
              .insert(postTargets)
              .values(targets.map(targetRow))
              .onConflictDoUpdate({
                set: { options: sql`excluded.options` },
                target: postTargets.id,
              });
          }
        }).pipe(Effect.mapError(failed)),
      showing: (workspaceId, mediaId, statuses) =>
        db
          .select()
          .from(posts)
          .where(
            and(
              eq(posts.workspaceId, workspaceId),
              inArray(posts.status, [...statuses]),
              showingMedia(mediaId)
            )
          )
          .orderBy(asc(posts.id))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(
              Effect.forEach((row) =>
                toStored(row).pipe(Effect.map(({ post }) => post))
              )
            )
          ),
      targets: (postId) =>
        selectTargets(postId).pipe(
          Effect.mapError(failed),
          Effect.flatMap(Effect.forEach(toTarget))
        ),
      update: (next, current) =>
        db
          .update(posts)
          .set(
            // The queue is written only when one placed it anew: a write
            // that settles the post never names a queue deleted meanwhile.
            Option.getOrNull(next.queueId) === Option.getOrNull(current.queueId)
              ? postColumns(next)
              : {
                  ...postColumns(next),
                  queueId: Option.getOrNull(next.queueId),
                }
          )
          .where(
            and(
              eq(posts.id, current.id),
              eq(posts.scheduleRevision, current.scheduleRevision),
              eq(posts.status, statusName(current.status))
            )
          )
          .returning({ id: posts.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length === 1)
          ),
      updateTarget: (next, current) =>
        DateTime.now.pipe(
          Effect.flatMap((now) =>
            db
              .update(postTargets)
              .set({
                ...targetColumns(next.status),
                listedAt: listedFrom(next, current, now),
                liveParts: encodeLiveParts(next.liveParts),
                round: next.round,
              })
              .where(
                and(
                  eq(postTargets.id, current.id),
                  eq(postTargets.round, current.round),
                  eq(postTargets.status, statusName(current.status))
                )
              )
              .returning({ id: postTargets.id })
              .pipe(
                Effect.mapError(failed),
                Effect.map((rows) => rows.length === 1)
              )
          )
        ),
    });
  })
);
