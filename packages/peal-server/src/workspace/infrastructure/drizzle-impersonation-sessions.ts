import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";

import { UserIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { AuthUnavailable } from "#workspace/application/auth-unavailable.ts";
import { ImpersonationSessions } from "#workspace/application/impersonation-sessions.ts";

import { session } from "./auth-schema.generated.ts";

/**
 * Impersonation sessions in Better Auth's session table, deleted with the
 * server's Drizzle: a copy of one cached in a cookie then fails the guard,
 * which reads the staff member's standing on every request.
 */
export const DrizzleImpersonationSessions = Layer.effect(
  ImpersonationSessions,
  Effect.gen(function* DrizzleImpersonationSessions() {
    const db = yield* Drizzle;

    return ImpersonationSessions.of({
      endBy: (staffId) =>
        db
          .delete(session)
          .where(eq(session.impersonatedBy, staffId))
          .returning({ userId: session.userId })
          .pipe(
            Effect.map((rows) =>
              rows.map(({ userId }) => UserIdSchema.make(userId))
            ),
            Effect.mapError((cause) => new AuthUnavailable({ cause })),
            Effect.withSpan("ImpersonationSessions.endBy")
          ),
    });
  })
);
