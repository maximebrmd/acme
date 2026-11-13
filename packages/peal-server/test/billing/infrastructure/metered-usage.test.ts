// The billing meters every context claims through, on Postgres, with the
// billing accounts, subscriptions and the outbox as the server keeps them.
import { assert, layer } from "@effect/vitest";
import { Context, DateTime, Effect, Layer, Option, Ref, Result } from "effect";
import { SqlClient } from "effect/sql";

import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { BillingNotices } from "#billing/application/ports/billing-notices.ts";
import { UsageBilling } from "#billing/application/ports/usage-billing.ts";
import { SpendCeilings } from "#billing/application/spend-ceilings.ts";
import type { BillingNotice } from "#billing/domain/billing-notice.ts";
import { meterCharge, rateCard } from "#billing/domain/rate-card.ts";
import { AccountPlanHoldersLive } from "#billing/infrastructure/account-plan-holders.ts";
import { DrizzleAccountDayStoreLive } from "#billing/infrastructure/drizzle-account-day-store.ts";
import { DrizzleMeterUsageStoreLive } from "#billing/infrastructure/drizzle-meter-usage-store.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";
import { DrizzleUsageLedgerLive } from "#billing/infrastructure/drizzle-usage-ledger.ts";
import { MeteredUsageLive } from "#billing/infrastructure/metered-usage-live.ts";
import { MeteredUsage } from "#shared/application/metered-usage.ts";
import { Actor } from "#shared/domain/access.ts";
import { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Meter } from "#shared/domain/meter.ts";
import {
  accountsTest,
  cleanUpAccounts,
  partnerOf,
  person,
  subscribe,
  workspaceOwnedBy,
} from "#test/billing/support.ts";
import { PartnerOwnershipLive } from "#workspace/container.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

/** What the billing managers were told, by key. */
class Told extends Context.Service<
  Told,
  Ref.Ref<readonly { readonly key: string; readonly notice: BillingNotice }[]>
>()("test/billing/Told") {}

const ToldTest = Layer.effectContext(
  Effect.gen(function* told() {
    const kept = yield* Ref.make<
      readonly { readonly key: string; readonly notice: BillingNotice }[]
    >([]);

    return Context.make(Told, kept).pipe(
      Context.add(
        BillingNotices,
        BillingNotices.of({
          tell: (asked) =>
            Ref.update(kept, (all) =>
              all.some(({ key }) => key === asked.key)
                ? all
                : [...all, { key: asked.key, notice: asked.notice }]
            ),
        })
      )
    );
  })
);

// The event names of a server whose prefix is `peal`; nothing is sent.
const UsageBillingTest = Layer.mock(UsageBilling, {
  eventNames: {
    accounts: "peal_accounts",
    assistantImages: "peal_assistant_images",
    assistantRequests: "peal_assistant_requests",
    managedAds: "peal_managed_ads",
    outboundMessages: "peal_outbound_messages",
    xApi: "peal_x_api",
  },
});

const billingMode = (enabled: boolean) =>
  Layer.succeed(
    BillingMode,
    BillingMode.of({
      enabled,
      graceSince: Option.none(),
      graceUntil: Option.none(),
    })
  );

const metersOn = (enabled: boolean) =>
  Layer.mergeAll(MeteredUsageLive, SpendCeilings.layer).pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        DrizzleMeterUsageStoreLive,
        DrizzleAccountDayStoreLive,
        DrizzleUsageLedgerLive,
        DrizzleSubscriptionsLive,
        AccountPlanHoldersLive.pipe(Layer.provide(PartnerOwnershipLive)),
        UsageBillingTest,
        ToldTest
      )
    ),
    Layer.provideMerge(billingMode(enabled)),
    Layer.provideMerge(accountsTest)
  );

const messages = rateCard.meters.outboundMessages;
const requests = rateCard.meters.assistantRequests;

const monthOf = (now: DateTime.Utc) =>
  DateTime.formatIsoDateUtc(DateTime.startOf(now, "month"));

/** Sets the holder's meter this month (or `months` ago) to `used`. */
const seed = Effect.fn("seed")(function* seed(
  holder: WorkspaceId,
  meter: Meter,
  used: number,
  months?: number
) {
  const sql = yield* SqlClient.SqlClient;
  const now = yield* DateTime.now;

  const month = monthOf(DateTime.subtract(now, { months: months ?? 0 }));

  yield* sql`INSERT INTO billing.meter_usage (holder_workspace_id, month, meter, used) VALUES (${holder}, ${month}::date, ${meter}, ${used}) ON CONFLICT (holder_workspace_id, month, meter) DO UPDATE SET used = excluded.used`;
}, Effect.orDie);

interface Row {
  readonly meter: string;
  readonly reported: number;
  readonly used: number;
}

interface Report {
  readonly event: string;
  readonly identifier: string;
  readonly value: number;
}

// The holder's meters this month, its reports in order, and the ledger's
// counters under each workspace.
const keptOf = (holder: WorkspaceId) =>
  Effect.gen(function* kept() {
    const sql = yield* SqlClient.SqlClient;
    const month = monthOf(yield* DateTime.now);

    return yield* Effect.all({
      ledger: sql<{
        readonly meter: string;
        readonly quantity: number;
        readonly workspace: string;
      }>`SELECT workspace_id AS workspace, meter, quantity::int AS quantity FROM billing.usage_days WHERE workspace_id IN (SELECT workspace_id FROM billing.account_workspaces WHERE account_id = (SELECT account_id FROM billing.account_workspaces WHERE workspace_id = ${holder})) OR workspace_id = ${holder} ORDER BY meter, workspace_id`,
      meters: sql<Row>`SELECT meter, used::int AS used, reported::int AS reported FROM billing.meter_usage WHERE holder_workspace_id = ${holder} AND month = ${month}::date ORDER BY meter`,
      reports: sql<Report>`SELECT event_name AS event, identifier, value::int AS value FROM billing.meter_reports WHERE holder_workspace_id = ${holder} ORDER BY created_at, identifier`,
    });
  }).pipe(Effect.orDie);

const cleanUp = (workspaceIds: readonly WorkspaceId[]) =>
  SqlClient.SqlClient.use((sql) =>
    Effect.gen(function* cleaned() {
      const ids = workspaceIds.join(",");

      yield* sql`DELETE FROM billing.meter_usage WHERE holder_workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`;
      yield* sql`DELETE FROM billing.spend_ceilings WHERE holder_workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`;
      yield* sql`DELETE FROM billing.meter_reports WHERE holder_workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`;
      yield* sql`DELETE FROM billing.usage_days WHERE workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`;
    })
  ).pipe(Effect.orDie, Effect.andThen(cleanUpAccounts(workspaceIds)));

const claimOf = (workspaceId: WorkspaceId, meter: Meter, units = 1) =>
  MeteredUsage.use((meters) => meters.claim(workspaceId, meter, units)).pipe(
    Effect.catchTag("DatabaseError", Effect.die)
  );

const ownerOf = (workspaceId: WorkspaceId, userId: UserId) =>
  new Actor({
    permissions: permissionsFor("owner"),
    subject: { _tag: "user", impersonatedBy: Option.none(), userId },
    workspaceId,
  });

// A person's workspace on per-account pricing, and the person.
const paying = Effect.gen(function* paying() {
  const payer = yield* person;
  const workspaceId = yield* workspaceOwnedBy([payer]);

  yield* subscribe(workspaceId, "active", "payAsYouGo");

  return { payer, workspaceId };
});

const free = Effect.gen(function* free() {
  return yield* workspaceOwnedBy([yield* person]);
});

layer(metersOn(true))("the meters on a server that bills", (it) => {
  it.effect(
    "refuse a free account the unit past its allowance, and tell its billing managers once when it is used",
    () =>
      Effect.gen(function* refused() {
        const holder = yield* free;
        const now = yield* DateTime.now;

        yield* seed(holder, "outboundMessages", messages.allowanceWithout - 1);
        yield* claimOf(holder, "outboundMessages");

        const past = yield* claimOf(holder, "outboundMessages").pipe(
          Effect.flip
        );

        assert.deepStrictEqual(
          past,
          new AllowanceReached({
            allowed: messages.allowanceWithout,
            meter: "outboundMessages",
            reason: "paymentMethodRequired",
            resetsAt: DateTime.add(DateTime.startOf(now, "month"), {
              months: 1,
            }),
            used: messages.allowanceWithout,
          })
        );

        const kept = yield* keptOf(holder);

        assert.deepStrictEqual(kept.meters, [
          {
            meter: "outboundMessages",
            reported: 0,
            used: messages.allowanceWithout,
          },
        ]);
        // Nothing is sent for an account that does not pay.
        assert.deepStrictEqual(kept.reports, []);

        const told = yield* Told.use(Ref.get);

        assert.deepStrictEqual(
          told
            .filter(({ key }) => key.includes(holder))
            .map(({ notice }) => notice._tag),
          ["AllowanceReached"]
        );

        yield* cleanUp([holder]);
      })
  );

  it.effect("grant exactly the room left to 20 claims sent together", () =>
    Effect.gen(function* together() {
      const holder = yield* free;

      yield* seed(holder, "outboundMessages", messages.allowanceWithout - 5);

      const claimed = yield* Effect.all(
        Array.from({ length: 20 }, () =>
          claimOf(holder, "outboundMessages").pipe(Effect.result)
        ),
        { concurrency: "unbounded" }
      );

      assert.strictEqual(claimed.filter(Result.isSuccess).length, 5);
      assert.deepStrictEqual((yield* keptOf(holder)).meters, [
        {
          meter: "outboundMessages",
          reported: 0,
          used: messages.allowanceWithout,
        },
      ]);

      yield* cleanUp([holder]);
    })
  );

  it.effect(
    "pass a paying account past the allowance, report the billable units once, and report a unit given back",
    () =>
      Effect.gen(function* billed() {
        const meters = yield* MeteredUsage;
        const { workspaceId: holder } = yield* paying;
        const now = yield* DateTime.now;
        const month = monthOf(now).slice(0, 7);

        yield* seed(holder, "outboundMessages", messages.allowance - 1);

        // The last unit included, then two billed.
        yield* claimOf(holder, "outboundMessages");
        yield* claimOf(holder, "outboundMessages");

        const last = yield* claimOf(holder, "outboundMessages");

        yield* meters.giveBack(last);

        const kept = yield* keptOf(holder);

        assert.deepStrictEqual(kept.meters, [
          {
            meter: "outboundMessages",
            reported: 1,
            used: messages.allowance + 1,
          },
        ]);
        assert.deepStrictEqual(kept.reports, [
          {
            event: "peal_outbound_messages",
            identifier: `outboundMessages:${holder}:${month}:1`,
            value: 1,
          },
          {
            event: "peal_outbound_messages",
            identifier: `outboundMessages:${holder}:${month}:2`,
            value: 1,
          },
          {
            event: "peal_outbound_messages",
            identifier: `outboundMessages:${holder}:${month}:3`,
            value: -1,
          },
        ]);

        yield* cleanUp([holder]);
      })
  );

  it.effect(
    "give back a unit within the allowance without reporting anything",
    () =>
      Effect.gen(function* within() {
        const meters = yield* MeteredUsage;
        const { workspaceId: holder } = yield* paying;

        const claim = yield* claimOf(holder, "outboundMessages");

        yield* meters.giveBack(claim);
        // Never below zero.
        yield* meters.giveBack(claim);

        const kept = yield* keptOf(holder);

        assert.deepStrictEqual(kept.meters, [
          { meter: "outboundMessages", reported: 0, used: 0 },
        ]);
        assert.deepStrictEqual(kept.reports, []);
        assert.deepStrictEqual(
          kept.ledger.map(({ quantity }) => quantity),
          [0]
        );

        yield* cleanUp([holder]);
      })
  );

  it.effect("start a new month from zero", () =>
    Effect.gen(function* newMonth() {
      const holder = yield* free;

      yield* seed(holder, "outboundMessages", messages.allowanceWithout, 1);
      yield* claimOf(holder, "outboundMessages");

      assert.deepStrictEqual((yield* keptOf(holder)).meters, [
        { meter: "outboundMessages", reported: 0, used: 1 },
      ]);

      yield* cleanUp([holder]);
    })
  );

  it.effect(
    "share one allowance between a person's workspaces, the ledger naming each",
    () =>
      Effect.gen(function* shared() {
        const payer = yield* person;
        const holder = yield* workspaceOwnedBy([payer]);
        const other = yield* workspaceOwnedBy([payer]);

        yield* seed(holder, "outboundMessages", messages.allowanceWithout - 2);
        yield* claimOf(holder, "outboundMessages");
        yield* claimOf(other, "outboundMessages");

        const refused = yield* claimOf(other, "outboundMessages").pipe(
          Effect.flip
        );

        assert.strictEqual(refused._tag, "AllowanceReached");

        const kept = yield* keptOf(holder);

        assert.deepStrictEqual(kept.meters, [
          {
            meter: "outboundMessages",
            reported: 0,
            used: messages.allowanceWithout,
          },
        ]);
        assert.deepStrictEqual(
          kept.ledger
            .map(({ quantity, workspace }) => ({ quantity, workspace }))
            .toSorted((left, right) =>
              left.workspace.localeCompare(right.workspace)
            ),
          [
            { quantity: 1, workspace: holder },
            { quantity: 1, workspace: other },
          ].toSorted((left, right) =>
            left.workspace.localeCompare(right.workspace)
          )
        );

        yield* cleanUp([holder, other]);
      })
  );

  it.effect("share a partner's allowance with its customers", () =>
    Effect.gen(function* partner() {
      const home = yield* free;
      const customer = yield* workspaceOwnedBy([yield* person]);

      yield* partnerOf(home, [customer]);
      yield* seed(
        home,
        "managedAds",
        rateCard.meters.managedAds.allowanceWithout - 1
      );
      yield* claimOf(customer, "managedAds");

      const refused = yield* claimOf(home, "managedAds").pipe(Effect.flip);

      assert.strictEqual(refused.reason, "paymentMethodRequired");

      yield* cleanUp([home, customer]);
    })
  );

  it.effect(
    "refuse the assistant to a free account, and stop a paying one at its ceiling until it is raised, and again once lowered",
    () =>
      Effect.gen(function* assistant() {
        const ceilings = yield* SpendCeilings;
        const holder = yield* free;
        const { payer, workspaceId: paid } = yield* paying;

        const none = yield* claimOf(holder, "assistantRequests").pipe(
          Effect.flip
        );

        assert.strictEqual(none.allowed, 0);
        assert.strictEqual(none.reason, "paymentMethodRequired");

        yield* seed(paid, "assistantRequests", requests.allowance);

        const atCeiling = yield* claimOf(paid, "assistantRequests").pipe(
          Effect.flip
        );

        assert.strictEqual(atCeiling.reason, "ceilingReached");
        assert.strictEqual(atCeiling.allowed, requests.allowance);

        yield* ceilings.set(
          ownerOf(paid, payer),
          "assistant",
          meterCharge("assistantRequests", 2)
        );
        yield* claimOf(paid, "assistantRequests");
        yield* claimOf(paid, "assistantRequests");

        const raised = yield* claimOf(paid, "assistantRequests").pipe(
          Effect.flip
        );

        assert.strictEqual(raised.allowed, requests.allowance + 2);

        // Lowered below what was spent: the next request is refused.
        yield* ceilings.set(ownerOf(paid, payer), "assistant", 0);

        const lowered = yield* claimOf(paid, "assistantRequests").pipe(
          Effect.flip
        );

        assert.strictEqual(lowered.reason, "ceilingReached");
        assert.strictEqual(
          (yield* keptOf(paid)).reports.filter(
            ({ event }) => event === "peal_assistant_requests"
          ).length,
          2
        );

        yield* cleanUp([holder, paid]);
      })
  );
});

layer(metersOn(false))("the meters on a server that does not bill", (it) => {
  it.effect("refuse nothing and count nothing", () =>
    Effect.gen(function* unbilled() {
      const holder = yield* free;

      yield* claimOf(holder, "assistantRequests");
      yield* claimOf(holder, "outboundMessages");

      assert.deepStrictEqual(yield* keptOf(holder), {
        ledger: [],
        meters: [],
        reports: [],
      });
      assert.isTrue(
        Option.isNone(
          yield* MeteredUsage.use((meters) =>
            meters.state(holder, "outboundMessages")
          )
        )
      );

      yield* cleanUp([holder]);
    })
  );
});
