import { Effect, Layer, Option, Redacted, Schema } from "effect";

import { permissionsOf } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
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
    const { adapter } = yield* Effect.promise(async () => await auth.$context);
    const trusted = trustedOriginsOf(yield* AuthSettings);

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
      isTrustedOrigin: (origin) => trusted.has(origin),
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
