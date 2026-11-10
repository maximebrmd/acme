import { Schema } from "effect";

import { PaidPlanSchema } from "#shared/domain/plan.ts";

import { BillingIntervalSchema } from "./billing-interval.ts";
import { ExcessSchema } from "./standing.ts";

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
  // A subscription started at `startedAt`, paid each `interval` at `price`,
  // what Stripe charged, VAT included; or in its trial until `trialEnd`,
  // `price` then the plan's, excluding VAT: the confirmation of the
  // contract.
  Schema.TaggedStruct("SubscriptionStarted", {
    interval: BillingIntervalSchema,
    plan: PaidPlanSchema,
    price: MoneySchema,
    // The contract's number, since contracts have one.
    reference: Schema.optionalKey(Schema.String),
    startedAt: Schema.DateTimeUtc,
    trialEnd: Schema.Option(Schema.DateTimeUtc),
  }),
  // The trial ends at `endsAt`, and the workspace then moves to the free
  // plan unless someone orders: `over` is what it holds beyond that plan
  // when it is told, which it then has to come back within.
  Schema.TaggedStruct("TrialEnding", {
    endsAt: Schema.DateTimeUtc,
    over: Schema.Array(ExcessSchema),
    plan: PaidPlanSchema,
  }),
  // A yearly plan renews at `renewsAt`, for `price`, what Stripe will
  // charge, VAT included.
  Schema.TaggedStruct("SubscriptionRenewing", {
    plan: PaidPlanSchema,
    price: MoneySchema,
    // The contract's number, since contracts have one.
    reference: Schema.optionalKey(Schema.String),
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
