import { Option } from "effect";

import type { Allowance } from "#shared/domain/allowance.ts";
import type { PlanLimit } from "#shared/domain/plan-limit.ts";
import type { PaidPlan, Plan } from "#shared/domain/plan.ts";

/** What a workspace may have, limit by limit. */
export type Allowances = { readonly [L in PlanLimit]: Allowance };

const upTo = (count: number): Allowance => Option.some(count);

const noLimit: Allowance = Option.none();

/** No limit at all, as on a server that does not bill. */
export const unlimited: Allowances = {
  assistantRequests: noLimit,
  channels: noLimit,
  members: noLimit,
  scheduledPosts: noLimit,
};

/**
 * What each plan allows a workspace: channels connected, members (pending
 * invitations count when inviting), posts scheduled to go out in a calendar
 * month (UTC), and writing assistant requests per day (UTC). Every plan
 * limits the assistant, whose requests cost the server.
 */
export const planAllowances: Readonly<Record<Plan, Allowances>> = {
  business: {
    assistantRequests: upTo(500),
    channels: upTo(30),
    members: upTo(20),
    scheduledPosts: noLimit,
  },
  free: {
    assistantRequests: upTo(10),
    channels: upTo(3),
    members: upTo(2),
    scheduledPosts: upTo(30),
  },
  pro: {
    assistantRequests: upTo(100),
    channels: upTo(10),
    members: upTo(5),
    scheduledPosts: upTo(300),
  },
};

/** The plans a workspace can be on, from the smallest. */
export const plans: readonly Plan[] = ["free", "pro", "business"];

/** The larger of two paid plans. */
export const largerPlan = (left: PaidPlan, right: PaidPlan): PaidPlan =>
  plans.indexOf(right) > plans.indexOf(left) ? right : left;
