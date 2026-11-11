import { eq, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option } from "effect";

import { UploadSessions } from "#publishing/application/upload-sessions.ts";
import type { UploadSession } from "#publishing/application/upload-sessions.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { uploadSessions } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const byKey = (idempotencyKey: string) =>
  eq(uploadSessions.idempotencyKey, idempotencyKey);

/** The upload sessions in the publishing schema, through Drizzle. */
export const DrizzleUploadSessions = Layer.effect(
  UploadSessions,
  Effect.gen(function* DrizzleUploadSessions() {
    const db = yield* Drizzle;

    return UploadSessions.of({
      finalPartSent: (idempotencyKey) =>
        db
          .update(uploadSessions)
          .set({ finalPartSent: true })
          .where(byKey(idempotencyKey))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      find: (idempotencyKey) =>
        db
          .select()
          .from(uploadSessions)
          .where(byKey(idempotencyKey))
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) =>
              Option.fromUndefinedOr(row).pipe(
                Option.map((found): UploadSession => ({
                  byteSize: found.byteSize,
                  finalPartSent: found.finalPartSent,
                  sessionUrl: Option.fromNullOr(found.sessionUrl),
                  thumbnailSet: found.thumbnailSet,
                  videoId: Option.fromNullOr(found.videoId),
                }))
              )
            )
          ),
      made: (idempotencyKey, videoId) =>
        db
          .update(uploadSessions)
          .set({ sessionUrl: null, videoId })
          .where(byKey(idempotencyKey))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      // A session that expired is replaced only while its last part was
      // never sent: after that, the video may exist.
      open: (idempotencyKey, session) =>
        db
          .insert(uploadSessions)
          .values({
            byteSize: session.byteSize,
            idempotencyKey,
            openedAt: DateTime.toDateUtc(session.openedAt),
            sessionUrl: session.sessionUrl,
          })
          .onConflictDoUpdate({
            set: {
              byteSize: session.byteSize,
              openedAt: DateTime.toDateUtc(session.openedAt),
              sessionUrl: session.sessionUrl,
            },
            setWhere: sql`${uploadSessions.finalPartSent} = false AND ${uploadSessions.videoId} IS NULL`,
            target: uploadSessions.idempotencyKey,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      thumbnailSet: (idempotencyKey) =>
        db
          .update(uploadSessions)
          .set({ thumbnailSet: true })
          .where(byKey(idempotencyKey))
          .pipe(Effect.mapError(failed), Effect.asVoid),
    });
  })
);
