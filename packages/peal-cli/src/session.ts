import { DateTime, Duration, Effect, Option, Redacted, Schema } from "effect";
import { cliClientId, OAuthErrorSchema } from "peal-contract";
import type { Token } from "peal-contract";

import { requestFailed } from "#api-request-failed.ts";
import { PealApi } from "#api.ts";
import { CredentialStore } from "#credentials.ts";
import type { Credentials } from "#credentials.ts";
import { display } from "#display.ts";
import { NotSignedIn } from "#not-signed-in.ts";
import { SignInExpired } from "#sign-in-expired.ts";

/** Whether a failed OAuth request was refused, rather than unanswered. */
export const isOAuthError = Schema.is(OAuthErrorSchema);

/** The sign-in that tokens issued at `now` make. */
export const credentialsOf = (
  token: Token,
  now: DateTime.Utc
): Credentials => ({
  accessToken: Redacted.make(token.access_token),
  expiresAt: DateTime.add(now, { seconds: token.expires_in }),
  refreshToken: Option.fromUndefinedOr(token.refresh_token).pipe(
    Option.map(Redacted.make)
  ),
  scope: token.scope ?? "",
});

// An access token about to run out is renewed before it is sent, so that it
// does not expire on its way to the server.
const renewalMargin = Duration.seconds(30);

/**
 * An access token for the API the command line points at: the saved one,
 * or a renewed one when it ran out, which is saved in its place. Refresh
 * tokens are rotated, so each renews the sign-in once.
 */
export const accessToken = Effect.gen(function* accessToken() {
  const { baseUrl, oauth } = yield* PealApi;
  const store = yield* CredentialStore;
  const url = display(baseUrl);

  const saved = yield* store.read(baseUrl);

  if (Option.isNone(saved)) {
    return yield* new NotSignedIn({ url });
  }

  const now = yield* DateTime.now;
  const credentials = saved.value;

  if (
    DateTime.isLessThan(
      DateTime.addDuration(now, renewalMargin),
      credentials.expiresAt
    )
  ) {
    return credentials.accessToken;
  }

  if (Option.isNone(credentials.refreshToken)) {
    return yield* new SignInExpired({ url });
  }

  const renewed = yield* oauth.tokens
    .token({
      payload: {
        client_id: cliClientId,
        grant_type: "refresh_token",
        refresh_token: Redacted.value(credentials.refreshToken.value),
      },
    })
    .pipe(
      Effect.mapError((error) =>
        isOAuthError(error)
          ? new SignInExpired({ url })
          : requestFailed(url)(error)
      )
    );

  const next = credentialsOf(renewed, now);

  yield* store.write(baseUrl, next);

  return next.accessToken;
});
