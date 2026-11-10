import { and, asc, eq, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { TagStore } from "#publishing/application/tag-store.ts";
import { Tag, tagKeyOf } from "#publishing/domain/tag.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { posts, tags } from "./schema.ts";

type Row = typeof tags.$inferSelect;

// Rows are decoded with the domain's schema, so a row the domain could not
// have written (a bug, or a hand edit) fails loudly instead of being trusted.
const decodeTag = Schema.decodeUnknownEffect(Tag);

const failed = (cause: unknown) => new DatabaseError({ cause });

const toTag = (row: Row) =>
  decodeTag({
    colour: row.colour,
    createdAt: DateTime.fromDateUnsafe(row.createdAt),
    id: row.id,
    name: row.name,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

/** Tags in the publishing schema, through Drizzle. */
export const DrizzleTagStore = Layer.effect(
  TagStore,
  Effect.gen(function* DrizzleTagStore() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return TagStore.of({
      byId: (workspaceId, tagId) =>
        db
          .select()
          .from(tags)
          .where(and(eq(tags.workspaceId, workspaceId), eq(tags.id, tagId)))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(([row]) =>
              row === undefined
                ? Effect.succeed(Option.none<Tag>())
                : toTag(row).pipe(Effect.map(Option.some))
            )
          ),
      // A transaction's advisory lock, in the two-key form: the first key
      // names what is claimed, the second the workspace.
      claim: (workspaceId) =>
        client`SELECT pg_advisory_xact_lock(hashtext('peal-server/publishing/tags'), hashtext(${workspaceId}))`.pipe(
          Effect.mapError(failed),
          Effect.asVoid
        ),
      insert: (tag) =>
        db
          .insert(tags)
          .values({
            colour: tag.colour,
            createdAt: DateTime.toDateUtc(tag.createdAt),
            id: tag.id,
            name: tag.name,
            nameKey: tagKeyOf(tag.name),
            workspaceId: tag.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      list: (workspaceId) =>
        db
          .select()
          .from(tags)
          .where(eq(tags.workspaceId, workspaceId))
          .orderBy(asc(tags.id))
          .pipe(Effect.mapError(failed), Effect.flatMap(Effect.forEach(toTag))),
      remove: (workspaceId, tagId) =>
        Effect.gen(function* remove() {
          yield* db
            .update(posts)
            .set({ tagIds: sql`array_remove(${posts.tagIds}, ${tagId}::uuid)` })
            .where(
              and(
                eq(posts.workspaceId, workspaceId),
                sql`${posts.tagIds} @> ARRAY[${tagId}]::uuid[]`
              )
            );

          yield* db
            .delete(tags)
            .where(and(eq(tags.workspaceId, workspaceId), eq(tags.id, tagId)));
        }).pipe(Effect.mapError(failed)),
      removeAll: (workspaceId) =>
        db
          .delete(tags)
          .where(eq(tags.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      update: (tag) =>
        db
          .update(tags)
          .set({
            colour: tag.colour,
            name: tag.name,
            nameKey: tagKeyOf(tag.name),
          })
          .where(
            and(eq(tags.workspaceId, tag.workspaceId), eq(tags.id, tag.id))
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
    });
  })
);
