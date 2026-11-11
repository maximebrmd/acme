import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { UserId } from "#shared/domain/ids.ts";
import { isBanned } from "#workspace/domain/ban.ts";
import { ownSession } from "#workspace/domain/own-session.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { AccountDirectory } from "./account-directory.ts";
import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import { NotStaff } from "./not-staff.ts";
import { StaffSettings } from "./staff-settings.ts";
import { StaffTwoStepRequired } from "./staff-two-step-required.ts";

/**
 * Whether a request is staff's: the person in their own session (not an
 * OAuth client, not impersonating anyone), whose account holds the staff
 * role and is not banned, as the database says now; and, on a server that
 * requires it of staff, whose account has two-step verification on.
 */
export class StaffStanding extends Context.Service<
  StaffStanding,
  {
    readonly staffOf: (
      principal: UserPrincipal
    ) => Effect.Effect<
      UserId,
      DirectoryUnavailable | NotStaff | StaffTwoStepRequired
    >;
    /**
     * Whether a staff member may answer legal requests: staff, not banned,
     * and holding the legal role too, as the database says now.
     */
    readonly answersLegalRequests: (
      staffId: UserId
    ) => Effect.Effect<boolean, DirectoryUnavailable>;
  }
>()("peal-server/workspace/application/StaffStanding") {
  static readonly layer = Layer.effect(
    StaffStanding,
    Effect.gen(function* StaffStandingLive() {
      const directory = yield* AccountDirectory;
      const settings = yield* StaffSettings;

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

        // Only staff are told: anyone else still finds no console.
        if (
          settings.twoStepRequired &&
          !Option.exists(standing, ({ twoStepEnabled }) => twoStepEnabled)
        ) {
          return yield* new StaffTwoStepRequired();
        }

        return userId;
      });

      const answersLegalRequests = Effect.fn(
        "StaffStanding.answersLegalRequests"
      )(function* answersLegalRequests(staffId: UserId) {
        const standing = yield* directory.standing(staffId);
        const now = yield* DateTime.now;

        return Option.exists(
          standing,
          ({ ban, legal, staff }) => staff && legal && !isBanned(ban, now)
        );
      });

      return StaffStanding.of({ answersLegalRequests, staffOf });
    })
  );
}
