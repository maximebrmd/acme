import { cliClientId } from "peal-contract";
import { Console, Duration, Effect, Option, Redacted } from "effect";
import { Command } from "effect/cli";

import { PealApi } from "#api.ts";
import { CredentialStore } from "#credentials.ts";
import { display } from "#display.ts";

// Revoking is a courtesy to the server: the sign-in is forgotten even when
// the server does not answer in time.
const revokeTimeout = Duration.seconds(5);

export const logout = Command.make(
  "logout",
  {},
  Effect.fn("logout")(function* logout() {
    const { baseUrl, oauth } = yield* PealApi;
    const store = yield* CredentialStore;
    const url = display(baseUrl);

    const saved = yield* store.read(baseUrl);

    if (Option.isNone(saved)) {
      yield* Console.log(`You are not signed in to ${url}.`);

      return;
    }

    // The refresh token is what keeps the sign-in alive: the access token it
    // renewed last stops working within minutes.
    yield* Option.match(saved.value.refreshToken, {
      onNone: () => Effect.void,
      onSome: (token) =>
        oauth.tokens
          .revoke({
            payload: {
              client_id: cliClientId,
              token: Redacted.value(token),
              token_type_hint: "refresh_token",
            },
          })
          .pipe(Effect.timeout(revokeTimeout), Effect.ignore),
    });

    yield* store.remove(baseUrl);

    yield* Console.log(`Signed out of ${url}.`);
  })
).pipe(
  Command.withDescription(
    "Sign out of the Peal server: revoke the saved sign-in, and forget it."
  )
);
