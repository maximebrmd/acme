import { freeAccountsOf, rateCard } from "peal-contract";
import type { PlanLimitReached } from "peal-contract";

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
