import { DateTime } from "effect";
import { freeAccountsOf, rateCard } from "peal-contract";
import type { PlanLimitReached, UsageAllowanceReached } from "peal-contract";
import { unconfirmedMeters } from "peal-contract/rate-card";

type Limit = PlanLimitReached["limit"];

const limits: Readonly<Record<Limit, string>> = {
  assistantRequests: "assistant requests a day",
  channels: "channels",
  mediaStorage: "of media stored, uploads in progress included",
  members: "members, pending invitations included",
  scheduledPosts: "posts going out a month",
};

const plans: Readonly<Record<PlanLimitReached["plan"], string>> = {
  agency: "Agency",
  business: "Business",
  free: "Free",
  payAsYouGo: "Per-account pricing",
  pro: "Pro",
  starter: "Starter",
};

const gigabyte = 1_000_000_000;

// Bytes in the decimal units the plans are sold in.
const sizeOf = (bytes: number): string =>
  bytes >= gigabyte
    ? `${String(Math.round(bytes / (gigabyte / 10)) / 10)} GB`
    : `${String(Math.round(bytes / 1_000_000))} MB`;

const amountOf = (limit: Limit, count: number): string =>
  limit === "mediaStorage" ? sizeOf(count) : String(count);

const dollars = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

/**
 * What a payment method gives, from the rate card: per-account pricing's
 * price of an account past the free ones, and the account from which they
 * cost less.
 */
export const perAccountPrice = (): string => {
  const { bands } = rateCard.prices.usd.accounts;
  const free = freeAccountsOf(rateCard);
  const paid = bands.find(({ monthly }) => monthly > 0);

  return `with per-account pricing, each connected account past the first ${String(free)} costs ${dollars(paid?.monthly ?? 0)} a month, excluding tax, less from account ${String((paid?.upTo ?? free) + 1)} on`;
};

/** A plan's limit, what the workspace holds of it, and the way out. */
export type PlanShortfallFields = Pick<
  PlanLimitReached,
  "allowed" | "billingUrl" | "limit" | "plan" | "planWithRoom" | "used"
>;

/**
 * What a plan's refusal means, as the user reads it: the plan, what it
 * allows and what the workspace holds, then the way out, which is the
 * smallest plan with room, ordered on the billing page, or, on the largest
 * plan, asking the people who run the server.
 */
export const planLimitReason = ({
  allowed,
  billingUrl,
  limit,
  plan,
  planWithRoom,
  used,
}: PlanShortfallFields): string => {
  const held = `The workspace's ${plans[plan]} plan allows ${amountOf(limit, allowed)} ${limits[limit]}, and it has ${amountOf(limit, used)}.`;

  if (planWithRoom === null) {
    return `${held} No plan holds more: write to the people who run this server to ask for more, or remove some.`;
  }

  return planWithRoom === "payAsYouGo"
    ? `${held} A payment method gives room: ${perAccountPrice()}. An owner or an admin adds one at ${billingUrl}`
    : `${held} The ${plans[planWithRoom]} plan has room: an owner or an admin orders it at ${billingUrl}`;
};

const meters: Readonly<Record<UsageAllowanceReached["meter"], string>> = {
  assistantImages: "writing assistant images on the server's model",
  assistantRequests: "writing assistant requests on the server's model",
  managedAds: "managed ads",
  outboundMessages: "inbox messages sent, comment replies included",
  xApi: "units of X API usage",
};

// What a unit past the allowance costs, from the rate card: never a figure
// the owner has not confirmed.
const unitPrice = (meter: UsageAllowanceReached["meter"]): string => {
  if (unconfirmedMeters.includes(meter)) {
    return "its price past the allowance is not set yet";
  }

  if (meter === "xApi") {
    return "billed at X's published rates, with nothing added, up to the account's monthly ceiling for X";
  }

  const { cents, per } = rateCard.prices.usd.meters[meter];

  return per === 1
    ? `past the allowance each costs ${dollars(cents)}, excluding tax`
    : `past the allowance ${String(per)} cost ${dollars(cents)}, excluding tax`;
};

/** A meter's refusal, what the account used of it, and the way out. */
export type UsageShortfallFields = Pick<
  UsageAllowanceReached,
  "allowed" | "billingUrl" | "meter" | "reason" | "resetsAt" | "used"
>;

/**
 * What a meter's refusal means, as the user reads it: what the billing
 * account used of what its month allows, until when, and the way out: a
 * payment method, or a higher ceiling, on the billing page.
 */
export const usageLimitReason = ({
  allowed,
  billingUrl,
  meter,
  reason,
  resetsAt,
  used,
}: UsageShortfallFields): string => {
  const held = `The workspace's billing account used ${String(used)} of the ${String(allowed)} ${meters[meter]} it may use this month, which starts again on ${DateTime.formatIsoDateUtc(resetsAt)} (UTC).`;

  if (reason === "ceilingReached" && unconfirmedMeters.includes(meter)) {
    return `${held} Nothing past the allowance is used until its price is set: wait until then.`;
  }

  if (reason === "ceilingReached") {
    return `${held} An owner or an admin raises the account's monthly ceiling at ${billingUrl}, or wait until then.`;
  }

  if (reason === "spendCapReached") {
    return `${held} No invoice of the account was paid yet, and until the account's first invoice is paid, what its meters bill is capped whatever its ceilings: the cap lifts once that invoice is paid (${billingUrl}), or wait until then.`;
  }

  if (reason === "notEnabled") {
    return `${held} The meter is not turned on for this account.`;
  }

  if (reason === "planAllowance") {
    return `${held} The workspace's plan includes no more: an owner or an admin moves it to per-account pricing at ${billingUrl}, which bills what passes the allowance (${unitPrice(meter)}), or wait until then.`;
  }

  if (reason === "paymentFailed") {
    return `${held} The account's last payment failed, so nothing past the allowance is used until it goes through: an owner or an admin updates the payment method from ${billingUrl}.`;
  }

  return `${held} A payment method lets it go on (${unitPrice(meter)}): an owner or an admin adds one at ${billingUrl}. Reading and publishing go on meanwhile.`;
};
