import { cliClientId, deviceCodeGrantType } from "acme-contract";
import type { DeviceAuthorization, OAuthError, Token } from "acme-contract";
import { Console, DateTime, Duration, Effect, Result } from "effect";
import { Command } from "effect/cli";

import { requestFailed } from "#api-request-failed.ts";
import type { ApiRequestFailed } from "#api-request-failed.ts";
import { AcmeApi } from "#api.ts";
import { CredentialStore } from "#credentials.ts";
import { display } from "#display.ts";
import { credentialsOf, isOAuthError } from "#session.ts";
import { SignInFailed } from "#sign-in-failed.ts";

/**
 * What the command line asks to do: anything the user's role allows in
 * their workspaces, and to renew its sign-in without them.
 */
export const loginScope = "offline_access workspace:read workspace:write";

// RFC 8628 §3.5: wait five seconds between requests unless the server says
// otherwise, and five more each time it asks to slow down.
const defaultInterval = Duration.seconds(5);

const slowDownStep = Duration.seconds(5);

// A code as people type it: in groups of four, which the server ignores.
const grouped = (code: string): string =>
  (code.match(/.{1,4}/gu) ?? [code]).join("-");

type Attempt =
  | { readonly _tag: "issued"; readonly token: Token }
  | { readonly _tag: "pending" }
  | { readonly _tag: "slowDown" };

const issued = (token: Token): Attempt => ({ _tag: "issued", token });

const pending: Attempt = { _tag: "pending" };

const slowDown: Attempt = { _tag: "slowDown" };

export const login = Command.make(
  "login",
  {},
  Effect.fn("login")(function* login() {
    const { baseUrl, oauth } = yield* AcmeApi;
    const store = yield* CredentialStore;
    const url = display(baseUrl);
    const failed = requestFailed(url);

    // The resource the server issues API tokens for, which its public URL
    // names, whatever URL the command line reaches it at.
    const { resource } = yield* oauth.discovery
      .apiResource()
      .pipe(Effect.mapError(failed));

    const refused = (refusal: OAuthError) =>
      new SignInFailed({ detail: refusal.error, reason: "refused", url });

    // What a refused token request means: wait, wait longer, or stop.
    const answerOf = (
      refusal: OAuthError
    ): Effect.Effect<Attempt, SignInFailed> => {
      switch (refusal.error) {
        case "authorization_pending": {
          return Effect.succeed(pending);
        }

        case "slow_down": {
          return Effect.succeed(slowDown);
        }

        case "access_denied": {
          return Effect.fail(
            new SignInFailed({ detail: refusal.error, reason: "denied", url })
          );
        }

        case "expired_token": {
          return Effect.fail(
            new SignInFailed({ detail: refusal.error, reason: "expired", url })
          );
        }

        default: {
          return Effect.fail(refused(refusal));
        }
      }
    };

    const device = yield* oauth.tokens
      .deviceAuthorization({
        payload: { client_id: cliClientId, resource, scope: loginScope },
      })
      .pipe(
        Effect.mapError((failure) =>
          isOAuthError(failure) ? refused(failure) : failed(failure)
        )
      );

    const attempt = (authorization: DeviceAuthorization) =>
      oauth.tokens
        .token({
          payload: {
            client_id: cliClientId,
            device_code: authorization.device_code,
            grant_type: deviceCodeGrantType,
          },
        })
        .pipe(
          Effect.result,
          Effect.flatMap(
            Result.match({
              onFailure: (
                failure
              ): Effect.Effect<Attempt, ApiRequestFailed | SignInFailed> =>
                isOAuthError(failure)
                  ? answerOf(failure)
                  : Effect.fail(failed(failure)),
              onSuccess: (token) => Effect.succeed(issued(token)),
            })
          )
        );

    // Asks for the tokens every `interval` until the user approves or
    // denies the sign-in.
    const waitForApproval = (
      interval: Duration.Duration
    ): Effect.Effect<Token, ApiRequestFailed | SignInFailed> =>
      Effect.sleep(interval).pipe(
        Effect.andThen(attempt(device)),
        Effect.flatMap((result) =>
          result._tag === "issued"
            ? Effect.succeed(result.token)
            : waitForApproval(
                result._tag === "pending"
                  ? interval
                  : Duration.sum(interval, slowDownStep)
              )
        )
      );

    yield* Console.log(
      `To sign in to ${url}, open ${device.verification_uri} in a browser and enter the code ${grouped(device.user_code)}.`
    );

    if (device.verification_uri_complete !== undefined) {
      yield* Console.log(
        `Or open ${device.verification_uri_complete}, where the code is filled in.`
      );
    }

    yield* Console.log(
      `Waiting for you to approve the sign-in (the code works for ${Duration.format(Duration.seconds(device.expires_in))})…`
    );

    const token = yield* waitForApproval(
      device.interval === undefined
        ? defaultInterval
        : Duration.seconds(device.interval)
    ).pipe(
      Effect.timeoutOrElse({
        duration: Duration.seconds(device.expires_in),
        orElse: () =>
          Effect.fail(
            new SignInFailed({ detail: "expired", reason: "expired", url })
          ),
      })
    );

    yield* store.write(baseUrl, credentialsOf(token, yield* DateTime.now));

    yield* Console.log(
      `Signed in to ${url}. The sign-in is saved in ${yield* store.file}, which only you may read.`
    );
  })
).pipe(
  Command.withDescription(
    "Sign in to the Acme server: approve a code in the browser, and the command line saves its sign-in for the other commands."
  )
);
