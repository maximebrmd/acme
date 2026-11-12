import { and, eq, isNotNull, like, or } from "drizzle-orm";
import { DateTime, Duration, Effect, Layer, Option, Redacted } from "effect";

import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { defaultLocale } from "#shared/domain/locale.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { AccountMail } from "#workspace/application/account-mail.ts";
import { AccountModeration } from "#workspace/application/account-moderation.ts";
import type { EndedImpersonation } from "#workspace/application/account-moderation.ts";
import { AuthUnavailable } from "#workspace/application/auth-unavailable.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";
import {
  session,
  twoFactor,
  user,
  verification,
} from "#workspace/infrastructure/auth-schema.generated.ts";

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
    const transactions = yield* TransactionRunner;
    const directory = yield* MemberDirectory;
    const mail = yield* AccountMail;

    const unavailable = Effect.mapError(
      (cause: unknown) => new AuthUnavailable({ cause })
    );

    // Two-step verification gone from the account, at once: its flag, its
    // authenticator and recovery codes, the browsers it trusted and the
    // second steps of sign-ins in progress. The identifiers' prefixes are
    // the plugin's (a test pins the trusted browsers').
    const forgetTwoStep = (userId: UserId, now: DateTime.Utc) =>
      transactions.transaction(
        Effect.gen(function* forget() {
          yield* db.delete(twoFactor).where(eq(twoFactor.userId, userId));

          yield* db
            .update(user)
            .set({
              twoFactorEnabled: false,
              updatedAt: DateTime.toDateUtc(now),
            })
            .where(eq(user.id, userId));

          yield* db
            .delete(verification)
            .where(
              and(
                eq(verification.value, userId),
                or(
                  like(verification.identifier, "trust-device-%"),
                  like(verification.identifier, "2fa-%")
                )
              )
            );
        })
      );

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
      resetTwoStep: Effect.fn("AccountModeration.resetTwoStep")(
        function* resetTwoStep({ staffSession, userId }) {
          // Signed out first, then forgotten: a failure between the two
          // leaves the account signed out with its second step still on,
          // which the same reset, tried again, completes.
          const ending = yield* impersonationsOf(userId);

          yield* attempt(
            async () =>
              await auth.api.revokeUserSessions({
                body: { userId },
                headers: headersOf(staffSession),
              })
          );

          yield* endImpersonations(userId);
          yield* forgetTwoStep(userId, yield* DateTime.now).pipe(unavailable);

          const account = yield* directory.account(userId).pipe(unavailable);

          if (Option.isSome(account)) {
            yield* mail.twoStepChanged({
              email: account.value.email,
              kind: "resetByStaff",
              locale: account.value.locale,
              recoveryCodesLeft: null,
            });
          }

          return ending;
        }
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
