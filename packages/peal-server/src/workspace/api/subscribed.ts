import { Option } from "effect";
import { WorkspaceSubscribed } from "peal-contract";

import type { WorkspaceSubscribed as Refused } from "#workspace/application/workspace-subscribed.ts";

/**
 * The contract's refusal of a deletion Stripe may still bill, with what
 * cancelling would end.
 */
export const subscribedOf = ({ subscriptions }: Refused): WorkspaceSubscribed =>
  new WorkspaceSubscribed({
    subscriptions: subscriptions.map(({ paidUntil, plan, workspaceId }) => ({
      paidUntil: Option.getOrNull(paidUntil),
      plan: Option.getOrNull(plan),
      workspaceId,
    })),
  });
