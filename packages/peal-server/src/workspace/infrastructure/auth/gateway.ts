import { Effect, Layer, Option, Redacted, Schema } from "effect";

import { permissionsOf } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { AuthGateway } from "#workspace/application/auth-gateway.ts";
import { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { makeAccessTokens } from "./access-tokens.ts";
import { attempt } from "./attempt.ts";
import { BetterAuth } from "./better-auth.ts";
import { apiResourceOf, mcpResourceOf, workspaceClaim } from "./oauth.ts";
import { AuthSettings, trustedOriginsOf } from "./settings.ts";

// What Peal reads of Better Auth's answers. A session or key that does not
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

// What Peal reads of an OAuth access token: the user (`sub`), the client
// (`azp`), the scopes the user agreed to, and the workspace a token issued
// after the workspace picker is bound to.
const tokenClaims = {
  azp: Schema.NonEmptyString,
  scope: Schema.optional(Schema.String),
  sub: UserIdSchema,
};

const ApiTokenClaimsSchema = Schema.Struct({
  ...tokenClaims,
  [workspaceClaim]: Schema.optional(WorkspaceIdSchema),
});

const McpTokenClaimsSchema = Schema.Struct({
  ...tokenClaims,
  [workspaceClaim]: WorkspaceIdSchema,
});

const principalOf = (claims: {
  readonly azp: string;
  readonly scope?: string | undefined;
  readonly sub: UserId;
  readonly workspace_id?: WorkspaceId | undefined;
}): UserPrincipal =>
  new UserPrincipal({
    impersonatedBy: Option.none(),
    oauth: Option.some({
      clientId: claims.azp,
      scopes: claims.scope?.split(" ") ?? [],
      workspaceId: Option.fromUndefinedOr(claims.workspace_id),
    }),
    userId: claims.sub,
  });

const decodeSession = Schema.decodeUnknownOption(SessionSchema);

const decodeVerifiedKey = Schema.decodeUnknownOption(VerifiedKeySchema);

/** Better Auth behind the AuthGateway port. */
export const AuthGatewayLive = Layer.effect(
  AuthGateway,
  Effect.gen(function* authGateway() {
    const auth = yield* BetterAuth;
    const { adapter } = yield* Effect.promise(async () => await auth.$context);
    const settings = yield* AuthSettings;
    const trusted = trustedOriginsOf(settings);
    const tokens = yield* makeAccessTokens;

    // A workspace's keys are deleted with it. One that remains, however the
    // workspace went, is no credential.
    const workspaceExists = (workspaceId: WorkspaceId) =>
      attempt(
        async () =>
          await adapter.findOne({
            model: "organization",
            select: ["id"],
            where: [{ field: "id", value: workspaceId }],
          })
      ).pipe(Effect.map((found) => found !== null));

    return AuthGateway.of({
      apiKey: (key) =>
        attempt(
          async () =>
            await auth.api.verifyApiKey({ body: { key: Redacted.value(key) } })
        ).pipe(
          Effect.map(decodeVerifiedKey),
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.succeedNone,
              onSome: ({ key: verified }) =>
                workspaceExists(verified.referenceId).pipe(
                  Effect.map((exists) =>
                    exists
                      ? Option.some(
                          new ApiKeyPrincipal({
                            apiKeyId: verified.id,
                            permissions: permissionsOf(
                              verified.permissions ?? {}
                            ),
                            workspaceId: verified.referenceId,
                          })
                        )
                      : Option.none()
                  )
                ),
            })
          ),
          Effect.withSpan("AuthGateway.apiKey")
        ),
      apiToken: (request) =>
        tokens
          .verify(
            request,
            apiResourceOf(settings.publicUrl),
            ["azp"],
            ApiTokenClaimsSchema
          )
          .pipe(
            Effect.map(principalOf),
            Effect.withSpan("AuthGateway.apiToken")
          ),
      isTrustedOrigin: (origin) => trusted.has(origin),
      mcpToken: (request) =>
        tokens
          .verify(
            request,
            mcpResourceOf(settings.publicUrl),
            ["azp", workspaceClaim],
            McpTokenClaimsSchema
          )
          .pipe(
            Effect.map((claims) => ({
              principal: principalOf(claims),
              workspaceId: claims[workspaceClaim],
            })),
            Effect.withSpan("AuthGateway.mcpToken")
          ),
      session: (cookies, { fresh }) =>
        attempt(
          async () =>
            await auth.api.getSession({
              headers: new Headers({ cookie: Redacted.value(cookies) }),
              // Refreshing would set a cookie on a reply this path does not
              // send. The web app's account menu asks Better Auth for the
              // session (GET /api/auth/get-session), which refreshes it.
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
