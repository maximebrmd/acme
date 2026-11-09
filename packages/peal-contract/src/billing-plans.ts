import { Schema } from "effect";

/** The plans a workspace can be on, from the smallest. */
export const PlanSchema = Schema.Literals(["free", "pro", "business"]).annotate(
  { identifier: "Plan" }
);

export type Plan = typeof PlanSchema.Type;

/** The plans a subscription buys. */
export const PaidPlanSchema = Schema.Literals(["pro", "business"]).annotate({
  identifier: "PaidPlan",
});

export type PaidPlan = typeof PaidPlanSchema.Type;

/**
 * What a plan limits: `channels` connected, `members` (pending invitations
 * count when inviting), `scheduledPosts` going out in a calendar month
 * (UTC), and `assistantRequests` in a day (UTC). The server's list
 * (src/shared/domain/plan-limit.ts) is the source; a test keeps them equal.
 */
export const PlanLimitSchema = Schema.Literals([
  "channels",
  "members",
  "scheduledPosts",
  "assistantRequests",
]).annotate({ identifier: "PlanLimit" });

export type PlanLimit = typeof PlanLimitSchema.Type;
