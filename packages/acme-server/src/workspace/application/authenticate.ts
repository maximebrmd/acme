import { Context, Effect, Layer, Option, Redacted } from "effect";

import type { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { AuthGateway } from "./auth-gateway.ts";
import type { AuthUnavailable } from "./auth-unavailable.ts";
import { NotSignedIn } from "./not-signed-in.ts";

const orNotSignedIn = <A, E>(
  found: Effect.Effect<Option.Option<A>, E>
): Effect.Effect<A, E | NotSignedIn> =>
  found.pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(new NotSignedIn()),
        onSome: Effect.succeed,
      })
    )
  );

const isEmpty = (secret: Redacted.Redacted): boolean =>
  Redacted.value(secret).trim() === "";

/** Who a request is, from its session cookie or its API key. */
export class Authenticate extends Context.Service<
  Authenticate,
  {
    readonly apiKey: (
      token: Redacted.Redacted
    ) => Effect.Effect<ApiKeyPrincipal, AuthUnavailable | NotSignedIn>;
    /** Whether a request sending cookies comes from a trusted origin. */
    readonly isTrustedOrigin: (origin: Option.Option<string>) => boolean;
    readonly session: (
      cookies: Redacted.Redacted,
      options: { readonly fresh: boolean }
    ) => Effect.Effect<UserPrincipal, AuthUnavailable | NotSignedIn>;
  }
>()("acme-server/workspace/application/Authenticate") {
  static readonly layer = Layer.effect(
    Authenticate,
    Effect.gen(function* authenticate() {
      const gateway = yield* AuthGateway;

      return Authenticate.of({
        apiKey: (token) =>
          isEmpty(token)
            ? Effect.fail(new NotSignedIn())
            : orNotSignedIn(gateway.apiKey(token)),
        isTrustedOrigin: (origin) =>
          Option.exists(origin, (value) => gateway.isTrustedOrigin(value)),
        session: (cookies, options) =>
          isEmpty(cookies)
            ? Effect.fail(new NotSignedIn())
            : orNotSignedIn(gateway.session(cookies, options)),
      });
    })
  );
}
