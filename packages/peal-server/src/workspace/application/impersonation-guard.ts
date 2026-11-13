import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { isBanned } from "#workspace/domain/ban.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { AccountDirectory } from "./account-directory.ts";
import type { AuthUnavailable } from "./auth-unavailable.ts";
import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import { ImpersonationLog } from "./impersonation-log.ts";
import { ImpersonationSessions } from "./impersonation-sessions.ts";
import { NotSignedIn } from "./not-signed-in.ts";

/** A change a request asks for, as the HTTP layer names it. */
export interface RequestedChange {
  /** The ids the request named, by name (`postId`), never its content. */
  readonly objectIds: Readonly<Record<string, string | undefined>>;
  /** `group.endpoint`, or `auth:/path` for the sign-in service's routes. */
  readonly operation: string;
  readonly workspaceId: Option.Option<WorkspaceId>;
}

/**
 * What every request made in a session staff act as someone in goes
 * through, in the HTTP layer, before its handler runs, so no handler can
 * skip it: the staff member must still be staff, unbanned, as the database
 * says now, and each change they ask for is recorded under their name.
 * Requests in anyone's own session pass untouched.
 */
export class ImpersonationGuard extends Context.Service<
  ImpersonationGuard,
  {
    /**
     * Lets the request through, or, when the staff member behind it is no
     * longer staff, is banned or is gone, ends every session they act as
     * someone in, records each end, and refuses it (NotSignedIn).
     */
    readonly admit: (
      principal: UserPrincipal
    ) => Effect.Effect<
      void,
      AuthUnavailable | DatabaseError | DirectoryUnavailable | NotSignedIn
    >;
    /** Records a change asked for while acting as someone. */
    readonly changed: (
      principal: UserPrincipal,
      change: RequestedChange
    ) => Effect.Effect<void, DatabaseError>;
    /** Records that staff stopped acting as someone, through `operation`. */
    readonly stopped: (
      principal: UserPrincipal,
      operation: string
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/workspace/application/ImpersonationGuard") {
  static readonly layer = Layer.effect(
    ImpersonationGuard,
    Effect.gen(function* ImpersonationGuardLive() {
      const directory = yield* AccountDirectory;
      const sessions = yield* ImpersonationSessions;
      const log = yield* ImpersonationLog;

      const admit = Effect.fn("ImpersonationGuard.admit")(function* admit(
        principal: UserPrincipal
      ) {
        if (Option.isNone(principal.impersonatedBy)) {
          return;
        }

        const staffId = principal.impersonatedBy.value;
        const standing = yield* directory.standing(staffId);
        const now = yield* DateTime.now;

        const staff = Option.exists(
          standing,
          ({ ban, staff: isStaff }) => isStaff && !isBanned(ban, now)
        );

        // Staff no longer: every session it impersonates ends.
        yield* staff
          ? Effect.void
          : sessions.endBy(staffId).pipe(
              Effect.flatMap((ended) =>
                Effect.forEach(
                  ended,
                  (userId) => log.ended({ staffId, userId }),
                  { discard: true }
                )
              ),
              Effect.andThen(Effect.fail(new NotSignedIn()))
            );
      });

      return ImpersonationGuard.of({
        admit,
        changed: (principal, change) =>
          Option.match(principal.impersonatedBy, {
            onNone: () => Effect.void,
            onSome: (staffId) =>
              log.changed({ ...change, staffId, userId: principal.userId }),
          }),
        stopped: (principal, operation) =>
          Option.match(principal.impersonatedBy, {
            onNone: () => Effect.void,
            onSome: (staffId) =>
              log.stopped({ operation, staffId, userId: principal.userId }),
          }),
      });
    })
  );
}
