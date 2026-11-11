import { describe, expect, it } from "@effect/vitest";
import { Duration, Option } from "effect";
import {
  billingCurrency,
  defaultUsageRangeDays as contractDefaultRange,
  desiredDayHorizonDays,
  maxUsageRangeDays as contractMaxRange,
  usageRetentionDays as contractRetention,
  BillingIntervalSchema as ContractIntervalSchema,
  displayVatRate as contractVatRate,
  planCatalogue,
  trialOffer,
  PaidPlanSchema as ContractPaidPlanSchema,
  PlanLimitSchema as ContractPlanLimitSchema,
  PlanSchema as ContractPlanSchema,
  SubscriptionStatusSchema as ContractStatusSchema,
} from "peal-contract";

import { BillingIntervalSchema } from "#billing/domain/billing-interval.ts";
import { desiredDayHorizon } from "#billing/domain/desired-day.ts";
import {
  planAllowances,
  plans,
  trialDays,
  trialPlan,
} from "#billing/domain/plans.ts";
import {
  currency,
  displayVatRate,
  planPrices,
} from "#billing/domain/prices.ts";
import { SubscriptionStatusSchema } from "#billing/domain/subscription.ts";
import {
  defaultUsageRangeDays,
  maxUsageRangeDays,
  usageRetentionDays,
} from "#billing/domain/usage-meter.ts";
import { PlanLimitSchema } from "#shared/domain/plan-limit.ts";
import { PaidPlanSchema, PlanSchema } from "#shared/domain/plan.ts";

describe("the contract", () => {
  it("states the usage reports' ranges and retention the server keeps", () => {
    expect(contractMaxRange).toBe(maxUsageRangeDays);
    expect(contractDefaultRange).toBe(defaultUsageRangeDays);
    expect(contractRetention).toBe(usageRetentionDays);
  });

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

  it("lists the intervals the server bills", () => {
    expect(ContractIntervalSchema.literals).toStrictEqual(
      BillingIntervalSchema.literals
    );
  });

  // The site and the web app show these before anyone signs in.
  it("publishes the plans' limits and prices the server bills", () => {
    for (const plan of plans) {
      const { limits, price } = planCatalogue[plan];

      expect(limits).toStrictEqual(
        Object.fromEntries(
          Object.entries(planAllowances[plan]).map(([limit, allowance]) => [
            limit,
            Option.getOrNull(allowance),
          ])
        )
      );
      expect(price).toStrictEqual(plan === "free" ? null : planPrices[plan]);
    }

    expect(Object.keys(planCatalogue).toSorted()).toStrictEqual(
      [...plans].toSorted()
    );
  });

  it("publishes the currency, the VAT rate shown and the trial", () => {
    expect(billingCurrency).toBe(currency);
    expect(contractVatRate).toBe(displayVatRate);
    expect(trialOffer).toStrictEqual({ days: trialDays, plan: trialPlan });
  });

  it("publishes how far ahead a cancellation may ask its contract to end", () => {
    expect(Duration.days(desiredDayHorizonDays)).toStrictEqual(
      desiredDayHorizon
    );
  });
});
