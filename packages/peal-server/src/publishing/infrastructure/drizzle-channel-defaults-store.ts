import { and, asc, eq, inArray } from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";

import { ChannelDefaultsStore } from "#publishing/application/channel-defaults-store.ts";
import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { TargetOptionsSchema } from "#publishing/domain/target-options.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { channelDefaults } from "./schema.ts";

// Rows are decoded with the domain's schema, so a row the domain could not
// have written (a bug, or a hand edit) fails loudly instead of being trusted.
const decodeDefaults = Schema.decodeUnknownEffect(ChannelOptions);

// A channel's options as their column holds them: JSON, tagged by platform.
const encodeOptions = Schema.encodeSync(TargetOptionsSchema);

const failed = (cause: unknown) => new DatabaseError({ cause });

/** Channels' default options in the publishing schema, through Drizzle. */
export const DrizzleChannelDefaultsStore = Layer.effect(
  ChannelDefaultsStore,
  Effect.gen(function* DrizzleChannelDefaultsStore() {
    const db = yield* Drizzle;

    return ChannelDefaultsStore.of({
      among: (workspaceId, channelIds) =>
        channelIds.length === 0
          ? Effect.succeed([])
          : db
              .select()
              .from(channelDefaults)
              .where(
                and(
                  eq(channelDefaults.workspaceId, workspaceId),
                  inArray(channelDefaults.channelId, [...channelIds])
                )
              )
              .orderBy(asc(channelDefaults.channelId))
              .pipe(
                Effect.mapError(failed),
                Effect.flatMap(
                  Effect.forEach(({ channelId, options }) =>
                    decodeDefaults({ channelId, options }).pipe(Effect.orDie)
                  )
                )
              ),
      put: (workspaceId, { channelId, options }, now) =>
        db
          .insert(channelDefaults)
          .values({
            channelId,
            options: encodeOptions(options),
            updatedAt: DateTime.toDateUtc(now),
            workspaceId,
          })
          .onConflictDoUpdate({
            set: {
              options: encodeOptions(options),
              updatedAt: DateTime.toDateUtc(now),
              workspaceId,
            },
            target: channelDefaults.channelId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      remove: (workspaceId, channelId) =>
        db
          .delete(channelDefaults)
          .where(
            and(
              eq(channelDefaults.workspaceId, workspaceId),
              eq(channelDefaults.channelId, channelId)
            )
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
    });
  })
);
