import { Context, DateTime, Effect, Layer, Option, Result } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import type {
  Account,
  WorkspaceMembership,
} from "#workspace/domain/account.ts";
import { isBanned } from "#workspace/domain/ban.ts";
import { BannedUser } from "#workspace/domain/banned-user.ts";
import { userPermissions } from "#workspace/domain/membership.ts";
import { ownSession } from "#workspace/domain/own-session.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { AuthGateway } from "./auth-gateway.ts";
import type { AuthUnavailable } from "./auth-unavailable.ts";
import { DirectoryUnavailable } from "./directory-unavailable.ts";
import { MemberDirectory } from "./member-directory.ts";
import { NotSignedIn } from "./not-signed-in.ts";
import { SecurityPolicies } from "./security-policies.ts";

/**
 * The signed-in user's account, and what they may do in each workspace with
 * the credentials they used: nothing outside the workspace an OAuth token is
 * bound to.
 */
export interface CurrentAccount {
  readonly account: Account;
  readonly principal: UserPrincipal;
  readonly workspaces: readonly {
    readonly membership: WorkspaceMembership;
    readonly permissions: readonly Permission[];
    /**
     * Whether the workspace requires two-step verification: it is still
     * listed while the account does not have it on, and refuses it.
     */
    readonly twoStepRequired: boolean;
  }[];
}

/** The account's two-step verification, as its settings show it. */
export interface TwoStepStatus {
  readonly enabled: boolean;
  /**
   * How many recovery codes are left, for the person in their own session
   * alone: none for an application or staff acting as them.
   */
  readonly recoveryCodesLeft: Option.Option<number>;
  /** The workspaces it belongs to that require it, which keep it on. */
  readonly requiredBy: readonly {
    readonly name: string;
    readonly workspaceId: WorkspaceMembership["id"];
  }[];
}

export class Accounts extends Context.Service<
  Accounts,
  {
    readonly current: (
      principal: UserPrincipal
    ) => Effect.Effect<
      CurrentAccount,
      BannedUser | DirectoryUnavailable | NotSignedIn
    >;
    readonly twoStep: (
      principal: UserPrincipal
    ) => Effect.Effect<
      TwoStepStatus,
      AuthUnavailable | BannedUser | DirectoryUnavailable | NotSignedIn
    >;
  }
>()("peal-server/workspace/application/Accounts") {
  static readonly layer = Layer.effect(
    Accounts,
    Effect.gen(function* accounts() {
      const directory = yield* MemberDirectory;
      const policies = yield* SecurityPolicies;
      const gateway = yield* AuthGateway;

      const current = Effect.fn("Accounts.current")(function* current(
        principal: UserPrincipal
      ) {
        const found = yield* directory.account(principal.userId);

        // A session can outlive its user for a few minutes in the cookie
        // cache, as when the account was just deleted.
        if (Option.isNone(found)) {
          return yield* new NotSignedIn();
        }

        const account = found.value;
        const now = yield* DateTime.now;

        if (isBanned(account.ban, now)) {
          return yield* new BannedUser({ userId: account.id });
        }

        const required = yield* policies
          .requiredAmong(account.workspaces.map(({ id }) => id))
          .pipe(
            Effect.mapError(({ cause }) => new DirectoryUnavailable({ cause }))
          );

        return {
          account,
          principal,
          workspaces: account.workspaces.map((membership) => ({
            membership,
            permissions: userPermissions(
              principal,
              membership.id,
              membership.role
            ),
            twoStepRequired: required.has(membership.id),
          })),
        };
      });

      const twoStep = Effect.fn("Accounts.twoStep")(function* twoStep(
        principal: UserPrincipal
      ) {
        const { account, workspaces } = yield* current(principal);

        const recoveryCodesLeft =
          account.twoStepEnabled && Result.isSuccess(ownSession(principal))
            ? yield* gateway.recoveryCodesLeft(account.id)
            : Option.none();

        return {
          enabled: account.twoStepEnabled,
          recoveryCodesLeft,
          requiredBy: workspaces
            .filter(({ twoStepRequired }) => twoStepRequired)
            .map(({ membership }) => ({
              name: membership.name,
              workspaceId: membership.id,
            })),
        };
      });

      return Accounts.of({ current, twoStep });
    })
  );
}
