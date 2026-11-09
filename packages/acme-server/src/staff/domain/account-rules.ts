import { DateTime, Option, Result } from "effect";

import type { UserId } from "#shared/domain/ids.ts";

import { ActionRefused } from "./action-refused.ts";
import type { StaffAction } from "./staff-action.ts";

/** What the rules read of the account staff act on. */
export interface Target {
  readonly emailVerified: boolean;
  readonly id: UserId;
  readonly staff: boolean;
}

/** What staff ask for, with what the action needs. */
export type Request =
  | { readonly action: "ban"; readonly expiresAt: Option.Option<DateTime.Utc> }
  | { readonly action: Exclude<StaffAction, "ban"> };

const refuse = (reason: ActionRefused["reason"]) =>
  Result.fail(new ActionRefused({ reason }));

// Actions that would lock staff out of their own account, or hand them a
// session of their own, which they have already.
const notOnSelf: ReadonlySet<StaffAction> = new Set([
  "ban",
  "impersonate",
  "revokeSessions",
]);

/**
 * Whether staff may do this to the account at `now`. Staff never ban, sign
 * out or impersonate themselves, never impersonate other staff, who would
 * then act with their rights, and only resend a confirmation the account
 * still needs. A ban ends in the future, if it ends.
 */
export const mayAct = (
  staffId: UserId,
  target: Target,
  request: Request,
  now: DateTime.Utc
): Result.Result<void, ActionRefused> => {
  if (notOnSelf.has(request.action) && target.id === staffId) {
    return refuse("self");
  }

  if (request.action === "impersonate" && target.staff) {
    return refuse("staff");
  }

  if (request.action === "resendVerification" && target.emailVerified) {
    return refuse("verified");
  }

  if (
    request.action === "ban" &&
    Option.exists(request.expiresAt, (end) => !DateTime.isGreaterThan(end, now))
  ) {
    return refuse("expired");
  }

  return Result.succeed(undefined);
};
