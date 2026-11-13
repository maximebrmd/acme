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

import { planAllowances } from "./legacy-plans.ts";
import { freeAccountsOf, rateCard, storageAllowance } from "./rate-card.ts";

/** What a workspace may have, limit by limit. */
export type Allowances = { readonly [L in PlanLimit]: Allowance };

const upTo = (count: number): Allowance => Option.some(count);

const noLimit: Allowance = Option.none();

/** No limit at all, as on a server that does not bill. */
export const unlimited: Allowances = {
  assistantRequests: noLimit,
  channels: noLimit,
  mediaStorage: noLimit,
  members: noLimit,
  scheduledPosts: noLimit,
};

/**
 * What a billing account's allowances are computed from, besides its
 * plan: whether it keeps the free tier (false once staff required a
 * payment method), and the accounts connected across it, which media
 * storage grows with.
 */
export interface AllowanceTerms {
  readonly accounts: number;
  readonly freeTier: boolean;
}

/**
 * The writing assistant's daily requests with a payment method, until its
 * monthly meter replaces them: the legacy pro plan's, so nothing is
 * unlimited meanwhile.
 */
export const payingAssistantRequests = planAllowances.pro.assistantRequests;

/**
 * The allowances of `plan`, per billing account. `free` and `payAsYouGo`
 * are the rate card's: members, posts and workspaces unlimited; the
 * accounts free without a payment method (none once staff required one)
 * and any number with one; media storage fair use; the assistant on the
 * server's models only with a payment method. A legacy plan keeps its own
 * (`legacy-plans.ts`).
 */
export const allowancesOf = (
  plan: Plan,
  { accounts, freeTier }: AllowanceTerms
): Allowances => {
  if (plan === "free") {
    return {
      assistantRequests: upTo(0),
      channels: upTo(freeTier ? freeAccountsOf(rateCard) : 0),
      mediaStorage: upTo(storageAllowance(false, accounts)),
      members: noLimit,
      scheduledPosts: noLimit,
    };
  }

  if (plan === "payAsYouGo") {
    return {
      assistantRequests: payingAssistantRequests,
      channels: noLimit,
      mediaStorage: upTo(storageAllowance(true, accounts)),
      members: noLimit,
      scheduledPosts: noLimit,
    };
  }

  return planAllowances[plan];
};

/** The legacy plans, from the smallest. */
export const legacyPlans: readonly LegacyPlan[] = [
  "free",
  ...LegacyPaidPlanSchema.literals,
];

/**
 * The plans a workspace can be on, from the smallest, for the helpers that
 * need a total order: the legacy plans, then `payAsYouGo`.
 */
export const plans: readonly Plan[] = [...legacyPlans, "payAsYouGo"];

/**
 * The larger of two paid plans, as entitlements rank them: `payAsYouGo`
 * above every legacy plan, as moving to it ends the legacy one, so a
 * workspace that holds both for a moment is on per-account pricing.
 */
export const largerPlan = (left: PaidPlan, right: PaidPlan): PaidPlan =>
  plans.indexOf(right) > plans.indexOf(left) ? right : left;

// Whether per-account pricing holds `needed` of `limit`: media storage
// grows with the accounts connected, so it always does.
const payingHolds = (limit: PlanLimit, needed: number): boolean =>
  limit === "mediaStorage" ||
  Option.match(
    allowancesOf("payAsYouGo", { accounts: 0, freeTier: true })[limit],
    {
      onNone: () => true,
      onSome: (allowed) => needed <= allowed,
    }
  );

/**
 * The plan to offer a workspace its plan refused something: `payAsYouGo`,
 * the only one sold, when it holds what is needed; none from
 * `payAsYouGo`. Legacy plans are never offered.
 */
export const planWithRoom = (
  current: Plan,
  limit: PlanLimit,
  needed: number
): Option.Option<PaidPlan> =>
  current !== "payAsYouGo" && payingHolds(limit, needed)
    ? Option.some("payAsYouGo")
    : Option.none();

/**
 * The plan to order for a workspace that must be paid for: per-account
 * pricing, the only one sold, whatever it is on.
 */
export const planToPay = (): PaidPlan => "payAsYouGo";

/**
 * The plan a legacy trial tried for free, once: `trialDays` days, without a
 * payment method. No new trial starts: the rate card's free accounts
 * replace it. Kept for the trials that still run.
 */
export const trialPlan: LegacyPaidPlan = "pro";

/** How long a trial lasts. */
export const trialDays = 14;
