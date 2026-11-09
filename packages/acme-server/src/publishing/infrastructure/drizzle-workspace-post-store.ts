import { asc, eq, inArray } from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";

import { ExecutionIdSchema } from "#publishing/application/publication-scheduler.ts";
import { WorkspacePostStore } from "#publishing/application/workspace-post-store.ts";
import { PostStatusNameSchema } from "#publishing/domain/post-status.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { PostRecord } from "#shared/application/personal-data.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { posts, postTargets } from "./schema.ts";

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

const utcOrNull = (date: Date | null) =>
  date === null ? null : DateTime.fromDateUnsafe(date);

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

    const exportAll = Effect.fn("WorkspacePostStore.exportAll")(
      function* exportAll(workspaceId: string) {
        const postRows = yield* db
          .select()
          .from(posts)
          .where(eq(posts.workspaceId, workspaceId))
          .orderBy(asc(posts.id))
          .pipe(Effect.mapError(failed));

        const targetRows =
          postRows.length === 0
            ? []
            : yield* db
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

        return yield* Effect.all(
          postRows.map(
            Effect.fnUntraced(function* recordOf(row) {
              const media = yield* decodeMedia(row.media).pipe(Effect.orDie);

              const overrides = yield* decodeOverrides(row.textOverrides).pipe(
                Effect.orDie
              );

              const record: PostRecord = {
                id: row.id,
                media: media.map(({ altText, mediaId }) => ({
                  altText: altText === "" ? null : altText,
                  mediaId,
                })),
                scheduledAt: utcOrNull(row.scheduledAt),
                status: row.status,
                targets: targetRows
                  .filter(({ postId }) => postId === row.id)
                  .map((target) => ({
                    channelId: target.channelId,
                    finishedAt: utcOrNull(target.finishedAt),
                    permalink: target.permalink,
                    status: target.status,
                  })),
                text: row.text,
                textOverrides: overrides,
                timeZone: row.scheduleZone,
              };

              return record;
            })
          )
        );
      }
    );

    const deleteAll = Effect.fn("WorkspacePostStore.deleteAll")(
      function* deleteAll(workspaceId: string) {
        yield* db
          .delete(posts)
          .where(eq(posts.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));
      }
    );

    return WorkspacePostStore.of({ deleteAll, exportAll, lockAll });
  })
);
