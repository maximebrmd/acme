import { Effect, Layer, Option, Redacted, Schema } from "effect";
import { HttpRouter, HttpServerRequest } from "effect/http";
import type { HttpServerResponse } from "effect/http";
import { HttpApiError } from "effect/http-api";
import {
  Authentication,
  ClientErrorIntake,
  ConnectLinkIntake,
  ContractRequestIntake,
  CurrentMember,
  CurrentPrincipal,
  CurrentStaff,
  Forbidden,
  ReviewVisitor,
  ReviewVisitorAddress,
  StaffAccess,
  Unauthenticated,
  WorkspaceAccess,
  WorkspaceNotFound,
} from "peal-contract";
import type { Member } from "peal-contract";

import {
  changedNothing,
  ChangeMark,
  makeChangeMark,
} from "#shared/api/change-mark.ts";
import { forbidden, refused } from "#shared/api/forbidden.ts";
import { UpgradePaths } from "#shared/application/upgrade-paths.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { ActivityJournal } from "#workspace/application/activity-journal.ts";
import { Authenticate } from "#workspace/application/authenticate.ts";
import { ConnectionJournal } from "#workspace/application/connection-journal.ts";
import type { ContentChange } from "#workspace/application/connection-journal.ts";
import { ImpersonationGuard } from "#workspace/application/impersonation-guard.ts";
import { RequestLimits } from "#workspace/application/request-limits.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";
import { StaffStanding } from "#workspace/application/staff-standing.ts";
import { answerAccessDenied } from "#workspace/domain/membership.ts";
import type { Principal } from "#workspace/domain/principal.ts";

import { recorded } from "./activity-recording.ts";
import { memberOf, principalOf, toContractPrincipal } from "./principal.ts";
import { pastLimit, tooManyRequests } from "./rate-limit.ts";
import { explaining } from "./refusal.ts";

// Reads change nothing; any other method needs a trusted origin when it
// comes with cookies, which a browser sends to Peal from any site.
const safeMethods: ReadonlySet<string> = new Set(["GET", "HEAD", "OPTIONS"]);

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

const unauthenticated = () => Effect.fail(new Unauthenticated());

const as = (principal: Principal) =>
  Effect.provideService(CurrentPrincipal, toContractPrincipal(principal));

// The ids a request's path names, but its workspace's, which the record
// keeps apart.
const objectIdsOf = (
  params: Readonly<Record<string, string | undefined>>
): Readonly<Record<string, string | undefined>> =>
  Object.fromEntries(
    Object.entries(params).filter(([name]) => name !== "workspaceId")
  );

// The groups whose writes create, change or delete content, comments and
// approvals included, the replies sent in public from the inbox and the
// direct messages sent from it: the law has Peal keep each such connection
// a year (ConnectionJournal).
const contentGroups: ReadonlySet<string> = new Set([
  "inbox",
  "inboxMessages",
  "inboxReviews",
  "media",
  "posts",
  "review",
]);

// The requests sent as writes that make nothing: checking a post reads it
// and answers, so its connection is not kept, and the activity log, which
// keeps what was asked to change, leaves it out. A request that makes
// nothing only when asked not to (a dry run) says so itself (ChangeMark).
const checksOnly: ReadonlySet<string> = new Set([
  // A quote checks a boost as making it would, and reserves nothing.
  "ads.quoteBoost",
  // A lookup reads the platform, and answers: its input comes in a body.
  "lookups.run",
  "posts.validate",
]);

// Whether the request changes content.
const changesContent = (
  request: HttpServerRequest.HttpServerRequest,
  group: { readonly identifier: string },
  endpoint: { readonly identifier: string }
) =>
  !safeMethods.has(request.method) &&
  contentGroups.has(group.identifier) &&
  !checksOnly.has(`${group.identifier}.${endpoint.identifier}`);

/** Who made a change to content, and how, as the journal keeps it. */
export const contentChangeOf = (
  principal: Principal,
  access: ContentChange["access"],
  request: HttpServerRequest.HttpServerRequest,
  workspaceId: Option.Option<string>
): ContentChange => {
  const origin = {
    headers: request.headers,
    remoteAddress: request.remoteAddress,
  };

  if (principal._tag === "ApiKeyPrincipal") {
    return {
      access,
      apiKeyId: Option.some(principal.apiKeyId),
      origin,
      userId: Option.none(),
      workspaceId: Option.some(principal.workspaceId),
    };
  }

  // A partner key, in the workspace of its partner the path names.
  if (principal._tag === "PartnerKeyPrincipal") {
    return {
      access,
      apiKeyId: Option.some(principal.partnerKeyId),
      origin,
      userId: Option.none(),
      workspaceId: workspaceId.pipe(Option.flatMap(decodeWorkspaceId)),
    };
  }

  return {
    access,
    apiKeyId: Option.none(),
    origin,
    // Staff acting as the account made it.
    userId: Option.some(
      Option.getOrElse(principal.impersonatedBy, () => principal.userId)
    ),
    workspaceId: workspaceId.pipe(Option.flatMap(decodeWorkspaceId)),
  };
};

/**
 * Keeps the connection of a request that changed content, once its handler
 * answered without an error, unless it said it changed nothing (a dry
 * run). A failure to keep it is logged: the change was made, and the
 * client is told so.
 */
export const journalled =
  (journal: ConnectionJournal["Service"], change: () => ContentChange) =>
  (response: HttpServerResponse.HttpServerResponse) =>
    response.status >= 400
      ? Effect.succeed(response)
      : changedNothing.pipe(
          Effect.flatMap((nothing) =>
            nothing
              ? Effect.void
              : journal
                  .contentChanged(change())
                  .pipe(
                    Effect.catchCause((cause) =>
                      Effect.logError(
                        "Keeping the connection that changed content failed",
                        cause
                      )
                    )
                  )
          ),
          Effect.as(response)
        );

/**
 * Authentication: a bearer token (an OAuth access token issued for the API,
 * or an API key), or the session cookies. Better Auth failing is a server
 * error, not a reason to refuse.
 *
 * A session staff act as someone in goes through the ImpersonationGuard
 * here, before any handler runs: refused once the staff member is no longer
 * staff, and every change it asks for recorded in the audit log under the
 * staff member's name, with the endpoint and the ids its path names. Bearer
 * tokens never act for staff: OAuth tokens carry no impersonation, and
 * staff acting as someone may not grant a client access or create a key.
 *
 * A write to posts or media that succeeds is kept in the ConnectionJournal,
 * whatever authenticated it: the address and protocol it came over, never
 * what it carried.
 *
 * A bearer credential's requests are counted (RequestLimits): each answer
 * says where it stands, and one past the limit is a 429.
 */
export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* authentication() {
    const authenticate = yield* Authenticate;
    const guard = yield* ImpersonationGuard;
    const journal = yield* ConnectionJournal;
    const limits = yield* RequestLimits;

    return Authentication.of({
      bearer: (httpEffect, { credential, endpoint, group }) =>
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

          // A key or an application past its limit is told so before
          // anything is handled.
          const limited = yield* pastLimit(limits, principal);

          if (Option.isSome(limited)) {
            return tooManyRequests(limited.value);
          }

          // What the handler says of the request, for what is kept of it.
          const marked = Effect.provideService(
            ChangeMark,
            yield* makeChangeMark
          );

          if (!changesContent(request, group, endpoint)) {
            return yield* httpEffect.pipe(as(principal), marked);
          }

          const params = yield* HttpRouter.params;

          return yield* httpEffect.pipe(
            as(principal),
            Effect.flatMap(
              journalled(journal, () =>
                contentChangeOf(
                  principal,
                  principal._tag === "UserPrincipal" ? "oauth" : "apiKey",
                  request,
                  Option.fromNullishOr(params["workspaceId"])
                )
              )
            ),
            marked
          );
        }),
      session: (httpEffect, { endpoint, group }) =>
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
            return yield* refused("untrustedOrigin");
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

          yield* guard.admit(principal).pipe(
            Effect.catchTags({
              AuthUnavailable: Effect.die,
              DatabaseError: Effect.die,
              DirectoryUnavailable: Effect.die,
              NotSignedIn: unauthenticated,
            })
          );

          const params = yield* HttpRouter.params;

          if (write) {
            yield* guard
              .changed(principal, {
                objectIds: objectIdsOf(params),
                operation: `${group.identifier}.${endpoint.identifier}`,
                workspaceId: decodeWorkspaceId(params["workspaceId"]),
              })
              .pipe(Effect.orDie);
          }

          const marked = Effect.provideService(
            ChangeMark,
            yield* makeChangeMark
          );

          if (!changesContent(request, group, endpoint)) {
            return yield* httpEffect.pipe(as(principal), marked);
          }

          return yield* httpEffect.pipe(
            as(principal),
            Effect.flatMap(
              journalled(journal, () =>
                contentChangeOf(
                  principal,
                  "session",
                  request,
                  Option.fromNullishOr(params["workspaceId"])
                )
              )
            ),
            marked
          );
        }),
    });
  })
);

/**
 * WorkspaceAccess: the caller as a member of the workspace in the path. A
 * workspace they do not belong to reads as one that does not exist.
 *
 * A member's request that asks to change something (any method but GET,
 * HEAD and OPTIONS) is kept in the workspace's activity log once it is
 * answered, done, refused or failed (ActivityJournal): who asked, through
 * what, the endpoint and the ids its path names, the status and the
 * error's code, never what it carried. Reads leave nothing, and neither
 * does a check (`checksOnly`) or a dry run (ChangeMark).
 */
export const WorkspaceAccessLive = Layer.effect(
  WorkspaceAccess,
  Effect.gen(function* workspaceAccess() {
    const members = yield* ResolveMember;
    const activity = yield* ActivityJournal;

    return WorkspaceAccess.of((httpEffect, { endpoint, group }) =>
      Effect.gen(function* member() {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const principal = principalOf(yield* CurrentPrincipal);
        const params = yield* HttpRouter.params;
        const workspaceId = decodeWorkspaceId(params["workspaceId"]);

        if (Option.isNone(workspaceId)) {
          return yield* new WorkspaceNotFound();
        }

        // A member whose account lacks the two-step verification the
        // workspace requires is told so, and what to do; keys never are.
        const actor = yield* members.resolve(principal, workspaceId.value).pipe(
          Effect.catchTag("DirectoryUnavailable", Effect.die),
          Effect.catch(
            answerAccessDenied({
              BannedUser: forbidden,
              NotAMember: () => Effect.fail(new WorkspaceNotFound()),
              TwoStepRequired: forbidden,
              WorkspaceMismatch: forbidden,
            })
          )
        );

        const current = memberOf(actor, principal);

        // A refusal for a missing permission says whose it is: the
        // application's scope, the key's or the role's.
        const answered = httpEffect.pipe(
          Effect.provideService(CurrentMember, current),
          explaining(current)
        );

        const operation = `${group.identifier}.${endpoint.identifier}`;

        if (safeMethods.has(request.method) || checksOnly.has(operation)) {
          return yield* answered;
        }

        return yield* answered.pipe(
          recorded(activity, {
            named: params,
            operation,
            principal,
            workspaceId: workspaceId.value,
          })
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
              StaffTwoStepRequired: () =>
                Effect.fail(
                  new Forbidden({
                    message:
                      "This server requires staff to have two-step verification on: turn it on in your account settings, then open the console again.",
                    reason: "twoStepRequired",
                  })
                ),
            })
          );

          return yield* httpEffect.pipe(
            Effect.provideService(CurrentStaff, { userId })
          );
        }),
    });
  })
);

// For tests: nobody is staff, and every error report, every request to
// cancel or withdraw and every hosted connect page's passes its intake.
// HttpApiTest serves every group of the API, so tests provide every
// middleware, whichever groups they exercise.
const noStaffTest = Layer.succeed(
  StaffAccess,
  StaffAccess.of({ session: notFound })
);

const openIntakeTest = Layer.mergeAll(
  Layer.succeed(
    ClientErrorIntake,
    ClientErrorIntake.of((httpEffect) => httpEffect)
  ),
  // Visitors of review links come from a synthetic address.
  Layer.succeed(
    ReviewVisitor,
    ReviewVisitor.of((httpEffect) =>
      httpEffect.pipe(
        Effect.provideService(
          ReviewVisitorAddress,
          ReviewVisitorAddress.of({ address: "203.0.113.1" })
        )
      )
    )
  ),
  Layer.succeed(
    ContractRequestIntake,
    ContractRequestIntake.of((httpEffect) => httpEffect)
  ),
  Layer.succeed(
    ConnectLinkIntake,
    ConnectLinkIntake.of((httpEffect) => httpEffect)
  )
);

/**
 * For tests of workspace handlers: every request authenticates as the
 * member's principal and acts as the member, without Better Auth. A plan's
 * refusal names the upgrade `UpgradePaths.layerTest` gives.
 */
export const securityTest = (member: Member) =>
  Layer.mergeAll(
    noStaffTest,
    openIntakeTest,
    UpgradePaths.layerTest,
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
