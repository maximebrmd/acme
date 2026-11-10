import { Console, Effect } from "effect";
import { Command } from "effect/cli";
import type { Billing, Excess, PeriodUsage, Standing } from "peal-contract";

import { explain } from "#explain.ts";
import { columns, instant } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const allowed = (allowance: number | null) =>
  allowance === null ? "no limit" : String(allowance);

// Bytes in decimal units, as the pricing page writes storage.
const bytes = (count: number): string =>
  count >= 1_000_000_000
    ? `${(count / 1_000_000_000).toFixed(1)} GB`
    : `${(count / 1_000_000).toFixed(1)} MB`;

const storage = (used: number, allowance: number | null) =>
  `${bytes(used)} of ${allowance === null ? "no limit" : bytes(allowance)}`;

const periodic = (usage: PeriodUsage, allowance: number | null) =>
  `${String(usage.used)} of ${allowed(allowance)}, until ${instant(usage.resetsAt)}`;

const usageLines = (billing: Billing): string[] => {
  const { allowances, usage } = billing;

  return columns([
    [
      "  Channels",
      `${String(usage.channels)} of ${allowed(allowances.channels)}`,
    ],
    ["  Members", `${String(usage.members)} of ${allowed(allowances.members)}`],
    [
      "  Posts this month",
      periodic(usage.scheduledPosts, allowances.scheduledPosts),
    ],
    [
      "  Assistant today",
      periodic(usage.assistantRequests, allowances.assistantRequests),
    ],
    ["  Media stored", storage(usage.mediaStorage, allowances.mediaStorage)],
  ]);
};

const planLine = (billing: Billing): string => {
  if (!billing.enabled || billing.plan === null) {
    return "This server does not bill: nothing is limited.";
  }

  const { subscription } = billing;

  if (subscription === null) {
    return `Plan: ${billing.plan}, with no subscription.`;
  }

  if (subscription.status === "trialing" && subscription.trialEnd !== null) {
    return `Plan: ${billing.plan}, on trial until ${instant(subscription.trialEnd)}, then free unless someone orders.`;
  }

  const ends =
    subscription.currentPeriodEnd === null
      ? ""
      : `, ${subscription.cancelAtPeriodEnd ? "ending" : "renewing"} ${instant(subscription.endsAt ?? subscription.currentPeriodEnd)}`;

  return `Plan: ${billing.plan}, paid each ${subscription.interval}, subscription ${subscription.status}${ends}.`;
};

const heldNames: Readonly<Record<Excess["limit"], string>> = {
  channels: "channels",
  mediaStorage: "of media",
  members: "members",
};

const excess = ({ allowed: plan, limit, used }: Excess): string =>
  limit === "mediaStorage"
    ? `${bytes(used)} ${heldNames[limit]} of ${bytes(plan)}`
    : `${String(used)} ${heldNames[limit]} of ${String(plan)}`;

// What a workspace over its plan is told: what it holds beyond the plan,
// what waits on it, and the way back.
const standingLines = (standing: Standing): string[] => {
  if (standing.over.length === 0) {
    return [];
  }

  const waiting = standing.mustReduce
    ? [
        `Until it is back within its plan, nothing is scheduled or published: the ${String(standing.scheduledPosts)} posts going out this month each fail when due, and can be posted again afterwards.`,
      ]
    : ["Until it is back within its plan's storage, it uploads nothing."];

  const wayOut =
    standing.planWithRoom === null
      ? "No plan holds everything: an owner or an admin chooses which channels and members stay, in the web app, or writes to the people who run this server."
      : `The ${standing.planWithRoom} plan holds everything: an owner or an admin orders it, or chooses which channels and members stay, in the web app.`;

  return [
    `The workspace holds more than its plan allows: ${standing.over.map(excess).join(", ")}.`,
    ...waiting,
    wayOut,
  ];
};

export const billing = Command.make(
  "billing",
  { workspace: workspaceFlag },
  Effect.fn("billing")(function* showBilling({ workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const found = yield* client.billing
      .get({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    const standing = yield* client.billing
      .standing({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(`Billing of ${workspace.name}:`);
    yield* Console.log(planLine(found));

    for (const line of standingLines(standing)) {
      yield* Console.log(line);
    }

    yield* Console.log("Used:");

    for (const line of usageLines(found)) {
      yield* Console.log(line);
    }

    if (found.trial?.available === true) {
      yield* Console.log(
        `This workspace may try the ${found.trial.plan} plan free for ${String(found.trial.days)} days, without a payment method.`
      );
    }

    if (found.enabled) {
      yield* Console.log(
        "Owners and admins order, cancel or withdraw on the workspace's Billing page in the web app."
      );
    }
  })
).pipe(
  Command.withDescription(
    "Show the workspace's plan, what it allows, how much of it the workspace uses, and what it holds beyond the plan, as after a trial. It changes nothing."
  )
);
