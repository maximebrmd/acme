import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { UserId } from "#shared/domain/ids.ts";
import { isBanned } from "#workspace/domain/ban.ts";
import { ownSession } from "#workspace/domain/own-session.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { AccountDirectory } from "./account-directory.ts";
import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import { NotStaff } from "./not-staff.ts";

/**
 * Whether a request is staff's: the person in their own session (not an
 * OAuth client, not impersonating anyone), whose account holds the staff
 * role and is not banned, as the database says now.
 */
export class StaffStanding extends Context.Service<
  StaffStanding,
  {
    readonly staffOf: (
      principal: UserPrincipal
    ) => Effect.Effect<UserId, DirectoryUnavailable | NotStaff>;
  }
>()("peal-server/workspace/application/StaffStanding") {
  static readonly layer = Layer.effect(
    StaffStanding,
    Effect.gen(function* StaffStandingLive() {
      const directory = yield* AccountDirectory;

      const staffOf = Effect.fn("StaffStanding.staffOf")(function* staffOf(
        principal: UserPrincipal
      ) {
        const userId = yield* Effect.fromResult(ownSession(principal)).pipe(
          Effect.mapError(() => new NotStaff())
        );

        const standing = yield* directory.standing(userId);
        const now = yield* DateTime.now;

        const isStaff = Option.exists(
          standing,
          ({ ban, staff }) => staff && !isBanned(ban, now)
        );

        if (!isStaff) {
          return yield* new NotStaff();
        }

        return userId;
      });

      return StaffStanding.of({ staffOf });
    })
  );
}
