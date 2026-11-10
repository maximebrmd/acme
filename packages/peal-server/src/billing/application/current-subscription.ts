import { Array as Arr, DateTime, Effect, Option, Order } from "effect";

import { entitlementsOf } from "#billing/domain/entitlements.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { Subscriptions } from "./ports/subscriptions.ts";

/** The subscription that gives the workspace its plan now, if any. */
export const currentSubscription = (workspaceId: WorkspaceId) =>
  Subscriptions.use((subscriptions) =>
    subscriptions.ofWorkspace(workspaceId)
  ).pipe(Effect.map((held) => entitlementsOf(held).subscription));

/** The subscription a request speaks of, and whether it has ended since. */
export interface ContractAt {
  readonly endedSince: boolean;
  readonly subscription: Subscription;
}

const byStart = Order.mapInput(Order.Number, ({ startedAt }: Subscription) =>
  Option.match(startedAt, {
    onNone: () => 0,
    onSome: DateTime.toEpochMillis,
  })
);

// Whether it ran at `at`, and has been cancelled since.
const ranAt = (subscription: Subscription, at: DateTime.Utc): boolean =>
  subscription.status === "canceled" &&
  Option.exists(subscription.startedAt, (startedAt) =>
    DateTime.isLessThanOrEqualTo(startedAt, at)
  ) &&
  Option.exists(subscription.currentPeriodEnd, (end) =>
    DateTime.isGreaterThanOrEqualTo(end, at)
  );

/**
 * The subscription a request received at `receivedAt` speaks of: the one
 * that gives the workspace its plan now, `named` if the request named one;
 * or, when none does, the latest one that ran when the request came and
 * ended since, as while the request waited for its link or for staff: what
 * it asked still counts from the day it came.
 */
export const contractAt = (
  workspaceId: WorkspaceId,
  named: Option.Option<string>,
  receivedAt: DateTime.Utc
) =>
  Subscriptions.use((subscriptions) =>
    subscriptions.ofWorkspace(workspaceId)
  ).pipe(
    Effect.map((held): Option.Option<ContractAt> => {
      const meant = held.filter(({ stripeSubscriptionId }) =>
        Option.match(named, {
          onNone: () => true,
          onSome: (id) => id === stripeSubscriptionId,
        })
      );

      const current = entitlementsOf(held).subscription.pipe(
        Option.filter((subscription) => meant.includes(subscription)),
        Option.map((subscription) => ({ endedSince: false, subscription }))
      );

      return current.pipe(
        Option.orElse(() =>
          Arr.last(
            Arr.sort(
              meant.filter((subscription) => ranAt(subscription, receivedAt)),
              byStart
            )
          ).pipe(
            Option.map((subscription) => ({ endedSince: true, subscription }))
          )
        )
      );
    })
  );

/** The workspace's subscription with this Stripe id, whatever its state. */
export const subscriptionNamed = (workspaceId: WorkspaceId, id: string) =>
  Subscriptions.use((subscriptions) =>
    subscriptions.ofWorkspace(workspaceId)
  ).pipe(
    Effect.map((held) =>
      Arr.findFirst(
        held,
        ({ stripeSubscriptionId }) => stripeSubscriptionId === id
      )
    )
  );
