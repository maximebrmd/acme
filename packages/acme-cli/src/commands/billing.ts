import type { Billing, PeriodUsage } from "acme-contract";
import { Console, Effect } from "effect";
import { Command } from "effect/cli";

import { explain } from "#explain.ts";
import { columns, instant } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const allowed = (allowance: number | null) =>
  allowance === null ? "no limit" : String(allowance);

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

  const ends =
    subscription.currentPeriodEnd === null
      ? ""
      : `, ${subscription.cancelAtPeriodEnd ? "ending" : "renewing"} ${instant(subscription.currentPeriodEnd)}`;

  return `Plan: ${billing.plan}, subscription ${subscription.status}${ends}.`;
};

export const billing = Command.make(
  "billing",
  { workspace: workspaceFlag },
  Effect.fn("billing")(function* showBilling({ workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const found = yield* client.billing
      .get({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(`Billing of ${workspace.name}:`);
    yield* Console.log(planLine(found));
    yield* Console.log("Used:");

    for (const line of usageLines(found)) {
      yield* Console.log(line);
    }

    if (found.enabled) {
      yield* Console.log(
        "Owners and admins change the plan on the workspace's Billing page in the web app."
      );
    }
  })
).pipe(
  Command.withDescription(
    "Show the workspace's plan, what it allows and how much of it the workspace uses. It changes nothing."
  )
);
