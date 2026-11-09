import { eq } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { NoticeLog } from "#notifications/application/notice-log.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { sentNotices } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/** The notice log in the notifications schema. */
export const DrizzleNoticeLog = Layer.effect(
  NoticeLog,
  Effect.gen(function* DrizzleNoticeLog() {
    const db = yield* Drizzle;

    return NoticeLog.of({
      claim: (key, at) =>
        db
          .insert(sentNotices)
          .values({ key, sentAt: DateTime.toDateUtc(at) })
          .onConflictDoNothing()
          .returning({ key: sentNotices.key })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length === 1)
          ),
      release: (key) =>
        db
          .delete(sentNotices)
          .where(eq(sentNotices.key, key))
          .pipe(Effect.mapError(failed), Effect.asVoid),
    });
  })
);
