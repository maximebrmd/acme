import { Option } from "effect";

import type { Allowance } from "#shared/domain/allowance.ts";
import type { PlanLimit } from "#shared/domain/plan-limit.ts";
import { LegacyPaidPlanSchema } from "#shared/domain/plan.ts";
import type {
  LegacyPaidPlan,
  LegacyPlan,
  PaidPlan,
  Plan,
} from "#shared/domain/plan.ts";

/** What a workspace may have, limit by limit. */
export type Allowances = { readonly [L in PlanLimit]: Allowance };

const upTo = (count: number): Allowance => Option.some(count);

const noLimit: Allowance = Option.none();

const megabytes = (count: number): Allowance => upTo(count * 1_000_000);

const gigabytes = (count: number): Allowance => upTo(count * 1_000_000_000);

/** No limit at all, as on a server that does not bill. */
export const unlimited: Allowances = {
  assistantRequests: noLimit,
  channels: noLimit,
  mediaStorage: noLimit,
  members: noLimit,
  scheduledPosts: noLimit,
};

/**
 * What each plan allows a workspace: channels connected, members (pending
 * invitations count when inviting), posts scheduled to go out in a calendar
 * month (UTC), writing assistant requests per day (UTC), and bytes of media
 * stored (decimal units, as the pricing page writes them). Plans are priced
 * by channels; every plan limits the assistant and storage, which cost the
 * server, and the free plan is kept small.
 */
export const planAllowances: Readonly<Record<LegacyPlan, Allowances>> = {
  agency: {
    assistantRequests: upTo(80),
    channels: upTo(100),
    mediaStorage: gigabytes(250),
    members: noLimit,
    scheduledPosts: noLimit,
  },
  business: {
    assistantRequests: upTo(40),
    channels: upTo(30),
    mediaStorage: gigabytes(75),
    members: noLimit,
    scheduledPosts: noLimit,
  },
  free: {
    assistantRequests: upTo(3),
    channels: upTo(3),
    mediaStorage: megabytes(500),
    members: upTo(2),
    scheduledPosts: upTo(30),
  },
  pro: {
    assistantRequests: upTo(20),
    channels: upTo(10),
    mediaStorage: gigabytes(20),
    members: noLimit,
    scheduledPosts: noLimit,
  },
  starter: {
    assistantRequests: upTo(10),
    channels: upTo(5),
    mediaStorage: gigabytes(5),
    members: upTo(3),
    scheduledPosts: noLimit,
  },
};

/**
 * The allowances of `plan`. Per-account pricing (`payAsYouGo`) is not
 * wired to the rate card yet and nothing records it: until it is, it is
 * held to the free plan, never above what is paid for.
 */
export const allowancesOf = (plan: Plan): Allowances =>
  planAllowances[plan === "payAsYouGo" ? "free" : plan];

/** The legacy plans, from the smallest: what the billing page compares. */
export const legacyPlans: readonly LegacyPlan[] = [
  "free",
  ...LegacyPaidPlanSchema.literals,
];

/**
 * The plans a workspace can be on, from the smallest, for the helpers that
 * need a total order: the legacy plans, then `payAsYouGo`.
 */
export const plans: readonly Plan[] = [...legacyPlans, "payAsYouGo"];

// Where a paid plan ranks among the entitlements a workspace holds. Until
// per-account pricing is wired to the rate card, `allowancesOf` holds it to
// the free plan, so it ranks below every legacy plan: a workspace that also
// holds one keeps that plan's allowances. Wiring it removes this.
const entitlementRank = (plan: PaidPlan): number =>
  plan === "payAsYouGo" ? -1 : plans.indexOf(plan);

/** The larger of two paid plans, as entitlements rank them. */
export const largerPlan = (left: PaidPlan, right: PaidPlan): PaidPlan =>
  entitlementRank(right) > entitlementRank(left) ? right : left;

/**
 * The smallest plan larger than `current` whose allowance of `limit` holds
 * `needed`: the one to offer a workspace its plan refused something. None
 * past the largest plan, which is asked for by quote, and none above
 * `payAsYouGo`.
 */
export const planWithRoom = (
  current: Plan,
  limit: PlanLimit,
  needed: number
): Option.Option<PaidPlan> =>
  Option.fromUndefinedOr(
    LegacyPaidPlanSchema.literals.find(
      (plan) =>
        plans.indexOf(plan) > plans.indexOf(current) &&
        Option.match(planAllowances[plan][limit], {
          onNone: () => true,
          onSome: (allowed) => needed <= allowed,
        })
    )
  );

/**
 * The plan to order for a workspace that must be paid for: the smallest,
 * or the one it has, as in its trial.
 */
export const planToPay = (current: Plan): PaidPlan =>
  current === "free" ? "starter" : current;

/**
 * The plan a workspace may try for free, once: `trialDays` days, without a
 * payment method, after which it is back on the free plan unless it ordered.
 */
export const trialPlan: LegacyPaidPlan = "pro";

/** How long a trial lasts. */
export const trialDays = 14;
