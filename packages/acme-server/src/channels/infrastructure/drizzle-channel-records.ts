import { asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { ChannelRecords } from "#channels/application/channel-records.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { channels, connectAttempts } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/** ChannelRecords on the channels schema. */
export const DrizzleChannelRecords = Layer.effect(
  ChannelRecords,
  Effect.gen(function* DrizzleChannelRecords() {
    const db = yield* Drizzle;

    return ChannelRecords.of({
      eraseWorkspace: Effect.fn("ChannelRecords.eraseWorkspace")(
        function* eraseWorkspace(workspaceId) {
          yield* db
            .delete(connectAttempts)
            .where(eq(connectAttempts.workspaceId, workspaceId))
            .pipe(Effect.mapError(failed));

          yield* db
            .delete(channels)
            .where(eq(channels.workspaceId, workspaceId))
            .pipe(Effect.mapError(failed));
        }
      ),
      exportWorkspace: Effect.fn("ChannelRecords.exportWorkspace")(
        function* exportWorkspace(workspaceId) {
          const rows = yield* db
            .select({
              createdAt: channels.createdAt,
              displayName: channels.displayName,
              handle: channels.handle,
              id: channels.id,
              platform: channels.platform,
              status: channels.status,
            })
            .from(channels)
            .where(eq(channels.workspaceId, workspaceId))
            .orderBy(asc(channels.createdAt), asc(channels.id))
            .pipe(Effect.mapError(failed));

          return rows.map((row) => ({
            ...row,
            createdAt: DateTime.fromDateUnsafe(row.createdAt),
          }));
        }
      ),
    });
  })
);
