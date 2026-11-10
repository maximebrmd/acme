import { and, eq, or } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { Digest } from "effect/crypto";
import { SqlClient, SqlError } from "effect/sql";

import { ChannelEvents } from "#channels/application/channel-events.ts";
import { DataDeletions } from "#channels/application/data-deletions.ts";
import {
  channelsSignedInWith,
  DataDeletion,
} from "#channels/domain/data-deletion.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { channels, connectChoices, dataDeletions } from "./schema.ts";
import { signedInRows, userChannels } from "./signed-in-rows.ts";

type Row = typeof dataDeletions.$inferSelect;

const decodeDeletion = Schema.decodeUnknownEffect(DataDeletion);

// What a deleted channel's row says of it, for those who follow the
// workspace.
const decodeRemoved = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      accountId: Schema.String,
      id: ChannelIdSchema,
      platform: PlatformSchema,
      workspaceId: WorkspaceIdSchema,
    })
  )
);

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const encoder = new TextEncoder();

// A row this adapter wrote: one it cannot read is a bug, or a hand edit.
const toDeletion = (row: Row) =>
  decodeDeletion({
    app: row.app,
    channelsDeleted: row.channelsDeleted,
    code: row.code,
    completedAt: DateTime.fromDateUnsafe(row.completedAt),
    requestedAt: DateTime.fromDateUnsafe(row.requestedAt),
  }).pipe(Effect.orDie);

/**
 * Data deletion requests in the channels schema, each under the digest of
 * its signed request. Claiming the request, deleting the channels and the
 * choices offered, telling ChannelEvents of each channel gone, and counting
 * them share one transaction: the same request sent twice at once waits on
 * the first, then finds it, and tells nothing more.
 */
export const DrizzleDataDeletions = Layer.effect(
  DataDeletions,
  Effect.gen(function* DrizzleDataDeletions() {
    const db = yield* Drizzle;
    const sql = yield* SqlClient.SqlClient;
    const digest = yield* Digest.Digest;
    const events = yield* ChannelEvents;

    const erase = Effect.fn("DataDeletions.erase")(function* erase(request: {
      readonly app: DataDeletion["app"];
      readonly code: string;
      readonly now: DateTime.Utc;
      readonly signedRequest: string;
      readonly userId: string;
    }) {
      // A digest that cannot be computed is a bug, not the database's.
      const requestDigest = yield* digest
        .digestHex(Digest.sha256, encoder.encode(request.signedRequest))
        .pipe(Effect.orDie);

      const claimed = yield* db
        .insert(dataDeletions)
        .values({
          app: request.app,
          channelsDeleted: 0,
          code: request.code,
          completedAt: date(request.now),
          requestDigest,
          requestedAt: date(request.now),
        })
        .onConflictDoNothing({ target: dataDeletions.requestDigest })
        .returning({ code: dataDeletions.code })
        .pipe(Effect.mapError(failed));

      // Carried out before: what it came to then, and nothing more.
      if (claimed.length === 0) {
        const [earlier] = yield* db
          .select()
          .from(dataDeletions)
          .where(eq(dataDeletions.requestDigest, requestDigest))
          .pipe(Effect.mapError(failed));

        if (earlier === undefined) {
          return yield* Effect.die(
            new Error("A data deletion request was claimed, then lost")
          );
        }

        return yield* toDeletion(earlier);
      }

      const signedIn = channelsSignedInWith(request.app);

      const removed = yield* db
        .delete(channels)
        .where(userChannels(signedIn, request.userId))
        .returning({
          accountId: channels.accountId,
          id: channels.id,
          platform: channels.platform,
          workspaceId: channels.workspaceId,
        })
        .pipe(
          Effect.mapError(failed),
          // Rows the repository wrote: one it cannot read is a bug.
          Effect.flatMap((rows) => decodeRemoved(rows).pipe(Effect.orDie))
        );

      // Disconnected, as by a member: the workspace's followers hear it.
      yield* Effect.all(
        removed.map((channel) => events.disconnected(channel, "dataDeletion")),
        { discard: true }
      );

      // The accounts their sign-in offers a member, with Page tokens, until
      // the member chooses: they go too, whoever started the sign-in.
      yield* db
        .delete(connectChoices)
        .where(
          and(
            or(...signedIn.map((rows) => signedInRows(connectChoices, rows))),
            eq(connectChoices.grantedBy, request.userId)
          )
        )
        .pipe(Effect.mapError(failed));

      yield* db
        .update(dataDeletions)
        .set({ channelsDeleted: removed.length })
        .where(eq(dataDeletions.code, request.code))
        .pipe(Effect.mapError(failed));

      return new DataDeletion({
        app: request.app,
        channelsDeleted: removed.length,
        code: request.code,
        completedAt: request.now,
        requestedAt: request.now,
      });
    });

    return DataDeletions.of({
      erase: (request) =>
        sql
          .withTransaction(erase(request))
          .pipe(
            Effect.catchIf(SqlError.isSqlError, (failure) =>
              Effect.fail(failed(failure))
            )
          ),
      find: (code) =>
        db
          .select()
          .from(dataDeletions)
          .where(eq(dataDeletions.code, code))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(([row]) =>
              row === undefined
                ? Effect.succeed(Option.none<DataDeletion>())
                : toDeletion(row).pipe(Effect.map(Option.some))
            )
          ),
    });
  })
).pipe(Layer.provide(Digest.layerWebCrypto));
