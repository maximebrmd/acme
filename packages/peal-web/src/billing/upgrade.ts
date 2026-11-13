import { Cause, Exit, Option, Schema } from "effect";
import type { DateTime } from "effect";
import type { BillingAccount } from "peal-contract";
import {
  AssistantQuotaExceeded,
  PaidPlanSchema,
  PlanLimitReached,
  PlanLimitSchema,
  PlanSchema,
  UsageAllowanceReached,
  withDisplayVat,
} from "peal-contract";

import type { AuthClientError } from "#auth/errors.ts";

/**
 * A limit a workspace's plan reached, as the upgrade dialog tells it: what
 * was refused, what the workspace holds against what its plan allows, and
 * the smallest plan with room (none on the largest).
 */
export const LimitReachedSchema = Schema.Struct({
  allowed: Schema.Int,
  limit: PlanLimitSchema,
  plan: PlanSchema,
  planWithRoom: Schema.NullOr(PaidPlanSchema),
  used: Schema.Int,
});

export type LimitReached = typeof LimitReachedSchema.Type;

/**
 * A meter the billing account, without a payment method, used for the
 * month (UTC): what it allows and used, and when it starts again. A
 * payment method lets it go on.
 */
export interface MeterReached {
  readonly allowed: number;
  readonly kind: "meter";
  readonly meter: UsageAllowanceReached["meter"];
  readonly plan: "free";
  readonly planWithRoom: "payAsYouGo";
  readonly resetsAt: DateTime.Utc;
  readonly used: number;
}

/**
 * Why something was refused that a larger plan, or a payment method,
 * allows.
 */
export type UpgradeReason = LimitReached | MeterReached;

/** Whether the reason is a meter's, rather than a plan's limit. */
export const isMeterReason = (reason: UpgradeReason): reason is MeterReached =>
  "kind" in reason;

const isUsage = Schema.is(UsageAllowanceReached);

const isLimit = Schema.is(PlanLimitReached);

const isQuota = Schema.is(AssistantQuotaExceeded);

/** A failure of the API, told by its tag. */
interface Tagged {
  readonly _tag: string;
}

const reasonOf = (failure: Tagged): Option.Option<UpgradeReason> => {
  // Only the lack of a payment method is a way out the dialog offers: a
  // ceiling is raised on the billing page.
  if (isUsage(failure)) {
    return failure.reason === "paymentMethodRequired"
      ? Option.some({
          allowed: failure.allowed,
          kind: "meter",
          meter: failure.meter,
          plan: "free",
          planWithRoom: "payAsYouGo",
          resetsAt: failure.resetsAt,
          used: failure.used,
        })
      : Option.none();
  }

  if (isLimit(failure)) {
    return Option.some({
      allowed: failure.allowed,
      limit: failure.limit,
      plan: failure.plan,
      planWithRoom: failure.planWithRoom,
      used: failure.used,
    });
  }

  // On a server that does not bill, the operator sets the allowance: there
  // is no plan to move to.
  return isQuota(failure) && failure.plan !== null
    ? Option.some({
        allowed: failure.dailyLimit,
        limit: "assistantRequests",
        plan: failure.plan,
        planWithRoom: failure.planWithRoom,
        used: failure.dailyLimit,
      })
    : Option.none();
};

/**
 * The plan limit a request ended on, if it did: every place that sends
 * something a plan can refuse hands it to the upgrade dialog.
 */
export const limitIn = <A, E extends Tagged>(
  exit: Exit.Exit<A, E>
): Option.Option<UpgradeReason> =>
  Exit.isFailure(exit)
    ? Cause.findErrorOption(exit.cause).pipe(Option.flatMap(reasonOf))
    : Option.none();

/** The same, for a failure already taken out of its exit. */
export const limitOfFailure = reasonOf;

const upgrade = {
  plan: PlanSchema,
  planWithRoom: Schema.NullOr(PaidPlanSchema),
};

const MemberLimitSchema = Schema.Struct({
  ...upgrade,
  allowed: Schema.Int,
  code: Schema.Literal("MEMBER_LIMIT_REACHED"),
  limit: PlanLimitSchema,
  used: Schema.Int,
});

const decodeMemberLimit = Schema.decodeUnknownOption(MemberLimitSchema);

/**
 * The limit an error of the sign-in service's routes names: the members a
 * plan allows, when inviting or joining.
 */
export const limitOfAuthError = (
  error: AuthClientError
): Option.Option<UpgradeReason> =>
  decodeMemberLimit(error).pipe(
    Option.map(
      ({ allowed, limit, plan, planWithRoom, used }): UpgradeReason => ({
        allowed,
        limit,
        plan,
        planWithRoom,
        used,
      })
    )
  );

/** A price in cents, with the VAT shown first and without. */
export interface OfferPrice {
  readonly excluded: number;
  readonly included: number;
}

/** `cents` excluding VAT, with the VAT pages show beside (France's). */
export const priced = (cents: number): OfferPrice => ({
  excluded: cents,
  included: withDisplayVat(cents),
});

/** The workspace that bills an account, when it is another. */
export interface BillingWorkspace {
  /** Its name, for a member of it; null for anyone else. */
  readonly name: string | null;
  readonly workspaceId: string;
}

/**
 * The workspace that bills the account `workspaceId` is on, when it is
 * another, from the account the standing tells every member: none where
 * the workspace bills its account, or a server says nothing of it.
 */
export const billedElsewhereOf = (
  account: BillingAccount | undefined,
  workspaceId: string
): Option.Option<BillingWorkspace> =>
  account === undefined || account.billingWorkspaceId === workspaceId
    ? Option.none()
    : Option.some({
        name: account.billingWorkspaceName,
        workspaceId: account.billingWorkspaceId,
      });
