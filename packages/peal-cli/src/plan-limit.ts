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

  return planWithRoom === null
    ? `${held} No plan is larger: write to the people who run this server to ask for more, or remove some.`
    : `${held} The ${plans[planWithRoom]} plan has room: an owner or an admin orders it at ${billingUrl}`;
};
