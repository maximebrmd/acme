import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { UserId } from "#shared/domain/ids.ts";
import { isBanned } from "#workspace/domain/ban.ts";

import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import { MemberDirectory } from "./member-directory.ts";

/**
 * Whether a user may use Peal now: their account exists and staff have not
 * banned them. A session can outlive both in the cookie cache, so endpoints
 * that act for a user outside any workspace ask this, as WorkspaceAccess
 * asks it inside one.
 */
export class AccountStanding extends Context.Service<
  AccountStanding,
  {
    readonly isActive: (
      userId: UserId
    ) => Effect.Effect<boolean, DirectoryUnavailable>;
  }
>()("peal-server/workspace/application/AccountStanding") {
  static readonly layer = Layer.effect(
    AccountStanding,
    Effect.gen(function* AccountStandingLive() {
      const directory = yield* MemberDirectory;

      const isActive = Effect.fn("AccountStanding.isActive")(function* isActive(
        userId: UserId
      ) {
        const found = yield* directory.account(userId);
        const now = yield* DateTime.now;

        return Option.exists(found, (account) => !isBanned(account.ban, now));
      });

      return AccountStanding.of({ isActive });
    })
  );
}
