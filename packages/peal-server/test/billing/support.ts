// Billing as the other contexts see it, for their tests: every workspace on
// one plan, or on none, as on a server that does not bill.
import { Effect, Layer, Option } from "effect";

import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { Trials } from "#billing/application/ports/trials.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { Entitlements, unmetered } from "#billing/domain/entitlements.ts";
import { Subscription } from "#billing/domain/subscription.ts";
import type { Plan } from "#shared/domain/plan.ts";

/** Every workspace on `plan`, without a subscription. */
export const everyWorkspaceOn = (plan: Plan) =>
  Layer.succeed(
    WorkspaceEntitlements,
    WorkspaceEntitlements.of({
      of: () =>
        Effect.succeed(
          new Entitlements({
            plan: Option.some(plan),
            subscription: Option.none(),
          })
        ),
    })
  );

/** A server that does not bill: nothing is limited. */
export const UnmeteredTest = Layer.succeed(
  WorkspaceEntitlements,
  WorkspaceEntitlements.of({ of: () => Effect.succeed(unmetered) })
);

/** What a subscription needs, the rest left to defaults. */
export type SubscriptionFields = Pick<
  Subscription,
  "plan" | "status" | "workspaceId"
> &
  Partial<Omit<Subscription, "plan" | "status" | "workspaceId">>;

/**
 * A monthly subscription, with synthetic Stripe ids, and no dates but
 * those given.
 */
export const subscriptionOf = (fields: SubscriptionFields): Subscription =>
  new Subscription({
    cancelAtPeriodEnd: false,
    currentPeriodEnd: Option.none(),
    currentPeriodStart: Option.none(),
    interval: "month",
    startedAt: Option.none(),
    stripeCustomerId: "cus_synthetic",
    stripeSubscriptionId: "sub_synthetic",
    trialEnd: Option.none(),
    ...fields,
  });

/** Trials nobody started, which record nothing. */
export const NoTrialsTest = Layer.succeed(
  Trials,
  Trials.of({
    record: () => Effect.void,
    used: () => Effect.succeed(false),
  })
);

/** The subscriptions given, in memory, which erasing and forgetting skip. */
export const subscriptionsHolding = (held: readonly Subscription[]) =>
  Layer.succeed(
    Subscriptions,
    Subscriptions.of({
      eraseWorkspace: () => Effect.void,
      forgetUser: () => Effect.void,
      ofWorkspace: (workspaceId) =>
        Effect.succeed(
          held.filter(
            (subscription) => subscription.workspaceId === workspaceId
          )
        ),
      record: () => Effect.succeed("recorded" as const),
      remindable: () => Effect.succeed(held),
    })
  );
