import { Context } from "effect";
import type { Effect, Option, Redacted } from "effect";

import type { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import type { AuthUnavailable } from "./auth-unavailable.ts";

/** Checks credentials with the sign-in service (Better Auth). */
export class AuthGateway extends Context.Service<
  AuthGateway,
  {
    /**
     * The API key's principal, if the key is valid and the workspace that
     * owns it still exists.
     */
    readonly apiKey: (
      key: Redacted.Redacted
    ) => Effect.Effect<Option.Option<ApiKeyPrincipal>, AuthUnavailable>;
    /** Whether cookie-authenticated requests may come from this origin. */
    readonly isTrustedOrigin: (origin: string) => boolean;
    /**
     * The principal of the session the cookies carry. `fresh` reads the
     * session from the database, not from the copy cached in a cookie for a
     * few minutes, so a session revoked a moment ago no longer works.
     */
    readonly session: (
      cookies: Redacted.Redacted,
      options: { readonly fresh: boolean }
    ) => Effect.Effect<Option.Option<UserPrincipal>, AuthUnavailable>;
  }
>()("acme-server/workspace/application/AuthGateway") {}
