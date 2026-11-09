import { and, asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer, Match, Option, Schema } from "effect";

import { PostRepository } from "#publishing/application/post-repository.ts";
import type { StoredPost } from "#publishing/application/post-repository.ts";
import { ExecutionIdSchema } from "#publishing/application/publication-scheduler.ts";
import type { ExecutionId } from "#publishing/application/publication-scheduler.ts";
import type { PostStatus } from "#publishing/domain/post-status.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { PostTargetStatus } from "#publishing/domain/post-target-status.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import { Post } from "#publishing/domain/post.ts";
import type { Schedule } from "#publishing/domain/schedule.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { posts, postTargets } from "./schema.ts";

type PostRow = typeof posts.$inferSelect;

type TargetRow = typeof postTargets.$inferSelect;

// Rows are decoded with the domain's schemas, so a row the domain could not
// have written (a bug, or a hand edit) fails loudly instead of being trusted.
const decodePost = Schema.decodeUnknownEffect(Post);

const decodeTarget = Schema.decodeUnknownEffect(PostTarget);

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
      id: row.id,
      scheduleRevision: row.scheduleRevision,
      status: postStatusOf(row),
      workspaceId: row.workspaceId,
    }),
  }).pipe(Effect.orDie);

const targetStatusOf = (row: TargetRow) => ({
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
});

const toTarget = (row: TargetRow) =>
  decodeTarget({
    channelId: row.channelId,
    id: row.id,
    postId: row.postId,
    round: row.round,
    status: targetStatusOf(row),
  }).pipe(Effect.orDie);

const scheduleColumns = (schedule: Option.Option<Schedule>) =>
  Option.match(schedule, {
    onNone: () => ({ scheduleZone: null, scheduledAt: null }),
    onSome: ({ at, timeZone }) => ({
      scheduleZone: timeZone,
      scheduledAt: date(at),
    }),
  });

// Every column a status decides, so a write leaves no stale value behind.
const postColumns = (post: Post) => {
  const { status } = post;

  const cleared = {
    cancelledAt: null,
    finishedAt: null,
    outcome: null,
    scheduleRevision: post.scheduleRevision,
    startedAt: null,
    status: status._tag,
    ...scheduleColumns(Option.none()),
  };

  return Match.valueTags(status, {
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
    permalink: null,
    platformPostId: null,
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
    published: ({ permalink, platformPostId, publishedAt }) => ({
      ...cleared,
      finishedAt: date(publishedAt),
      permalink: Option.getOrNull(permalink),
      platformPostId: Option.getOrNull(platformPostId),
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

const statusName = (status: PostStatus | PostTargetStatus) => status._tag;

/** Posts and targets in the publishing schema, through Drizzle. */
export const DrizzlePostRepository = Layer.effect(
  PostRepository,
  Effect.gen(function* DrizzlePostRepository() {
    const db = yield* Drizzle;

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

    return PostRepository.of({
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
            id: post.id,
            workspaceId: post.workspaceId,
          });

          if (targets.length > 0) {
            yield* db.insert(postTargets).values(
              targets.map((target) => ({
                ...targetColumns(target.status),
                channelId: target.channelId,
                id: target.id,
                postId: target.postId,
                round: target.round,
              }))
            );
          }
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
      targets: (postId) =>
        selectTargets(postId).pipe(
          Effect.mapError(failed),
          Effect.flatMap(Effect.forEach(toTarget))
        ),
      update: (next, current) =>
        db
          .update(posts)
          .set(postColumns(next))
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
        db
          .update(postTargets)
          .set({ ...targetColumns(next.status), round: next.round })
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
          ),
    });
  })
);
