import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import type {
  Account,
  WorkspaceMembership,
} from "#workspace/domain/account.ts";
import { isBanned } from "#workspace/domain/ban.ts";
import { BannedUser } from "#workspace/domain/banned-user.ts";
import { userPermissions } from "#workspace/domain/membership.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import { MemberDirectory } from "./member-directory.ts";
import { NotSignedIn } from "./not-signed-in.ts";

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
  }
>()("acme-server/workspace/application/Accounts") {
  static readonly layer = Layer.effect(
    Accounts,
    Effect.gen(function* accounts() {
      const directory = yield* MemberDirectory;

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
          })),
        };
      });

      return Accounts.of({ current });
    })
  );
}
