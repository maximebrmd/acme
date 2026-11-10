import { asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { ChannelRecords } from "#channels/application/channel-records.ts";
import { userStarter } from "#channels/domain/connect-attempt.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { channels, connectAttempts, connectChoices } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/** ChannelRecords on the channels schema. */
export const DrizzleChannelRecords = Layer.effect(
  ChannelRecords,
  Effect.gen(function* DrizzleChannelRecords() {
    const db = yield* Drizzle;

    return ChannelRecords.of({
      eraseUser: Effect.fn("ChannelRecords.eraseUser")(
        function* eraseUser(userId) {
          const starter = userStarter(userId);

          yield* db
            .delete(connectAttempts)
            .where(eq(connectAttempts.startedBy, starter))
            .pipe(Effect.mapError(failed));

          yield* db
            .delete(connectChoices)
            .where(eq(connectChoices.startedBy, starter))
            .pipe(Effect.mapError(failed));
        }
      ),
      eraseWorkspace: Effect.fn("ChannelRecords.eraseWorkspace")(
        function* eraseWorkspace(workspaceId) {
          yield* db
            .delete(connectAttempts)
            .where(eq(connectAttempts.workspaceId, workspaceId))
            .pipe(Effect.mapError(failed));

          // A choice holds the accounts' tokens, encrypted.
          yield* db
            .delete(connectChoices)
            .where(eq(connectChoices.workspaceId, workspaceId))
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
              connection: channels.connection,
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
