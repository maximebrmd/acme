// Billing as the other contexts see it, for their tests: every workspace on
// one plan, or on none, as on a server that does not bill.
import { randomUUID } from "node:crypto";

import { DateTime, Effect, Layer, Option, Ref } from "effect";
import { SqlClient } from "effect/sql";

import { AccountViews } from "#billing/application/account-views.ts";
import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { AccountPayers } from "#billing/application/ports/account-payers.ts";
import { BillingAccountStore } from "#billing/application/ports/billing-account-store.ts";
import { ContractRecords } from "#billing/application/ports/contract-records.ts";
import { ContractReferences } from "#billing/application/ports/contract-references.ts";
import { ContractRequests } from "#billing/application/ports/contract-requests.ts";
import { MemberAddresses } from "#billing/application/ports/member-addresses.ts";
import { PlanPools } from "#billing/application/ports/plan-pools.ts";
import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { Trials } from "#billing/application/ports/trials.ts";
import { UsageLedger } from "#billing/application/ports/usage-ledger.ts";
import type { WorkspaceUsageRecord } from "#billing/application/ports/usage-ledger.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import {
  BillingAccount,
  BillingAccountIdSchema,
} from "#billing/domain/billing-account.ts";
import { Entitlements, unmetered } from "#billing/domain/entitlements.ts";
import { Subscription } from "#billing/domain/subscription.ts";
import type { UsageRecord } from "#billing/domain/usage-meter.ts";
import { DrizzleBillingAccountStoreLive } from "#billing/infrastructure/drizzle-billing-account-store.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";
import { WorkspaceAccountPayersLive } from "#billing/infrastructure/workspace-account-payers.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { newId } from "#shared/application/ids.ts";
import { Pseudonyms } from "#shared/application/pseudonyms.ts";
import {
  UserIdSchema,
  Uuid7Schema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Plan } from "#shared/domain/plan.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import { TransactionsTest } from "#test/notifications/support.ts";
import {
  PartnerOwnershipLive,
  WorkspaceOwnersLive,
} from "#workspace/container.ts";

const entitlementsOn = (plan: Plan) =>
  new Entitlements({
    freeTier: true,
    plan: Option.some(plan),
    subscription: Option.none(),
  });

/**
 * Every workspace on `plan`, without a subscription, each alone in its
 * pool.
 */
export const everyWorkspaceOn = (plan: Plan) =>
  Layer.merge(
    Layer.succeed(
      WorkspaceEntitlements,
      WorkspaceEntitlements.of({
        of: () => Effect.succeed(entitlementsOn(plan)),
        ofEach: (workspaceIds) =>
          Effect.succeed(
            new Map(workspaceIds.map((id) => [id, entitlementsOn(plan)]))
          ),
      })
    ),
    PlanPools.layerAlone
  );

/** A server that does not bill: nothing is limited, nothing pooled. */
export const UnmeteredTest = Layer.merge(
  Layer.succeed(
    WorkspaceEntitlements,
    WorkspaceEntitlements.of({
      of: () => Effect.succeed(unmetered),
      ofEach: (workspaceIds) =>
        Effect.succeed(new Map(workspaceIds.map((id) => [id, unmetered]))),
    })
  ),
  PlanPools.layerAlone
);

/**
 * No channel connected anywhere, for the media context's storage
 * allowance, which grows with them on per-account pricing.
 */
export const NoAccountsConnectedTest = Layer.mock(ChannelUsage, {
  connected: () => Effect.succeed(0),
});

/** The id of every account `AloneInAccountsTest` answers. */
export const aloneAccountId = BillingAccountIdSchema.make(
  "00000000-0000-7000-8000-00000000a11e"
);

/** A workspace's account of its own, which `payer` pays for, if anyone. */
export const aloneAccountOf = (
  workspaceId: WorkspaceId,
  payer: Option.Option<UserId> = Option.none()
) =>
  new BillingAccount({
    createdAt: DateTime.makeUnsafe("2026-11-01T00:00:00Z"),
    freeTier: true,
    holder: workspaceId,
    id: aloneAccountId,
    partnerId: Option.none(),
    payer,
    standalone: false,
  });

// Every workspace in a billing account of its own.
const AloneAccountsOnly = Layer.mock(BillingAccounts, {
  accountsIn: (workspaceIds) =>
    Effect.succeed(new Map(workspaceIds.map((id) => [id, aloneAccountOf(id)]))),
  eraseWorkspace: () => Effect.void,
  forgetPayer: () => Effect.void,
  of: (workspaceId) => Effect.succeed(aloneAccountOf(workspaceId)),
  poolOf: (workspaceId) =>
    Effect.succeed({ account: aloneAccountOf(workspaceId), others: [] }),
  poolsIn: (workspaceIds) =>
    Effect.succeed(
      new Map(
        workspaceIds.map((id) => [
          id,
          { account: aloneAccountOf(id), others: [] },
        ])
      )
    ),
  repair: () => Effect.succeed({ lapsed: 0, repaired: 0 }),
  subscriptionChanged: () => Effect.void,
  sweepIn: () => Effect.succeed(0),
});

/** Accounts nobody pays for, nor offers, nor any payment method required. */
const EmptyAccountStoreTest = Layer.mock(BillingAccountStore, {
  paidBy: () => Effect.succeed([]),
  requiresPayment: () => Effect.succeed(false),
  transferOf: () => Effect.succeedNone,
  transfersFor: () => Effect.succeed([]),
  workspacesOfEach: () => Effect.succeed(new Map()),
});

/**
 * Every workspace in a billing account of its own, shared with no other,
 * which nothing changes, its store holding nothing of anyone: for tests
 * where no account pools anything.
 */
export const AloneInAccountsTest = Layer.mergeAll(
  AloneAccountsOnly,
  EmptyAccountStoreTest,
  // Nobody's address is known, so no pseudonym is asked for.
  Layer.mock(AccountPayers, { emailOf: () => Effect.succeedNone })
);

/**
 * What the billing page says of each workspace's account, alone in its
 * own: paid by nobody, its own billing workspace, named to nobody, with
 * no offer open.
 */
export const AloneAccountViewsTest = AccountViews.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      AloneInAccountsTest,
      Layer.mock(AccountPayers, {
        namesShownTo: () => Effect.succeed(new Map()),
      }),
      EmptyAccountStoreTest
    )
  ),
  Layer.provideMerge(AloneInAccountsTest)
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
      ofWorkspaces: (workspaceIds) =>
        Effect.succeed(
          new Map(
            workspaceIds.flatMap((workspaceId) => {
              const of = held.filter(
                (subscription) => subscription.workspaceId === workspaceId
              );

              return of.length === 0 ? [] : [[workspaceId, of] as const];
            })
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
    ofPlatformMember: (platform, memberId) =>
      Effect.succeed(`pseudonym:${platform}:${memberId}`),
  })
);

// Whether two records count the same meter of a workspace on a day.
const same = (entry: WorkspaceUsageRecord) => (other: WorkspaceUsageRecord) =>
  other.workspaceId === entry.workspaceId &&
  other.record.meter === entry.record.meter &&
  other.record.dimension === entry.record.dimension &&
  DateTime.Equivalence(other.record.day, entry.record.day);

// Whether a record's day is one of the period's.
const within =
  (period: { readonly from: DateTime.Utc; readonly to: DateTime.Utc }) =>
  (record: UsageRecord) =>
    !DateTime.isLessThan(record.day, period.from) &&
    !DateTime.isGreaterThan(record.day, period.to);

/** Every workspace's usage ledger in memory. */
export const UsageLedgerInMemory = Layer.effect(
  UsageLedger,
  Effect.gen(function* inMemory() {
    const kept = yield* Ref.make<readonly WorkspaceUsageRecord[]>([]);

    return UsageLedger.of({
      add: (entry) =>
        Ref.update(kept, (all) => {
          const found = all.find(same(entry));

          return [
            ...all.filter((other) => !same(entry)(other)),
            found === undefined
              ? entry
              : {
                  record: {
                    ...found.record,
                    quantity: found.record.quantity + entry.record.quantity,
                  },
                  workspaceId: entry.workspaceId,
                },
          ];
        }),
      allOf: () => Effect.succeed([]),
      eraseWorkspace: () => Effect.void,
      ofWorkspace: (id, period) =>
        Ref.get(kept).pipe(
          Effect.map((all) =>
            all
              .filter(
                ({ record, workspaceId: of }) =>
                  of === id && within(period)(record)
              )
              .map(({ record }) => record)
          )
        ),
      ofWorkspaces: (ids, period) =>
        Ref.get(kept).pipe(
          Effect.map((all) =>
            all.filter(
              ({ record, workspaceId: of }) =>
                ids.includes(of) && within(period)(record)
            )
          )
        ),
      postsAcross: (ids, period) =>
        Ref.get(kept).pipe(
          Effect.map((all) => {
            const summed = new Map<string, UsageRecord>();

            for (const { record, workspaceId: of } of all) {
              if (
                ids.includes(of) &&
                within(period)(record) &&
                record.meter === "publishedPosts"
              ) {
                const key = `${DateTime.formatIso(record.day)} ${record.dimension}`;
                const found = summed.get(key);

                summed.set(
                  key,
                  found === undefined
                    ? record
                    : { ...found, quantity: found.quantity + record.quantity }
                );
              }
            }

            return [...summed.values()];
          })
        ),
      purgeBefore: () => Effect.succeed(0),
      set: (entries) =>
        Ref.update(kept, (all) => [
          ...all.filter(
            (other) => !entries.some((entry) => same(entry)(other))
          ),
          ...entries,
        ]),
    });
  })
);

// Each row these helpers write is a moment later than the one before, so
// "the oldest" is the one written first.
let written = 0;

const nextInstant = () => {
  written += 1;

  return new Date(Date.UTC(2026, 9, 1) + written * 1000);
};

/**
 * Billing accounts as the server keeps them, on Postgres: the workspace
 * context's owners and partners, billing's subscriptions.
 */
export const accountsTest = BillingAccounts.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      DrizzleBillingAccountStoreLive,
      WorkspaceAccountPayersLive.pipe(
        Layer.provide(Layer.merge(PartnerOwnershipLive, WorkspaceOwnersLive))
      ),
      DrizzleSubscriptionsLive,
      PlainPseudonymsTest
    )
  ),
  Layer.provideMerge(TransactionsTest),
  Layer.provideMerge(DatabaseTest)
);

/** A synthetic account with this address. */
export const personWith = (email: string) =>
  Effect.gen(function* personWithAddress() {
    const sql = yield* SqlClient.SqlClient;
    const userId = UserIdSchema.make(randomUUID());
    const at = nextInstant();

    yield* sql`INSERT INTO auth.user (id, name, email, email_verified, created_at, updated_at) VALUES (${userId}, 'Synthetic payer', ${email}, true, ${at}, ${at})`;

    return userId;
  }).pipe(Effect.orDie);

/** A synthetic account, with an address of its own. */
export const person = Effect.suspend(() =>
  personWith(`${randomUUID()}@example.com`)
);

/** A workspace these accounts own, joined in this order. */
export const workspaceOwnedBy = Effect.fn("workspaceOwnedBy")(
  function* workspaceOwnedBy(owners: readonly UserId[]) {
    const sql = yield* SqlClient.SqlClient;
    const workspaceId = WorkspaceIdSchema.make(randomUUID());
    const at = nextInstant();

    yield* sql`INSERT INTO auth.organization (id, name, slug, created_at) VALUES (${workspaceId}, 'Synthetic workspace', ${`accounts-${workspaceId}`}, ${at})`;

    for (const userId of owners) {
      yield* sql`INSERT INTO auth.member (organization_id, user_id, role, created_at) VALUES (${workspaceId}, ${userId}, 'owner', ${nextInstant()})`;
    }

    return workspaceId;
  },
  Effect.orDie
);

/** A subscription of the workspace's own, with synthetic ids. */
export const subscribe = Effect.fn("subscribe")(function* subscribe(
  workspaceId: WorkspaceId,
  status: string,
  plan = "pro"
) {
  const sql = yield* SqlClient.SqlClient;
  const id = `sub_synthetic_${randomUUID()}`;
  const at = nextInstant();

  yield* sql`INSERT INTO billing.subscriptions (stripe_subscription_id, stripe_customer_id, workspace_id, plan, status, interval, cancel_at_period_end, last_event_at, last_event_id, updated_at) VALUES (${id}, 'cus_synthetic', ${workspaceId}, ${plan}, ${status}, 'month', false, ${at}, ${`evt_synthetic_${id}`}, ${at})`;

  return id;
}, Effect.orDie);

/** A partner account whose home is `home`, owning `owned`. */
export const partnerOf = Effect.fn("partnerOf")(function* partnerOf(
  home: WorkspaceId,
  owned: readonly WorkspaceId[]
) {
  const sql = yield* SqlClient.SqlClient;
  const id = yield* newId(Uuid7Schema);
  const at = nextInstant();

  yield* sql`INSERT INTO workspace.partners (id, workspace_id, name, return_origins, created_at, updated_at) VALUES (${id}, ${home}, 'Synthetic partner', '{}', ${at}, ${at})`;

  for (const workspaceId of owned) {
    yield* sql`INSERT INTO workspace.partner_workspaces (workspace_id, partner_id, created_at) VALUES (${workspaceId}, ${id}, ${at})`;
  }

  return id;
}, Effect.orDie);

/**
 * Deletes what these workspaces left: their billing accounts and offers,
 * their subscriptions, channels and partners, their members' accounts.
 */
export const cleanUpAccounts = (workspaceIds: readonly WorkspaceId[]) =>
  SqlClient.SqlClient.use((sql) => {
    const ids = workspaceIds.join(",");

    return Effect.gen(function* cleanUp() {
      const accountRows = yield* sql<{
        readonly id: string;
      }>`SELECT account_id AS id FROM billing.account_workspaces WHERE workspace_id = ANY(string_to_array(${ids}, ',')::uuid[]) UNION SELECT id FROM billing.accounts WHERE holder_workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`;

      const accountIds = accountRows.map(({ id }) => id).join(",");

      yield* sql`DELETE FROM billing.account_transfers WHERE from_account_id = ANY(string_to_array(${accountIds}, ',')::uuid[]) OR workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`;
      yield* sql`DELETE FROM billing.account_workspaces WHERE account_id = ANY(string_to_array(${accountIds}, ',')::uuid[]) OR workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`;
      yield* sql`DELETE FROM billing.accounts WHERE id = ANY(string_to_array(${accountIds}, ',')::uuid[])`;
      yield* sql`DELETE FROM workspace.partner_workspaces WHERE workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`;
      yield* sql`DELETE FROM workspace.partners WHERE workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`;
      yield* sql`DELETE FROM channels.channels WHERE workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`;
      yield* sql`DELETE FROM billing.subscriptions WHERE workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`;
      yield* sql`DELETE FROM auth.user WHERE id IN (SELECT user_id FROM auth.member WHERE organization_id = ANY(string_to_array(${ids}, ',')::uuid[]))`;
      yield* sql`DELETE FROM auth.organization WHERE id = ANY(string_to_array(${ids}, ',')::uuid[])`;
    }).pipe(Effect.orDie);
  });
