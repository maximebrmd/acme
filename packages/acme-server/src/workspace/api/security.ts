import {
  Authentication,
  CurrentMember,
  CurrentPrincipal,
  Forbidden,
  Unauthenticated,
  WorkspaceAccess,
  WorkspaceNotFound,
} from "acme-contract";
import type { Member } from "acme-contract";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import { HttpRouter, HttpServerRequest } from "effect/http";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { Authenticate } from "#workspace/application/authenticate.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";
import type { Principal } from "#workspace/domain/principal.ts";

import { memberOf, principalOf, toContractPrincipal } from "./principal.ts";

// Reads change nothing; any other method needs a trusted origin when it
// comes with cookies, which a browser sends to Acme from any site.
const safeMethods: ReadonlySet<string> = new Set(["GET", "HEAD", "OPTIONS"]);

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

const unauthenticated = () => Effect.fail(new Unauthenticated());

const forbidden = () => Effect.fail(new Forbidden());

const as = (principal: Principal) =>
  Effect.provideService(CurrentPrincipal, toContractPrincipal(principal));

/**
 * Authentication: a bearer token (an OAuth access token issued for the API,
 * or an API key), or the session cookies. Better Auth failing is a server
 * error, not a reason to refuse.
 */
export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* authentication() {
    const authenticate = yield* Authenticate;

    return Authentication.of({
      bearer: (httpEffect, { credential }) =>
        Effect.gen(function* bearer() {
          const request = yield* HttpServerRequest.HttpServerRequest;

          const principal = yield* authenticate
            .bearer(credential, {
              dpopProof: Option.fromNullishOr(request.headers["dpop"]),
              method: request.method,
              path: request.url,
            })
            .pipe(
              Effect.catchTags({
                AuthUnavailable: Effect.die,
                NotSignedIn: unauthenticated,
              })
            );

          return yield* httpEffect.pipe(as(principal));
        }),
      session: (httpEffect) =>
        Effect.gen(function* session() {
          const request = yield* HttpServerRequest.HttpServerRequest;
          const cookies = request.headers["cookie"];

          if (cookies === undefined) {
            return yield* new Unauthenticated();
          }

          const write = !safeMethods.has(request.method);

          if (
            write &&
            !authenticate.isTrustedOrigin(
              Option.fromNullishOr(request.headers["origin"])
            )
          ) {
            return yield* new Forbidden();
          }

          // A write reads the session from the database, so one revoked a
          // moment ago cannot change anything.
          const principal = yield* authenticate
            .session(Redacted.make(cookies), { fresh: write })
            .pipe(
              Effect.catchTags({
                AuthUnavailable: Effect.die,
                NotSignedIn: unauthenticated,
              })
            );

          return yield* httpEffect.pipe(as(principal));
        }),
    });
  })
);

/**
 * WorkspaceAccess: the caller as a member of the workspace in the path. A
 * workspace they do not belong to reads as one that does not exist.
 */
export const WorkspaceAccessLive = Layer.effect(
  WorkspaceAccess,
  Effect.gen(function* workspaceAccess() {
    const members = yield* ResolveMember;

    return WorkspaceAccess.of((httpEffect) =>
      Effect.gen(function* member() {
        const principal = principalOf(yield* CurrentPrincipal);
        const params = yield* HttpRouter.params;
        const workspaceId = decodeWorkspaceId(params["workspaceId"]);

        if (Option.isNone(workspaceId)) {
          return yield* new WorkspaceNotFound();
        }

        const actor = yield* members.resolve(principal, workspaceId.value).pipe(
          Effect.catchTags({
            BannedUser: forbidden,
            DirectoryUnavailable: Effect.die,
            NotAMember: () => Effect.fail(new WorkspaceNotFound()),
            WorkspaceMismatch: forbidden,
          })
        );

        return yield* httpEffect.pipe(
          Effect.provideService(CurrentMember, memberOf(actor, principal))
        );
      })
    );
  })
);

/**
 * For tests of workspace handlers: every request authenticates as the
 * member's principal and acts as the member, without Better Auth.
 */
export const securityTest = (member: Member) =>
  Layer.mergeAll(
    Layer.succeed(
      Authentication,
      Authentication.of({
        bearer: (httpEffect) =>
          httpEffect.pipe(
            Effect.provideService(CurrentPrincipal, member.principal)
          ),
        session: (httpEffect) =>
          httpEffect.pipe(
            Effect.provideService(CurrentPrincipal, member.principal)
          ),
      })
    ),
    Layer.succeed(
      WorkspaceAccess,
      WorkspaceAccess.of((httpEffect) =>
        httpEffect.pipe(Effect.provideService(CurrentMember, member))
      )
    )
  );

/**
 * For tests of endpoints that need no credentials: anything behind
 * Authentication answers 401, as it would to a request without any.
 */
export const anonymousSecurityTest = Layer.mergeAll(
  Layer.succeed(
    Authentication,
    Authentication.of({
      bearer: unauthenticated,
      session: unauthenticated,
    })
  ),
  Layer.succeed(
    WorkspaceAccess,
    WorkspaceAccess.of(() => Effect.fail(new WorkspaceNotFound()))
  )
);
