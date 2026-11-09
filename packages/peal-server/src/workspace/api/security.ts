import {
  Authentication,
  ClientErrorIntake,
  CurrentMember,
  CurrentPrincipal,
  CurrentStaff,
  Forbidden,
  StaffAccess,
  Unauthenticated,
  WorkspaceAccess,
  WorkspaceNotFound,
} from "peal-contract";
import type { Member } from "peal-contract";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import { HttpRouter, HttpServerRequest } from "effect/http";
import { HttpApiError } from "effect/http-api";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { Authenticate } from "#workspace/application/authenticate.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";
import { StaffStanding } from "#workspace/application/staff-standing.ts";
import type { Principal } from "#workspace/domain/principal.ts";

import { memberOf, principalOf, toContractPrincipal } from "./principal.ts";

// Reads change nothing; any other method needs a trusted origin when it
// comes with cookies, which a browser sends to Peal from any site.
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

const notFound = () => Effect.fail(new HttpApiError.NotFound());

/**
 * StaffAccess: staff in their own session, from the session cookie alone,
 * read fresh from the database, so staff signed out, banned or no longer
 * staff a moment ago are refused at once. Anyone else gets 404, a cookie sent
 * from another site included, so the console never tells it is there.
 */
export const StaffAccessLive = Layer.effect(
  StaffAccess,
  Effect.gen(function* staffAccess() {
    const authenticate = yield* Authenticate;
    const standing = yield* StaffStanding;

    return StaffAccess.of({
      session: (httpEffect) =>
        Effect.gen(function* staffSession() {
          const request = yield* HttpServerRequest.HttpServerRequest;
          const cookies = request.headers["cookie"];

          if (cookies === undefined) {
            return yield* notFound();
          }

          if (
            !safeMethods.has(request.method) &&
            !authenticate.isTrustedOrigin(
              Option.fromNullishOr(request.headers["origin"])
            )
          ) {
            return yield* notFound();
          }

          const principal = yield* authenticate
            .session(Redacted.make(cookies), { fresh: true })
            .pipe(
              Effect.catchTags({
                AuthUnavailable: Effect.die,
                NotSignedIn: notFound,
              })
            );

          const userId = yield* standing.staffOf(principal).pipe(
            Effect.catchTags({
              DirectoryUnavailable: Effect.die,
              NotStaff: notFound,
            })
          );

          return yield* httpEffect.pipe(
            Effect.provideService(CurrentStaff, { userId })
          );
        }),
    });
  })
);

// For tests: nobody is staff, and every error report passes the intake.
// HttpApiTest serves every group of the API, so tests provide every
// middleware, whichever groups they exercise.
const noStaffTest = Layer.succeed(
  StaffAccess,
  StaffAccess.of({ session: notFound })
);

const openIntakeTest = Layer.succeed(
  ClientErrorIntake,
  ClientErrorIntake.of((httpEffect) => httpEffect)
);

/**
 * For tests of workspace handlers: every request authenticates as the
 * member's principal and acts as the member, without Better Auth.
 */
export const securityTest = (member: Member) =>
  Layer.mergeAll(
    noStaffTest,
    openIntakeTest,
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
  noStaffTest,
  openIntakeTest,
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

/**
 * For tests of the staff console's handlers: every request to it is the
 * staff member's, and anything behind Authentication answers 401.
 */
export const staffSecurityTest = (userId: UserId) =>
  Layer.mergeAll(
    Layer.succeed(
      StaffAccess,
      StaffAccess.of({
        session: (httpEffect) =>
          httpEffect.pipe(Effect.provideService(CurrentStaff, { userId })),
      })
    ),
    openIntakeTest,
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
