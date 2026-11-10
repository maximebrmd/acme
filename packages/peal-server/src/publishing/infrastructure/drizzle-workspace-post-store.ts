import { and, asc, eq, inArray } from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";

import { ExecutionIdSchema } from "#publishing/application/publication-scheduler.ts";
import { WorkspacePostStore } from "#publishing/application/workspace-post-store.ts";
import { PostOriginSchema } from "#publishing/domain/post-origin.ts";
import { PostStatusNameSchema } from "#publishing/domain/post-status.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type {
  AuthoredPostRecord,
  PostOriginRecord,
  PostRecord,
} from "#shared/application/personal-data.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { idempotencyKeys, posts, postTargets } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeStanding = Schema.decodeUnknownEffect(
  Schema.Struct({
    execution: Schema.OptionFromNullOr(ExecutionIdSchema),
    postId: PostIdSchema,
    status: PostStatusNameSchema,
  })
);

// What the content columns hold, as the post repository writes them.
const decodeMedia = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({ altText: Schema.String, mediaId: Schema.String })
  )
);

const decodeOverrides = Schema.decodeUnknownEffect(
  Schema.Array(Schema.Struct({ channelId: Schema.String, text: Schema.String }))
);

// How a post was created or scheduled, as the post repository writes it.
const decodeOrigin = Schema.decodeUnknownEffect(
  Schema.NullOr(PostOriginSchema)
);

type PostRow = typeof posts.$inferSelect;

type TargetRow = typeof postTargets.$inferSelect;

// How the post was created, or scheduled, as an export holds it.
const originRecord = (row: PostRow, column: "createdVia" | "scheduledVia") =>
  decodeOrigin(row[column]).pipe(
    Effect.orDie,
    Effect.map((origin): PostOriginRecord | null =>
      origin === null
        ? null
        : {
            name: origin._tag === "web" ? null : (origin.name ?? null),
            via: origin._tag,
          }
    )
  );

const utcOrNull = (date: Date | null) =>
  date === null ? null : DateTime.fromDateUnsafe(date);

// A post as an export holds it, with its targets among `targetRows`.
const recordOf = Effect.fnUntraced(function* recordOf(
  row: PostRow,
  targetRows: readonly TargetRow[]
) {
  const media = yield* decodeMedia(row.media).pipe(Effect.orDie);

  const overrides = yield* decodeOverrides(row.textOverrides).pipe(
    Effect.orDie
  );

  const record: PostRecord = {
    createdVia: yield* originRecord(row, "createdVia"),
    id: row.id,
    media: media.map(({ altText, mediaId }) => ({
      altText: altText === "" ? null : altText,
      mediaId,
    })),
    scheduledAt: utcOrNull(row.scheduledAt),
    scheduledVia: yield* originRecord(row, "scheduledVia"),
    status: row.status,
    targets: targetRows.flatMap((target) =>
      target.postId === row.id
        ? [
            {
              channelId: target.channelId,
              finishedAt: utcOrNull(target.finishedAt),
              keptPrivate: target.keptPrivate,
              options: target.options,
              permalink: target.permalink,
              status: target.status,
            },
          ]
        : []
    ),
    text: row.text,
    textOverrides: overrides,
    timeZone: row.scheduleZone,
  };

  return record;
});

/**
 * WorkspacePostStore on the publishing schema. Deleting a post deletes its
 * targets, their attempts and their journal rows, which reference it with
 * ON DELETE CASCADE.
 */
export const DrizzleWorkspacePostStore = Layer.effect(
  WorkspacePostStore,
  Effect.gen(function* DrizzleWorkspacePostStore() {
    const db = yield* Drizzle;

    const lockAll = Effect.fn("WorkspacePostStore.lockAll")(function* lockAll(
      workspaceId: string
    ) {
      const rows = yield* db
        .select({
          execution: posts.executionId,
          postId: posts.id,
          status: posts.status,
        })
        .from(posts)
        .where(eq(posts.workspaceId, workspaceId))
        .orderBy(asc(posts.id))
        .for("update")
        .pipe(Effect.mapError(failed));

      return yield* Effect.all(
        rows.map((row) => decodeStanding(row).pipe(Effect.orDie))
      );
    });

    // The targets of these posts, in the order they came.
    const targetsOf = (postRows: readonly PostRow[]) =>
      postRows.length === 0
        ? Effect.succeed<readonly TargetRow[]>([])
        : db
            .select()
            .from(postTargets)
            .where(
              inArray(
                postTargets.postId,
                postRows.map(({ id }) => id)
              )
            )
            .orderBy(asc(postTargets.id))
            .pipe(Effect.mapError(failed));

    const exportAll = Effect.fn("WorkspacePostStore.exportAll")(
      function* exportAll(workspaceId: string) {
        const postRows = yield* db
          .select()
          .from(posts)
          .where(eq(posts.workspaceId, workspaceId))
          .orderBy(asc(posts.id))
          .pipe(Effect.mapError(failed));

        const targetRows = yield* targetsOf(postRows);

        return yield* Effect.all(
          postRows.map((row) => recordOf(row, targetRows))
        );
      }
    );

    const exportAuthored = Effect.fn("WorkspacePostStore.exportAuthored")(
      function* exportAuthored(
        userId: string,
        workspaceIds: readonly string[]
      ) {
        if (workspaceIds.length === 0) {
          const none: readonly AuthoredPostRecord[] = [];

          return none;
        }

        const postRows = yield* db
          .select()
          .from(posts)
          .where(
            and(
              eq(posts.authorId, userId),
              inArray(posts.workspaceId, [...workspaceIds])
            )
          )
          .orderBy(asc(posts.id))
          .pipe(Effect.mapError(failed));

        const targetRows = yield* targetsOf(postRows);

        return yield* Effect.all(
          postRows.map((row) =>
            recordOf(row, targetRows).pipe(
              Effect.map((record): AuthoredPostRecord => ({
                ...record,
                workspaceId: row.workspaceId,
              }))
            )
          )
        );
      }
    );

    const clearAuthor = Effect.fn("WorkspacePostStore.clearAuthor")(
      function* clearAuthor(userId: string) {
        yield* db
          .update(posts)
          .set({ authorId: null })
          .where(eq(posts.authorId, userId))
          .pipe(Effect.mapError(failed));

        // Nor that they scheduled any: how it was scheduled stays.
        yield* db
          .update(posts)
          .set({ scheduledBy: null })
          .where(eq(posts.scheduledBy, userId))
          .pipe(Effect.mapError(failed));
      }
    );

    const deleteAll = Effect.fn("WorkspacePostStore.deleteAll")(
      function* deleteAll(workspaceId: string) {
        yield* db
          .delete(posts)
          .where(eq(posts.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));

        // And the keys of the requests that made them.
        yield* db
          .delete(idempotencyKeys)
          .where(eq(idempotencyKeys.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));
      }
    );

    return WorkspacePostStore.of({
      clearAuthor,
      deleteAll,
      exportAll,
      exportAuthored,
      lockAll,
    });
  })
);
