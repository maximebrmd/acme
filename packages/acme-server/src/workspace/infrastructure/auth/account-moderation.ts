import { DateTime, Duration, Effect, Layer, Option, Redacted } from "effect";

import { defaultLocale } from "#shared/domain/locale.ts";
import { AccountModeration } from "#workspace/application/account-moderation.ts";

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
          Effect.asVoid,
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
