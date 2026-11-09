import { eq } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";

import { PublicationProgress } from "#publishing/application/publication-progress.ts";
import type { CallProgress } from "#publishing/application/publication-progress.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { publicationCalls } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeJson = Schema.decodeUnknownOption(Schema.Json);

/**
 * The progress of each call, in `publishing.publication_calls.progress`.
 * Each write is its own statement, committed when it returns: adapters run
 * outside any transaction.
 */
export const DrizzlePublicationProgress = Layer.effect(
  PublicationProgress,
  Effect.gen(function* DrizzlePublicationProgress() {
    const db = yield* Drizzle;

    const record = Effect.fn("PublicationProgress.record")(function* record(
      idempotencyKey: string,
      progress: Schema.Json
    ) {
      const updated = yield* db
        .update(publicationCalls)
        .set({ progress })
        .where(eq(publicationCalls.idempotencyKey, idempotencyKey))
        .returning({ idempotencyKey: publicationCalls.idempotencyKey })
        .pipe(Effect.mapError(failed));

      if (updated.length === 0) {
        yield* Effect.die("A call's progress has no journal row");
      }
    });

    const read = Effect.fn("PublicationProgress.read")(function* read(
      idempotencyKey: string
    ) {
      const [row] = yield* db
        .select({ progress: publicationCalls.progress })
        .from(publicationCalls)
        .where(eq(publicationCalls.idempotencyKey, idempotencyKey))
        .pipe(Effect.mapError(failed));

      const progress: CallProgress =
        row === undefined
          ? { _tag: "unknownCall" }
          : {
              _tag: "begun",
              recorded: Option.fromNullOr(row.progress).pipe(
                Option.flatMap(decodeJson)
              ),
            };

      return progress;
    });

    return PublicationProgress.of({ read, record });
  })
);
