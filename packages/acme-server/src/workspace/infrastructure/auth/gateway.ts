import { Effect, Layer, Option, Redacted, Schema } from "effect";

import { permissionsOf } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { AuthGateway } from "#workspace/application/auth-gateway.ts";
import { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { attempt } from "./attempt.ts";
import { BetterAuth } from "./better-auth.ts";
import { AuthSettings, trustedOriginsOf } from "./settings.ts";

// What Acme reads of Better Auth's answers. A session or key that does not
// match is treated as none.
const SessionSchema = Schema.Struct({
  session: Schema.Struct({
    impersonatedBy: Schema.optional(Schema.NullOr(UserIdSchema)),
  }),
  user: Schema.Struct({ id: UserIdSchema }),
});

const VerifiedKeySchema = Schema.Struct({
  key: Schema.Struct({
    id: Schema.NonEmptyString,
    permissions: Schema.NullOr(
      Schema.Record(Schema.String, Schema.Array(Schema.String))
    ),
    // Keys are owned by workspaces: the reference is the workspace's id.
    referenceId: WorkspaceIdSchema,
  }),
  valid: Schema.Literal(true),
});

const decodeSession = Schema.decodeUnknownOption(SessionSchema);

const decodeVerifiedKey = Schema.decodeUnknownOption(VerifiedKeySchema);

/** Better Auth behind the AuthGateway port. */
export const AuthGatewayLive = Layer.effect(
  AuthGateway,
  Effect.gen(function* authGateway() {
    const auth = yield* BetterAuth;
    const trusted = trustedOriginsOf(yield* AuthSettings);

    return AuthGateway.of({
      apiKey: (key) =>
        attempt(
          async () =>
            await auth.api.verifyApiKey({ body: { key: Redacted.value(key) } })
        ).pipe(
          Effect.map((answer) =>
            decodeVerifiedKey(answer).pipe(
              Option.map(
                ({ key: verified }) =>
                  new ApiKeyPrincipal({
                    apiKeyId: verified.id,
                    permissions: permissionsOf(verified.permissions ?? {}),
                    workspaceId: verified.referenceId,
                  })
              )
            )
          ),
          Effect.withSpan("AuthGateway.apiKey")
        ),
      isTrustedOrigin: (origin) => trusted.has(origin),
      session: (cookies, { fresh }) =>
        attempt(
          async () =>
            await auth.api.getSession({
              headers: new Headers({ cookie: Redacted.value(cookies) }),
              // Refreshing would set a cookie on a reply this path does not
              // send; the web app refreshes through /api/auth/get-session.
              query: { disableCookieCache: fresh, disableRefresh: true },
            })
        ).pipe(
          Effect.map((answer) =>
            decodeSession(answer).pipe(
              Option.map(
                ({ session, user }) =>
                  new UserPrincipal({
                    impersonatedBy: Option.fromNullishOr(
                      session.impersonatedBy
                    ),
                    userId: user.id,
                  })
              )
            )
          ),
          Effect.withSpan("AuthGateway.session")
        ),
    });
  })
);
