import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient, SqlError } from "effect/sql";

import { DataDeletions } from "#channels/application/data-deletions.ts";
import { DataDeletion } from "#channels/domain/data-deletion.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { channels, dataDeletions } from "./schema.ts";

const decodeDeletion = Schema.decodeUnknownEffect(DataDeletion);

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

/**
 * Data deletion requests in the channels schema. Deleting the channels and
 * recording the request share one transaction.
 */
export const DrizzleDataDeletions = Layer.effect(
  DataDeletions,
  Effect.gen(function* DrizzleDataDeletions() {
    const db = yield* Drizzle;
    const sql = yield* SqlClient.SqlClient;

    const erase = Effect.fn("DataDeletions.erase")(function* erase(request: {
      readonly app: DataDeletion["app"];
      readonly code: string;
      readonly now: DateTime.Utc;
      readonly platforms: readonly string[];
      readonly userId: string;
    }) {
      const removed = yield* db
        .delete(channels)
        .where(
          and(
            inArray(channels.platform, [...request.platforms]),
            or(
              eq(channels.grantedBy, request.userId),
              and(
                isNull(channels.grantedBy),
                eq(channels.accountId, request.userId)
              )
            )
          )
        )
        .returning({ id: channels.id })
        .pipe(Effect.mapError(failed));

      const deletion = new DataDeletion({
        app: request.app,
        channelsDeleted: removed.length,
        code: request.code,
        completedAt: request.now,
        requestedAt: request.now,
      });

      yield* db
        .insert(dataDeletions)
        .values({
          app: deletion.app,
          channelsDeleted: deletion.channelsDeleted,
          code: deletion.code,
          completedAt: date(deletion.completedAt),
          requestedAt: date(deletion.requestedAt),
        })
        .pipe(Effect.mapError(failed));

      return deletion;
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
                : decodeDeletion({
                    app: row.app,
                    channelsDeleted: row.channelsDeleted,
                    code: row.code,
                    completedAt: DateTime.fromDateUnsafe(row.completedAt),
                    requestedAt: DateTime.fromDateUnsafe(row.requestedAt),
                  }).pipe(Effect.orDie, Effect.map(Option.some))
            )
          ),
    });
  })
);
