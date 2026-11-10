import { and, asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { ChannelSetStore } from "#publishing/application/channel-set-store.ts";
import { ChannelOptionsListSchema } from "#publishing/domain/channel-options.ts";
import { ChannelSet, setKeyOf } from "#publishing/domain/channel-set.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { channelSets } from "./schema.ts";

type Row = typeof channelSets.$inferSelect;

// Rows are decoded with the domain's schema, so a row the domain could not
// have written (a bug, or a hand edit) fails loudly instead of being trusted.
const decodeSet = Schema.decodeUnknownEffect(ChannelSet);

// A set's options as their column holds them: JSON, tagged by platform.
const encodeOptions = Schema.encodeSync(ChannelOptionsListSchema);

const failed = (cause: unknown) => new DatabaseError({ cause });

const toSet = (row: Row) =>
  decodeSet({
    channelIds: row.channelIds,
    createdAt: DateTime.fromDateUnsafe(row.createdAt),
    id: row.id,
    name: row.name,
    options: row.options,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

// What a member writes of a set, as its columns hold it.
const written = ({ channelIds, name, options }: ChannelSet) => ({
  channelIds: [...channelIds],
  name,
  nameKey: setKeyOf(name),
  options: encodeOptions(options),
});

/** Channel sets in the publishing schema, through Drizzle. */
export const DrizzleChannelSetStore = Layer.effect(
  ChannelSetStore,
  Effect.gen(function* DrizzleChannelSetStore() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return ChannelSetStore.of({
      // A transaction's advisory lock, in the two-key form: the first key
      // names what is claimed, the second the workspace.
      claim: (workspaceId) =>
        client`SELECT pg_advisory_xact_lock(hashtext('peal-server/publishing/channel-sets'), hashtext(${workspaceId}))`.pipe(
          Effect.mapError(failed),
          Effect.asVoid
        ),
      insert: (set) =>
        db
          .insert(channelSets)
          .values({
            ...written(set),
            createdAt: DateTime.toDateUtc(set.createdAt),
            id: set.id,
            workspaceId: set.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      list: (workspaceId) =>
        db
          .select()
          .from(channelSets)
          .where(eq(channelSets.workspaceId, workspaceId))
          .orderBy(asc(channelSets.id))
          .pipe(Effect.mapError(failed), Effect.flatMap(Effect.forEach(toSet))),
      remove: (workspaceId, setId) =>
        db
          .delete(channelSets)
          .where(
            and(
              eq(channelSets.workspaceId, workspaceId),
              eq(channelSets.id, setId)
            )
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
      update: (set) =>
        db
          .update(channelSets)
          .set(written(set))
          .where(
            and(
              eq(channelSets.workspaceId, set.workspaceId),
              eq(channelSets.id, set.id)
            )
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
    });
  })
);
