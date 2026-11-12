import { describe, expect, it } from "@effect/vitest";
import { Duration, Option, Schema } from "effect";
import {
  billingCurrency,
  defaultUsageRangeDays as contractDefaultRange,
  desiredDayHorizonDays,
  maxUsageRangeDays as contractMaxRange,
  usageRetentionDays as contractRetention,
  BillingIntervalSchema as ContractIntervalSchema,
  displayVatRate as contractVatRate,
  OrderablePlanSchema as ContractOrderablePlanSchema,
  planCatalogue,
  trialOffer,
  PaidPlanSchema as ContractPaidPlanSchema,
  PlanLimitSchema as ContractPlanLimitSchema,
  PlanSchema as ContractPlanSchema,
  SubscriptionStatusSchema as ContractStatusSchema,
} from "peal-contract";
import {
  accountsCharge as contractAccountsCharge,
  accountsMonthly as contractAccountsMonthly,
  meterCharge as contractMeterCharge,
  MeterSchema as ContractMeterSchema,
  rateCard as contractRateCard,
  rateCards as contractRateCards,
  RateCardSchema,
} from "peal-contract/rate-card";

import { BillingIntervalSchema } from "#billing/domain/billing-interval.ts";
import { desiredDayHorizon } from "#billing/domain/desired-day.ts";
import {
  planAllowances,
  legacyPlans,
  plans,
  trialDays,
  trialPlan,
} from "#billing/domain/plans.ts";
import {
  currency,
  displayVatRate,
  planPrices,
} from "#billing/domain/prices.ts";
import {
  accountsCharge,
  accountsMonthly,
  meterCharge,
  MeterSchema,
  rateCard,
  rateCards,
} from "#billing/domain/rate-card.ts";
import { SubscriptionStatusSchema } from "#billing/domain/subscription.ts";
import {
  defaultUsageRangeDays,
  maxUsageRangeDays,
  usageRetentionDays,
} from "#billing/domain/usage-meter.ts";
import { PlanLimitSchema } from "#shared/domain/plan-limit.ts";
import {
  LegacyPaidPlanSchema,
  PaidPlanSchema,
  PlanSchema,
} from "#shared/domain/plan.ts";

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

  it("takes orders for the legacy plans only, as the server does", () => {
    expect(ContractOrderablePlanSchema.literals).toStrictEqual(
      LegacyPaidPlanSchema.literals
    );
  });

  it("lists the intervals the server bills", () => {
    expect(ContractIntervalSchema.literals).toStrictEqual(
      BillingIntervalSchema.literals
    );
  });

  // The site and the web app show these before anyone signs in.
  it("publishes the legacy plans' limits and prices the server bills", () => {
    for (const plan of legacyPlans) {
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
      [...legacyPlans].toSorted()
    );
  });

  it("publishes the currency, the VAT rate shown and the trial", () => {
    expect(billingCurrency).toBe(currency);
    expect(contractVatRate).toBe(displayVatRate);
    expect(trialOffer).toStrictEqual({ days: trialDays, plan: trialPlan });
  });

  it("publishes the rate card the server bills with", () => {
    expect(contractRateCards).toStrictEqual(rateCards);
    expect(contractRateCard).toStrictEqual(rateCard);
    expect(ContractMeterSchema.literals).toStrictEqual(MeterSchema.literals);
    expect(Schema.decodeUnknownSync(RateCardSchema)(rateCard)).toStrictEqual(
      rateCard
    );
  });

  it("prices the rate card as the server does", () => {
    for (const count of [0, 2, 3, 10, 61, 300, 3001, 30_000]) {
      expect(contractAccountsMonthly(count)).toBe(accountsMonthly(count));
      expect(contractAccountsCharge(count)).toBe(accountsCharge(count));
    }

    for (const meter of MeterSchema.literals) {
      expect(contractMeterCharge(meter, 12_345)).toBe(
        meterCharge(meter, 12_345)
      );
    }
  });

  it("publishes how far ahead a cancellation may ask its contract to end", () => {
    expect(Duration.days(desiredDayHorizonDays)).toStrictEqual(
      desiredDayHorizon
    );
  });
});
