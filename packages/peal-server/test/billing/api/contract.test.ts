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
  catalogueLookupKeysOf,
  rateCard as contractRateCard,
  RateCardSchema,
  stripeTiersOf as contractStripeTiersOf,
  stripeUnitAmountOf as contractStripeUnitAmountOf,
} from "peal-contract/rate-card";

import { BillingIntervalSchema } from "#billing/domain/billing-interval.ts";
import { desiredDayHorizon } from "#billing/domain/desired-day.ts";
import { planAllowances, planPrices } from "#billing/domain/legacy-plans.ts";
import {
  legacyPlans,
  plans,
  trialDays,
  trialPlan,
} from "#billing/domain/plans.ts";
import { currency, displayVatRate } from "#billing/domain/prices.ts";
import {
  accountsCharge,
  accountsMonthly,
  meterCharge,
  MeterSchema,
  rateCard,
  stripeTiersOf,
  stripeUnitAmountOf,
} from "#billing/domain/rate-card.ts";
import { SubscriptionStatusSchema } from "#billing/domain/subscription.ts";
import {
  defaultUsageRangeDays,
  maxUsageRangeDays,
  usageRetentionDays,
} from "#billing/domain/usage-meter.ts";
import { PlanLimitSchema } from "#shared/domain/plan-limit.ts";
import { PaidPlanSchema, PlanSchema } from "#shared/domain/plan.ts";
import { catalogueKeysOf } from "#shared/infrastructure/stripe-settings.ts";

const decodeObjectSchema = Schema.decodeUnknownSync(
  Schema.Struct({
    properties: Schema.Record(
      Schema.String,
      Schema.Struct({ format: Schema.optional(Schema.String) })
    ),
  })
);

const decodeDocument = Schema.decodeUnknownSync(
  Schema.Struct({
    definitions: Schema.Record(
      Schema.String,
      Schema.Struct({ description: Schema.optional(Schema.String) })
    ),
  })
);

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

  // The legacy plans stay so an older client's order still decodes, and
  // is refused as not sold.
  it("takes orders for every paid plan, as the server decodes them", () => {
    expect(ContractOrderablePlanSchema.literals).toStrictEqual(
      PaidPlanSchema.literals
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
    expect(contractRateCard).toStrictEqual(rateCard);
    expect(ContractMeterSchema.literals).toStrictEqual(MeterSchema.literals);
    expect(Schema.decodeUnknownSync(RateCardSchema)(rateCard)).toStrictEqual(
      rateCard
    );
  });

  // The end-to-end tests' stand-in for Stripe lists the catalogue from the
  // contract's copy.
  it("gives the prices at Stripe the server checks", () => {
    expect(contractStripeTiersOf(contractRateCard)).toStrictEqual(
      stripeTiersOf(rateCard)
    );

    for (const meter of MeterSchema.literals) {
      expect(contractStripeUnitAmountOf(meter, contractRateCard)).toBe(
        stripeUnitAmountOf(meter, rateCard)
      );
    }
  });

  // The end-to-end tests' stand-in lists the catalogue under the contract's
  // keys: a server reads the same.
  it.each(["peal", "peal_sandbox"])(
    "names the catalogue's lookup keys under %s as the server does",
    (prefix) => {
      expect(catalogueLookupKeysOf(prefix)).toStrictEqual(
        catalogueKeysOf(prefix)
      );
    }
  );

  // Clients generated from the API read a plain integer into 32 bits.
  it("states the rate card's storage sizes as 64-bit integers", () => {
    const { properties } = decodeObjectSchema(
      Schema.toJsonSchemaDocument(RateCardSchema.fields.storage).schema
    );

    expect(Object.values(properties).map(({ format }) => format)).toStrictEqual(
      ["int64", "int64", "int64"]
    );
  });

  it("shows prices with VAT at the rate card's rate", () => {
    expect(rateCard.displayVatRate).toBe(displayVatRate);
    expect(contractRateCard.displayVatRate).toBe(contractVatRate);
  });

  it.each([-1, 2.5, Number.NaN])(
    "refuses %s in the contract's prices, as the server does",
    (count) => {
      expect(() => contractAccountsMonthly(count)).toThrow(RangeError);
      expect(() => contractAccountsCharge(count)).toThrow(RangeError);
      expect(() => contractMeterCharge("managedAds", count)).toThrow(
        RangeError
      );
    }
  );

  // The API reference reads the plans' descriptions.
  it.each([
    ["Plan", ContractPlanSchema],
    ["PaidPlan", ContractPaidPlanSchema],
  ] as const)("describes per-account pricing in %s", (name, schema) => {
    const { definitions } = decodeDocument(Schema.toJsonSchemaDocument(schema));

    expect(definitions[name]?.description).toContain("payAsYouGo");
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
