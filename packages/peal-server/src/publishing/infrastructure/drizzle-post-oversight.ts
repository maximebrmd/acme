import { and, asc, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { PostOversight } from "#publishing/application/post-oversight.ts";
import type { TargetTrouble } from "#publishing/application/post-oversight.ts";
import { FailureReasonSchema } from "#publishing/domain/post-target-status.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { UnconfirmedReasonSchema } from "#shared/domain/publish-result.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { posts, postTargets } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const utc = (date: Date): DateTime.Utc => DateTime.makeUnsafe(date);

// Rows are decoded with the domain's schemas, so a row the domain could not
// have written fails loudly instead of being trusted.
const TroubleRowSchema = Schema.Union([
  Schema.Struct({
    at: Schema.Date,
    channelId: ChannelIdSchema,
    code: Schema.NullOr(Schema.String),
    postId: PostIdSchema,
    reason: FailureReasonSchema,
    status: Schema.Literal("failed"),
    targetId: PostTargetIdSchema,
  }),
  Schema.Struct({
    at: Schema.Date,
    channelId: ChannelIdSchema,
    postId: PostIdSchema,
    reason: UnconfirmedReasonSchema,
    status: Schema.Literal("unconfirmed"),
    targetId: PostTargetIdSchema,
  }),
]);

const decodeTrouble = Schema.decodeUnknownEffect(TroubleRowSchema);

const troubleOf = (row: typeof TroubleRowSchema.Type): TargetTrouble =>
  row.status === "failed"
    ? {
        ...row,
        at: utc(row.at),
        code: Option.fromNullOr(row.code),
      }
    : { ...row, at: utc(row.at) };

const statuses = [
  "awaitingApproval",
  "cancelled",
  "draft",
  "finished",
  "publishing",
  "scheduled",
] as const;

/** PostOversight on publishing's tables: counts and ids only. */
export const DrizzlePostOversight = Layer.effect(
  PostOversight,
  Effect.gen(function* DrizzlePostOversight() {
    const db = yield* Drizzle;

    const counts = Effect.fn("PostOversight.counts")(function* counts(
      workspaceId: WorkspaceId
    ) {
      const rows = yield* db
        .select({ posts: count(), status: posts.status })
        .from(posts)
        .where(eq(posts.workspaceId, workspaceId))
        .groupBy(posts.status)
        .pipe(Effect.mapError(failed));

      const of = (status: (typeof statuses)[number]) =>
        rows.find((row) => row.status === status)?.posts ?? 0;

      return {
        awaitingApproval: of("awaitingApproval"),
        cancelled: of("cancelled"),
        draft: of("draft"),
        finished: of("finished"),
        publishing: of("publishing"),
        scheduled: of("scheduled"),
      };
    });

    const troubles = Effect.fn("PostOversight.troubles")(function* troubles(
      workspaceId: WorkspaceId,
      limit: number
    ) {
      // A failed target's instant is when it failed; an unconfirmed one's,
      // when its attempt started.
      const at = sql<Date>`coalesce(${postTargets.finishedAt}, ${postTargets.startedAt})`;

      const rows = yield* db
        .select({
          at,
          channelId: postTargets.channelId,
          code: postTargets.failureCode,
          postId: postTargets.postId,
          reason: sql<string>`coalesce(${postTargets.failureReason}, ${postTargets.unconfirmedReason})`,
          status: postTargets.status,
          targetId: postTargets.id,
        })
        .from(postTargets)
        .innerJoin(posts, eq(posts.id, postTargets.postId))
        .where(
          and(
            eq(posts.workspaceId, workspaceId),
            inArray(postTargets.status, ["failed", "unconfirmed"])
          )
        )
        .orderBy(desc(at), desc(postTargets.id))
        .limit(limit)
        .pipe(Effect.mapError(failed));

      return yield* Effect.all(
        rows.map((row) =>
          decodeTrouble(row).pipe(Effect.orDie, Effect.map(troubleOf))
        )
      );
    });

    const due = Effect.fn("PostOversight.due")(function* due({
      from,
      limit,
      to,
    }: {
      readonly from: DateTime.Utc;
      readonly limit: number;
      readonly to: DateTime.Utc;
    }) {
      const within = and(
        eq(posts.status, "scheduled"),
        gte(posts.scheduledAt, DateTime.toDateUtc(from)),
        lt(posts.scheduledAt, DateTime.toDateUtc(to))
      );

      const [counted] = yield* db
        .select({ total: count() })
        .from(posts)
        .where(within)
        .pipe(Effect.mapError(failed));

      const rows = yield* db
        .select({
          channels: sql<number>`(SELECT count(*)::int FROM ${postTargets} WHERE ${postTargets.postId} = ${posts.id})`,
          postId: posts.id,
          scheduledAt: posts.scheduledAt,
          workspaceId: posts.workspaceId,
        })
        .from(posts)
        .where(within)
        .orderBy(asc(posts.scheduledAt), asc(posts.id))
        .limit(limit)
        .pipe(Effect.mapError(failed));

      return {
        posts: rows.flatMap(({ channels, postId, scheduledAt, workspaceId }) =>
          scheduledAt === null
            ? []
            : [
                {
                  channels,
                  postId: PostIdSchema.make(postId),
                  scheduledAt: utc(scheduledAt),
                  workspaceId: WorkspaceIdSchema.make(workspaceId),
                },
              ]
        ),
        total: counted?.total ?? 0,
      };
    });

    const overdue = Effect.fn("PostOversight.overdue")(function* overdue(
      before: DateTime.Utc
    ) {
      const [counted] = yield* db
        .select({ total: count() })
        .from(posts)
        .where(
          and(
            eq(posts.status, "scheduled"),
            lt(posts.scheduledAt, DateTime.toDateUtc(before))
          )
        )
        .pipe(Effect.mapError(failed));

      return counted?.total ?? 0;
    });

    return PostOversight.of({ counts, due, overdue, troubles });
  })
);
