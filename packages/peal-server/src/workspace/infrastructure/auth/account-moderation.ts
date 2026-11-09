import { and, eq, isNotNull, or } from "drizzle-orm";
import { DateTime, Duration, Effect, Layer, Option, Redacted } from "effect";

import { UserIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { defaultLocale } from "#shared/domain/locale.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { AccountModeration } from "#workspace/application/account-moderation.ts";
import type { EndedImpersonation } from "#workspace/application/account-moderation.ts";
import { AuthUnavailable } from "#workspace/application/auth-unavailable.ts";
import { session } from "#workspace/infrastructure/auth-schema.generated.ts";

import { attempt } from "./attempt.ts";
import { BetterAuth } from "./better-auth.ts";

const headersOf = (staffSession: Redacted.Redacted): Headers =>
  new Headers({ cookie: Redacted.value(staffSession) });

// Better Auth takes a ban's end as seconds from now, and reads none (zero)
// as for good: a ban about to end lasts a second at least.
const secondsUntil = (now: DateTime.Utc, end: DateTime.Utc): number =>
  Math.max(1, Math.ceil(Duration.toSeconds(DateTime.distance(now, end))));

/**
 * The admin plugin's actions, called on the server with the staff member's
 * own cookies, so Better Auth checks their role again. Its routes under
 * /api/auth/admin are off but for stop-impersonating (options.ts).
 */
export const AccountModerationLive = Layer.effect(
  AccountModeration,
  Effect.gen(function* AccountModerationLive() {
    const auth = yield* BetterAuth;
    const db = yield* Drizzle;

    // The sessions the user opened as staff to act as someone else. Better
    // Auth ends only the user's own when it bans them or signs them out
    // everywhere; these hang on the other person's account, and would let
    // staff banned or signed out a moment ago go on acting as them.
    const endImpersonations = (userId: UserId) =>
      db
        .delete(session)
        .where(eq(session.impersonatedBy, userId))
        .pipe(
          Effect.mapError((cause) => new AuthUnavailable({ cause })),
          Effect.asVoid
        );

    // The impersonations open now that ending the account's sessions ends:
    // staff's of the account, and the account's of others.
    const impersonationsOf = (userId: UserId) =>
      db
        .select({
          staffId: session.impersonatedBy,
          userId: session.userId,
        })
        .from(session)
        .where(
          and(
            isNotNull(session.impersonatedBy),
            or(eq(session.userId, userId), eq(session.impersonatedBy, userId))
          )
        )
        .pipe(
          Effect.mapError((cause) => new AuthUnavailable({ cause })),
          Effect.map((rows) =>
            rows.flatMap(({ staffId, userId: actedAs }) =>
              staffId === null
                ? []
                : [
                    {
                      staffId: UserIdSchema.make(staffId),
                      userId: UserIdSchema.make(actedAs),
                    } satisfies EndedImpersonation,
                  ]
            )
          )
        );

    return AccountModeration.of({
      ban: Effect.fn("AccountModeration.ban")(function* ban({
        expiresAt,
        reason,
        staffSession,
        userId,
      }) {
        const now = yield* DateTime.now;
        const ending = yield* impersonationsOf(userId);

        yield* attempt(
          async () =>
            await auth.api.banUser({
              body: {
                banReason: reason,
                userId,
                ...Option.match(expiresAt, {
                  onNone: () => ({}),
                  onSome: (end) => ({ banExpiresIn: secondsUntil(now, end) }),
                }),
              },
              headers: headersOf(staffSession),
            })
        );

        yield* endImpersonations(userId);

        return ending;
      }),
      impersonate: ({ staffSession, userId }) =>
        attempt(
          async () =>
            await auth.api.impersonateUser({
              body: { userId },
              headers: headersOf(staffSession),
              returnHeaders: true,
            })
        ).pipe(
          Effect.map(({ headers }) => headers.getSetCookie()),
          Effect.withSpan("AccountModeration.impersonate")
        ),
      resendVerification: ({ email, locale }) =>
        attempt(
          async () =>
            await auth.api.sendVerificationEmail({
              body: {
                callbackURL: `${locale === defaultLocale ? "" : `/${locale}`}/verify-email`,
                email,
              },
            })
        ).pipe(
          Effect.asVoid,
          Effect.withSpan("AccountModeration.resendVerification")
        ),
      revokeSessions: Effect.fn("AccountModeration.revokeSessions")(
        function* revokeSessions({ staffSession, userId }) {
          const ending = yield* impersonationsOf(userId);

          yield* attempt(
            async () =>
              await auth.api.revokeUserSessions({
                body: { userId },
                headers: headersOf(staffSession),
              })
          );

          yield* endImpersonations(userId);

          return ending;
        }
      ),
      unban: ({ staffSession, userId }) =>
        attempt(
          async () =>
            await auth.api.unbanUser({
              body: { userId },
              headers: headersOf(staffSession),
            })
        ).pipe(Effect.asVoid, Effect.withSpan("AccountModeration.unban")),
    });
  })
);
