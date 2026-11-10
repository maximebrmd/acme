// Billing as the other contexts see it, for their tests: every workspace on
// one plan, or on none, as on a server that does not bill.
import { Effect, Layer, Option } from "effect";

import { ContractRecords } from "#billing/application/ports/contract-records.ts";
import { ContractReferences } from "#billing/application/ports/contract-references.ts";
import { ContractRequests } from "#billing/application/ports/contract-requests.ts";
import { MemberAddresses } from "#billing/application/ports/member-addresses.ts";
import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { Trials } from "#billing/application/ports/trials.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { Entitlements, unmetered } from "#billing/domain/entitlements.ts";
import { Subscription } from "#billing/domain/subscription.ts";
import { Pseudonyms } from "#shared/application/pseudonyms.ts";
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
    forgetPseudonyms: () => Effect.succeed(0),
    record: () => Effect.succeed(true),
    reserve: () => Effect.succeed(true),
    used: () => Effect.succeed(false),
    usedByPseudonym: () => Effect.succeed(false),
  })
);

/** No order, withdrawal, request or contract number kept. */
export const NoContractsTest = Layer.mergeAll(
  Layer.succeed(
    ContractRecords,
    ContractRecords.of({
      ofUser: () => Effect.succeed({ orders: [], withdrawals: [] }),
      purge: () => Effect.succeed(0),
    })
  ),
  Layer.succeed(
    ContractRequests,
    ContractRequests.of({
      byConfirmation: () => Effect.succeedNone,
      byId: () => Effect.succeedNone,
      claimAcknowledgement: () => Effect.succeed(true),
      eraseWorkspace: () => Effect.void,
      forgetUser: () => Effect.void,
      ofUser: () => Effect.succeed([]),
      open: () => Effect.succeed([]),
      pending: () => Effect.succeed([]),
      purge: () => Effect.succeed(0),
      save: () => Effect.void,
      setConfirmation: () => Effect.void,
    })
  ),
  Layer.succeed(
    ContractReferences,
    ContractReferences.of({
      eraseWorkspace: () => Effect.void,
      find: () => Effect.succeedNone,
      issue: () => Effect.succeed("0000-0000-0000"),
    })
  )
);

/** Stripe for tests that never call it: any call dies. */
export const StripeUncalledTest = Layer.mock(StripeContracts, {});

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

/** Members whose addresses billing is not told. */
export const NoAddressesTest = Layer.succeed(
  MemberAddresses,
  MemberAddresses.of({ of: () => Effect.succeed(Option.none()) })
);

/** Pseudonyms that spell the address out, for tests to read. */
export const PlainPseudonymsTest = Layer.succeed(
  Pseudonyms,
  Pseudonyms.of({
    ofEmail: (email) => Effect.succeed(`pseudonym:${email.toLowerCase()}`),
  })
);
