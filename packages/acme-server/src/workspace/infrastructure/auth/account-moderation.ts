import { eq } from "drizzle-orm";
import { DateTime, Duration, Effect, Layer, Option, Redacted } from "effect";

import type { UserId } from "#shared/domain/ids.ts";
import { defaultLocale } from "#shared/domain/locale.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { AccountModeration } from "#workspace/application/account-moderation.ts";
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

    return AccountModeration.of({
      ban: Effect.fn("AccountModeration.ban")(function* ban({
        expiresAt,
        reason,
        staffSession,
        userId,
      }) {
        const now = yield* DateTime.now;

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
      revokeSessions: ({ staffSession, userId }) =>
        attempt(
          async () =>
            await auth.api.revokeUserSessions({
              body: { userId },
              headers: headersOf(staffSession),
            })
        ).pipe(
          Effect.andThen(endImpersonations(userId)),
          Effect.withSpan("AccountModeration.revokeSessions")
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
