import { Schema } from "effect";

import { PaidPlanSchema } from "#shared/domain/plan.ts";

import { BillingIntervalSchema } from "./billing-interval.ts";

/** An amount of money, in the currency's smallest unit (cents). */
export const MoneySchema = Schema.Struct({
  amount: Schema.Int,
  currency: Schema.NonEmptyString,
});

export type Money = typeof MoneySchema.Type;

/**
 * What billing tells the members who manage a workspace's billing, in the
 * app and by email, whatever their email choices: these are reminders and
 * confirmations consumer law asks for.
 */
export const BillingNoticeSchema = Schema.Union([
  // A subscription started at `startedAt`, paid each `interval` at `price`
  // excluding VAT, or in its trial until `trialEnd`: the confirmation of
  // the contract.
  Schema.TaggedStruct("SubscriptionStarted", {
    interval: BillingIntervalSchema,
    plan: PaidPlanSchema,
    price: MoneySchema,
    startedAt: Schema.DateTimeUtc,
    trialEnd: Schema.Option(Schema.DateTimeUtc),
  }),
  // The trial ends at `endsAt`, and the workspace then moves to the free
  // plan unless someone orders.
  Schema.TaggedStruct("TrialEnding", {
    endsAt: Schema.DateTimeUtc,
    plan: PaidPlanSchema,
  }),
  // A yearly plan renews at `renewsAt`, for `price` excluding VAT.
  Schema.TaggedStruct("SubscriptionRenewing", {
    plan: PaidPlanSchema,
    price: MoneySchema,
    renewsAt: Schema.DateTimeUtc,
  }),
  // The subscription was cancelled, and ends at `endsAt`.
  Schema.TaggedStruct("SubscriptionCancelled", {
    endsAt: Schema.DateTimeUtc,
    plan: PaidPlanSchema,
  }),
  // A consumer withdrew from the contract at `withdrawnAt`: it ended then,
  // and `refunded` goes back to them.
  Schema.TaggedStruct("SubscriptionWithdrawn", {
    plan: PaidPlanSchema,
    refunded: MoneySchema,
    withdrawnAt: Schema.DateTimeUtc,
  }),
]);

export type BillingNotice = typeof BillingNoticeSchema.Type;
