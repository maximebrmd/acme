import { Option } from "effect";

import type { Allowance } from "#shared/domain/allowance.ts";
import type { LegacyPaidPlan, LegacyPlan } from "#shared/domain/plan.ts";

import type { Allowances } from "./plans.ts";

const upTo = (count: number): Allowance => Option.some(count);

const noLimit: Allowance = Option.none();

const megabytes = (count: number): Allowance => upTo(count * 1_000_000);

const gigabytes = (count: number): Allowance => upTo(count * 1_000_000_000);

/**
 * What each legacy plan allows a workspace: channels connected, members
 * (pending invitations count when inviting), posts scheduled to go out in
 * a calendar month (UTC), writing assistant requests per day (UTC), and
 * bytes of media stored (decimal units, as the pricing page wrote them).
 * The plans were priced by channels. Kept, unchanged, for the
 * subscriptions that still hold one: no new one is sold, and `free` is
 * the rate card's now (`plans.ts`, `allowancesOf`).
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
 * A legacy plan's published prices, in euro cents, excluding VAT: what Stripe's
 * tax-exclusive prices hold, and what a business with a validated VAT
 * number pays. A year costs ten months.
 */
export interface PlanPrice {
  readonly month: number;
  readonly year: number;
}

/**
 * What each paid plan costs, excluding VAT. Including France's VAT:
 * starter €9 a month or €90 a year, pro €15 or €150, business €30 or €300,
 * agency €60 or €600.
 */
export const planPrices: Readonly<Record<LegacyPaidPlan, PlanPrice>> = {
  agency: { month: 5000, year: 50_000 },
  business: { month: 2500, year: 25_000 },
  pro: { month: 1250, year: 12_500 },
  starter: { month: 750, year: 7500 },
};
