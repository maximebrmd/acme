import { describe, expect, it } from "@effect/vitest";
import {
  PaidPlanSchema as ContractPaidPlanSchema,
  PlanLimitSchema as ContractPlanLimitSchema,
  PlanSchema as ContractPlanSchema,
  SubscriptionStatusSchema as ContractStatusSchema,
} from "acme-contract";

import { plans } from "#billing/domain/plans.ts";
import { SubscriptionStatusSchema } from "#billing/domain/subscription.ts";
import { PlanLimitSchema } from "#shared/domain/plan-limit.ts";
import { PaidPlanSchema, PlanSchema } from "#shared/domain/plan.ts";

describe("the contract", () => {
  it("lists the plans, limits and statuses the server knows", () => {
    expect(ContractPlanSchema.literals).toStrictEqual(PlanSchema.literals);
    expect(ContractPlanSchema.literals).toStrictEqual(plans);
    expect(ContractPaidPlanSchema.literals).toStrictEqual(
      PaidPlanSchema.literals
    );
    expect(ContractPlanLimitSchema.literals).toStrictEqual(
      PlanLimitSchema.literals
    );
    expect(ContractStatusSchema.literals).toStrictEqual(
      SubscriptionStatusSchema.literals
    );
  });
});
