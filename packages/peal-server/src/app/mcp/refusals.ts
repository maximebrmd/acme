import { DateTime, Effect, Option } from "effect";
import {
  CurrentMember,
  freeAccountsOf,
  queueHorizonDays,
  rateCard,
} from "peal-contract";
import type { LivePostRefusal, Member, Permission } from "peal-contract";
import { unconfirmedMeters } from "peal-contract/rate-card";

import { ToolRefused } from "#app/mcp/tool-refused.ts";
import { UpgradePaths } from "#shared/application/upgrade-paths.ts";
import type { UpgradePath } from "#shared/application/upgrade-paths.ts";
import type { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Meter } from "#shared/domain/meter.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import type { PlanLimit } from "#shared/domain/plan-limit.ts";
import type { Plan } from "#shared/domain/plan.ts";
import { missingScope } from "#workspace/api/missing-scope.ts";
import { scopeGrants } from "#workspace/api/refusal.ts";

/** Fails the tool with a message the user can act on. */
export const refuse = (message: string) =>
  Effect.fail(new ToolRefused({ message }));

/** Tags a call names that are not the workspace's. */
export const unknownTags = ({
  tagIds,
}: {
  readonly tagIds: readonly string[];
}) =>
  refuse(
    `These tags are not the workspace's: ${tagIds.join(", ")}. list_tags answers its tags.`
  );

// Whose permission is missing, and who can do something about it: a
// partner's key, a workspace's key, or the user's role.
const whoseOf = (member: Member, doing: string, permission: Permission) => {
  if (member.principal._tag === "partnerKey") {
    return `This connection may not ${doing} in this workspace: its partner key does not have the permission ${permission}. Someone who manages the partner account creates a key that has it, in the web app's partner settings; a partner key is never given members, invitations, API keys or billing changes.`;
  }

  return member.principal._tag === "apiKey"
    ? `This connection may not ${doing} in this workspace: its API key does not have the permission ${permission}. An owner or admin of the workspace creates a key that has it, in the web app's settings.`
    : `This connection may not ${doing} in this workspace: the user's role does not allow it (it takes the permission ${permission}). An owner or admin of the workspace can change their role, in the web app's settings.`;
};

/**
 * The connection may not do this, and why: the user did not give the client
 * the scope it takes, which they grant by connecting it again, or their
 * role in the workspace does not allow it, which an owner or admin changes.
 */
export const notAllowed =
  (doing: string) =>
  ({ permission }: { readonly permission: Permission }) =>
    CurrentMember.pipe(
      Effect.flatMap((member) =>
        refuse(
          Option.match(missingScope(member, permission), {
            onNone: () => whoseOf(member, doing, permission),
            onSome: (scope) =>
              `This connection may not ${doing} in this workspace: the user did not give this client the scope ${scope} (${scopeGrants[scope]}). To grant it, the user connects this client to Peal again and allows it there; a connection keeps the scopes it was given until then.`,
          })
        )
      )
    );

const limitNames: Readonly<Record<PlanLimit, string>> = {
  assistantRequests: "assistant requests a day",
  channels: "channels",
  mediaStorage: "bytes of media stored, uploads in progress included",
  members: "members, pending invitations included",
  scheduledPosts: "posts going out a month",
};

const planNames: Readonly<Record<Plan, string>> = {
  agency: "Agency",
  business: "Business",
  free: "Free",
  payAsYouGo: "Per-account pricing",
  pro: "Pro",
  starter: "Starter",
};

const dollars = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

// What a payment method gives, from the rate card: per-account pricing's
// price of an account past the free ones, and the account from which
// they cost less.
const perAccountPrice = (): string => {
  const { bands } = rateCard.prices.usd.accounts;
  const free = freeAccountsOf(rateCard);
  const paid = bands.find(({ monthly }) => monthly > 0);

  return `with per-account pricing, each connected account past the first ${String(free)} costs ${dollars(paid?.monthly ?? 0)} a month, excluding tax, less from account ${String((paid?.upTo ?? free) + 1)} on`;
};

/**
 * What a plan's refusal tells the user through their MCP client: the plan,
 * what it allows and what the workspace holds, then the way out, which is
 * the smallest plan with room, ordered on the billing page (tools order
 * nothing), or, on the largest plan, asking the people who run the server.
 */
export const planRefusalText = (
  { allowed, limit, used }: PlanLimitReached,
  { billingUrl, plan, planWithRoom }: UpgradePath
): string => {
  const on = Option.match(plan, {
    onNone: () => "plan",
    onSome: (current) => `${planNames[current]} plan`,
  });

  const held = `The workspace's ${on} allows ${String(allowed)} ${limitNames[limit]}, and it has ${String(used)}.`;

  return Option.match(planWithRoom, {
    onNone: () =>
      `${held} No plan holds more: the user writes to the people who run this server to ask for more, or removes some.`,
    onSome: (larger) =>
      larger === "payAsYouGo"
        ? `${held} A payment method gives room: ${perAccountPrice()}. An owner or an admin of the workspace adds one on its billing page, ${billingUrl}`
        : `${held} The ${planNames[larger]} plan has room: an owner or an admin of the workspace orders it on its billing page, ${billingUrl}`,
  });
};

/**
 * Refuses a tool the workspace's plan has no room for, with the way out
 * (`planRefusalText`), after `nothing`, what the call left undone, when the
 * tool says it. Built with the toolkit, as its use cases are.
 */
export const planRefusal = UpgradePaths.use((paths) =>
  Effect.succeed(
    (workspaceId: WorkspaceId, nothing = "") =>
      (reached: PlanLimitReached) =>
        paths
          .from(workspaceId, reached.limit, reached.needed)
          .pipe(
            Effect.flatMap((path) =>
              refuse(
                `${nothing === "" ? "" : `${nothing} `}${planRefusalText(reached, path)}`
              )
            )
          )
  )
);

const meterNames: Readonly<Record<Meter, string>> = {
  assistantImages: "writing assistant images on the server's model",
  assistantRequests: "writing assistant requests on the server's model",
  managedAds: "managed ads",
  outboundMessages: "inbox messages sent, comment replies included",
  xApi: "units of X API usage",
};

// What a unit past the allowance costs, from the rate card: never a
// figure the owner has not confirmed.
const unitPrice = (meter: Meter): string => {
  if (unconfirmedMeters.includes(meter)) {
    return "its price past the allowance is not set yet";
  }

  const { cents, per } = rateCard.prices.usd.meters[meter];

  return per === 1
    ? `past the allowance each costs ${dollars(cents)}, excluding tax`
    : `past the allowance ${String(per)} cost ${dollars(cents)}, excluding tax`;
};

/**
 * What a meter's refusal tells the user through their MCP client: what
 * the billing account used of what its month allows, until when, and the
 * way out: a payment method, or a higher ceiling, on the billing page.
 */
export const usageRefusalText = (
  { allowed, meter, reason, resetsAt, used }: AllowanceReached,
  billingUrl: string
): string => {
  const until = DateTime.formatIsoDateUtc(resetsAt);

  const held = `The workspace's billing account used ${String(used)} of the ${String(allowed)} ${meterNames[meter]} it may use this month, which starts again on ${until} (UTC).`;

  if (reason === "ceilingReached" && unconfirmedMeters.includes(meter)) {
    return `${held} Nothing past the allowance is used until its price is set: the user waits until then.`;
  }

  if (reason === "ceilingReached") {
    return `${held} An owner or an admin raises the account's monthly ceiling on its billing page, ${billingUrl} (until the account's first invoice is paid, what its meters bill a month is capped whatever the ceiling), or the user waits until then.`;
  }

  if (reason === "notEnabled") {
    return `${held} The meter is not turned on for this account.`;
  }

  if (reason === "planAllowance") {
    return `${held} The workspace's plan includes no more: an owner or an admin moves it to per-account pricing on its billing page, ${billingUrl}, which bills what passes the allowance (${unitPrice(meter)}), or the user waits until then.`;
  }

  if (reason === "paymentFailed") {
    return `${held} The account's last payment failed, so nothing past the allowance is used until it goes through: an owner or an admin updates the payment method from its billing page, ${billingUrl}.`;
  }

  return `${held} A payment method lets it go on (${unitPrice(meter)}): an owner or an admin of the workspace adds one on its billing page, ${billingUrl}. Reading and publishing go on meanwhile.`;
};

/**
 * Refuses a tool whose meter the billing account used up this month, with
 * the way out (`usageRefusalText`), after `nothing`, what the call left
 * undone. Built with the toolkit, as its use cases are.
 */
export const usageRefusal = UpgradePaths.use((paths) =>
  Effect.succeed(
    (workspaceId: WorkspaceId, nothing = "") =>
      (reached: AllowanceReached) =>
        paths
          .paid(workspaceId)
          .pipe(
            Effect.flatMap(({ billingUrl }) =>
              refuse(
                `${nothing === "" ? "" : `${nothing} `}${usageRefusalText(reached, billingUrl)}`
              )
            )
          )
  )
);

/** A channel set a post names is not the workspace's. */
export const unknownChannelSet = () =>
  refuse(
    "A channel set this names is not the workspace's: list_channel_sets answers its sets, each with its id and its name. Nothing was made."
  );

/** A signature a post names is not the workspace's. */
export const unknownSignature = () =>
  refuse(
    "The signature this names is not the workspace's: list_signatures answers its signatures. Nothing was made."
  );

/**
 * A queue a post is added to is not the workspace's, or the workspace has
 * no default queue.
 */
export const unknownQueue = () =>
  refuse(
    "The queue this names is not the workspace's, or the workspace has no default queue: list_queues answers its queues, the default first. Nothing was made or moved."
  );

/** The queue a post is added to has no free slot. */
export const queueHasNoRoom = ({
  reason,
}: {
  readonly reason: "full" | "noSlots";
}) =>
  refuse(
    reason === "noSlots"
      ? "The queue has no slot: add slots with update_queue, or give the post a time. Nothing was made or moved."
      : `Every slot of the queue's next ${String(queueHorizonDays)} days is taken: add slots with update_queue, or give the post a time. Nothing was made or moved.`
  );

/** What a post that names saved items is refused with when one is gone. */
export const presetRefusals = {
  ChannelSetNotFound: unknownChannelSet,
  SignatureNotFound: unknownSignature,
} as const;

/**
 * Why a post could not be removed from a channel, or edited there, in the
 * user's words.
 */
export const livePostRefusals: Readonly<Record<LivePostRefusal, string>> = {
  alreadyRemoved: "Peal removed it from the platform already",
  approvalRequired:
    "the user's posts need an approval, and an edit would put unreviewed text out at once: an approver makes the edit",
  boostRunning:
    "a boost that is not over shows it: stop the boost first (stop_boost), then remove the post",
  changeInProgress:
    "another change of it is pending: list_post_changes says how that goes",
  channelUnavailable:
    "its channel is disconnected, turned off or must be reconnected: nothing was asked of the platform",
  noPlatformId:
    "Peal has no id for it, or for that part, on the platform, as for a post confirmed by hand: the user changes it there",
  notPublished: "it is not live on that channel",
  notSupported:
    "the platform does not let Peal make that change (get_channel_capabilities says why, in `livePost`): the user makes it there",
};
