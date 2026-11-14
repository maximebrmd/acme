// Each billing account's connected accounts by UTC day, on its billing
// workspace, and what reaches the outbox to Stripe: on Postgres, with the
// billing accounts, subscriptions and channels as the server keeps them.
import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Redacted } from "effect";
import { SqlClient } from "effect/sql";

import { AccountDays } from "#billing/application/account-days.ts";
import { AccountChannels } from "#billing/application/ports/account-channels.ts";
import { AccountDayStore } from "#billing/application/ports/account-day-store.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { UsageBilling } from "#billing/application/ports/usage-billing.ts";
import { StartAccountDays } from "#billing/application/start-account-days.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { AccountPlanHoldersLive } from "#billing/infrastructure/account-plan-holders.ts";
import { AccountPlanPoolsLive } from "#billing/infrastructure/account-plan-pools.ts";
import { DrizzleAccountDayStoreLive } from "#billing/infrastructure/drizzle-account-day-store.ts";
import { DrizzleBillingAccountStoreLive } from "#billing/infrastructure/drizzle-billing-account-store.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";
import { ChannelEvents } from "#channels/application/channel-events.ts";
import { ChannelMoves } from "#channels/application/channel-moves.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { encryptTokens } from "#channels/application/channel-tokens.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import type { AuthorizationCallback } from "#channels/application/platform-authorizer.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzleConnectAttempts } from "#channels/infrastructure/drizzle-connect-attempts.ts";
import { DrizzleConnectChoices } from "#channels/infrastructure/drizzle-connect-choices.ts";
import { AccountChannelAllowanceLive } from "#channels/infrastructure/plan-channel-allowance.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import {
  accountsTest,
  cleanUpAccounts,
  partnerOf,
  person,
  subscribe,
  workspaceOwnedBy,
} from "#test/billing/support.ts";
import {
  MastodonAuthorizersTest,
  mastodonInstance,
} from "#test/channels/connect-support.ts";
import {
  actorIn,
  freshChannel,
  OpenOutboundGuard,
  syntheticCredentials,
  TokenCipherTest,
} from "#test/channels/support.ts";
import { PartnerOwnershipLive } from "#workspace/container.ts";

const BillsTest = Layer.succeed(
  BillingMode,
  BillingMode.of({
    enabled: true,
    graceSince: Option.none(),
    graceUntil: Option.none(),
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

const HoldersTest = AccountPlanHoldersLive.pipe(
  Layer.provide(PartnerOwnershipLive)
);

const AccountDaysTest = AccountDays.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleAccountDayStoreLive,
      HoldersTest,
      DrizzleSubscriptionsLive,
      UsageBillingTest
    )
  ),
  Layer.provideMerge(BillsTest)
);

// Connecting accounts as the server does: each workspace's channels
// counted across its billing account, under the account's hold, its plan
// read from its billing workspace's subscriptions.
const ConnectingTest = Layer.mergeAll(
  ConnectChannel.layer,
  ChannelMoves.layer,
  ChannelUsage.layer
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleChannelRepository,
      ChannelEvents.none,
      DrizzleConnectAttempts,
      DrizzleConnectChoices,
      SqlChannelLocks,
      AccountChannelAllowanceLive.pipe(
        Layer.provide(
          AccountPlanPoolsLive.pipe(Layer.provide(PartnerOwnershipLive))
        ),
        Layer.provideMerge(WorkspaceEntitlements.layerShared)
      ),
      MastodonAuthorizersTest.pipe(Layer.provide(OpenOutboundGuard))
    )
  )
);

const StartTest = StartAccountDays.make(2).pipe(
  Layer.provide(DrizzleBillingAccountStoreLive),
  Layer.provide(
    Layer.effect(
      AccountChannels,
      ChannelUsage.use((usage) =>
        Effect.succeed(
          AccountChannels.of({
            ownIn: usage.connectedIn,
            sharedPage: () => Effect.succeed([]),
          })
        )
      )
    )
  )
);

const DaysTest = StartTest.pipe(
  Layer.provideMerge(ConnectingTest),
  Layer.provideMerge(AccountDaysTest),
  Layer.provideMerge(TokenCipherTest),
  Layer.provideMerge(accountsTest)
);

const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read", "channel:connect"]);

const callbackOf = (back: {
  readonly code?: string;
  readonly state: string;
}): AuthorizationCallback => ({
  code: Option.fromUndefinedOr(back.code),
  error: Option.none(),
  issuer: Option.none(),
  state: back.state,
});

const fill = Effect.fn("fill")(function* fill(
  workspaceId: WorkspaceId,
  count: number
) {
  const repository = yield* ChannelRepository;

  for (let added = 0; added < count; added += 1) {
    const channel = yield* freshChannel(workspaceId);

    yield* repository.insert(channel, syntheticCredentials(channel));
  }
});

// A channel of the workspace whose tokens open, as a move reads them.
const connectedIn = Effect.fn("connectedIn")(function* connectedIn(
  workspaceId: WorkspaceId
) {
  const repository = yield* ChannelRepository;
  const channel = yield* freshChannel(workspaceId);

  yield* repository.insert(
    channel,
    yield* encryptTokens(
      {
        accessToken: Redacted.make("synthetic-access-token"),
        expiresAt: Option.none(),
        refreshToken: Option.none(),
        renewable: false,
        scopes: [],
      },
      channel.id
    )
  );

  return channel;
});

interface Row {
  readonly day: string;
  readonly peak: number;
  readonly reported: number;
}

interface Report {
  readonly customer: string;
  readonly event: string;
  readonly identifier: string;
  readonly value: number;
}

// The holder's days, and what its reports put in the outbox, in order.
const keptOf = (holder: WorkspaceId) =>
  SqlClient.SqlClient.use((sql) =>
    Effect.all({
      days: sql<Row>`SELECT to_char(day, 'YYYY-MM-DD') AS day, peak, reported FROM billing.account_days WHERE holder_workspace_id = ${holder} ORDER BY day`,
      reports: sql<Report>`SELECT stripe_customer_id AS customer, event_name AS event, identifier, value::int AS value FROM billing.meter_reports WHERE holder_workspace_id = ${holder} ORDER BY created_at, value, identifier`,
    })
  ).pipe(Effect.orDie);

const cleanUp = (workspaceIds: readonly WorkspaceId[]) =>
  SqlClient.SqlClient.use((sql) =>
    Effect.gen(function* cleaned() {
      const ids = workspaceIds.join(",");

      yield* sql`DELETE FROM billing.account_days WHERE holder_workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`;
      yield* sql`DELETE FROM billing.meter_reports WHERE holder_workspace_id = ANY(string_to_array(${ids}, ',')::uuid[])`;
    })
  ).pipe(Effect.orDie, Effect.andThen(cleanUpAccounts(workspaceIds)));

// A person's workspace, on per-account pricing through `customer`.
const paying = Effect.gen(function* paying() {
  const workspaceId = yield* workspaceOwnedBy([yield* person]);

  yield* subscribe(workspaceId, "active", "payAsYouGo");

  return workspaceId;
});

const today = DateTime.now.pipe(
  Effect.map((now) => DateTime.formatIsoDateUtc(DateTime.startOf(now, "day")))
);

const identifierOf = (holder: WorkspaceId, day: string, peak: number) =>
  `acc:${holder}:${day}:${peak}`;

layer(DaysTest)("the account-days", (it) => {
  it.effect(
    "raise a paying holder's day and put what each rise adds in the outbox; a fall changes nothing",
    () =>
      Effect.gen(function* rises() {
        const days = yield* AccountDays;
        const holder = yield* paying;
        const day = yield* today;

        yield* days.counted(holder, Effect.succeed(3));
        yield* days.counted(holder, Effect.succeed(2));
        yield* days.counted(holder, Effect.succeed(4));

        assert.deepStrictEqual(yield* keptOf(holder), {
          days: [{ day, peak: 4, reported: 4 }],
          reports: [
            {
              customer: "cus_synthetic",
              event: "peal_accounts",
              identifier: identifierOf(holder, day, 4),
              value: 1,
            },
            {
              customer: "cus_synthetic",
              event: "peal_accounts",
              identifier: identifierOf(holder, day, 3),
              value: 3,
            },
          ],
        });

        yield* cleanUp([holder]);
      })
  );

  it.effect(
    "raise the day by two for two accounts connected together, each reported once",
    () =>
      Effect.gen(function* together() {
        const connect = yield* ConnectChannel;
        const holder = yield* paying;
        const day = yield* today;

        const instances = [
          yield* mastodonInstance(),
          yield* mastodonInstance(),
        ];

        const started = yield* Effect.all(
          instances.map((instance) =>
            connect
              .start(manager(holder), "mastodon", {
                connection: Option.none(),
                handle: Option.none(),
                instance: Option.some(instance.url),
              })
              .pipe(Effect.map((url) => ({ instance, url })))
          )
        );

        yield* Effect.all(
          started.map(({ instance, url }) =>
            connect.complete(
              manager(holder),
              "mastodon",
              callbackOf(instance.approve(url))
            )
          ),
          { concurrency: "unbounded" }
        );

        const kept = yield* keptOf(holder);

        assert.deepStrictEqual(kept.days, [{ day, peak: 2, reported: 2 }]);
        assert.deepStrictEqual(
          kept.reports.map(({ identifier, value }) => ({ identifier, value })),
          [
            { identifier: identifierOf(holder, day, 1), value: 1 },
            { identifier: identifierOf(holder, day, 2), value: 1 },
          ]
        );

        yield* cleanUp([holder]);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "refuse the 101st account of per-account pricing until its first invoice is paid",
    () =>
      Effect.gen(function* ceiling() {
        const connect = yield* ConnectChannel;
        const holder = yield* paying;
        const instance = yield* mastodonInstance();

        const start = connect.start(manager(holder), "mastodon", {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.some(instance.url),
        });

        yield* fill(holder, 100);

        assert.deepStrictEqual(
          yield* start.pipe(Effect.flip),
          new PlanLimitReached({
            allowed: 100,
            limit: "channels",
            needed: 101,
            used: 100,
          })
        );

        yield* SqlClient.SqlClient.use(
          (sql) =>
            sql`UPDATE billing.subscriptions SET paid_invoice_at = now() WHERE workspace_id = ${holder}`
        ).pipe(Effect.orDie);

        yield* start;
        yield* cleanUp([holder]);
      }).pipe(Effect.scoped)
  );

  it.effect("report nothing on the 31st, the day still counted", () =>
    Effect.gen(function* thirtyFirst() {
      const days = yield* AccountDays;
      const holder = yield* paying;

      yield* days.raise(DateTime.makeUnsafe("2026-12-31T10:00:00Z"), [
        { count: 5, holder },
      ]);

      assert.deepStrictEqual(yield* keptOf(holder), {
        days: [{ day: "2026-12-31", peak: 5, reported: 0 }],
        reports: [],
      });

      yield* cleanUp([holder]);
    })
  );

  it.effect(
    "count a free holder's day, and report it once its subscription is recorded",
    () =>
      Effect.gen(function* free() {
        const days = yield* AccountDays;
        const holder = yield* workspaceOwnedBy([yield* person]);
        const day = yield* today;

        yield* days.counted(holder, Effect.succeed(2));

        assert.deepStrictEqual(yield* keptOf(holder), {
          days: [{ day, peak: 2, reported: 0 }],
          reports: [],
        });

        // Subscribed mid-day: the day so far goes, once.
        yield* subscribe(holder, "active", "payAsYouGo");
        yield* days.subscribed(holder);
        yield* days.subscribed(holder);

        assert.deepStrictEqual(yield* keptOf(holder), {
          days: [{ day, peak: 2, reported: 2 }],
          reports: [
            {
              customer: "cus_synthetic",
              event: "peal_accounts",
              identifier: identifierOf(holder, day, 2),
              value: 2,
            },
          ],
        });

        yield* cleanUp([holder]);
      })
  );

  it.effect(
    "report the pool's accounts of a holder subscribed on a day not started, and write no day for an empty pool",
    () =>
      Effect.gen(function* unstarted() {
        const days = yield* AccountDays;
        const start = yield* StartAccountDays;
        const day = yield* today;
        const holder = yield* workspaceOwnedBy([yield* person]);
        const empty = yield* workspaceOwnedBy([yield* person]);

        yield* days.bindPool(start.pooledOf);
        yield* WorkspaceEntitlements.use((entitlements) =>
          entitlements.ofEach([holder, empty])
        );
        yield* fill(holder, 3);
        yield* subscribe(holder, "active", "payAsYouGo");
        yield* subscribe(empty, "active", "payAsYouGo");
        yield* days.subscribed(holder);
        yield* days.subscribed(empty);

        assert.deepStrictEqual(yield* keptOf(holder), {
          days: [{ day, peak: 3, reported: 3 }],
          reports: [
            {
              customer: "cus_synthetic",
              event: "peal_accounts",
              identifier: identifierOf(holder, day, 3),
              value: 3,
            },
          ],
        });
        assert.deepStrictEqual(yield* keptOf(empty), { days: [], reports: [] });

        yield* cleanUp([holder, empty]);
      })
  );

  it.effect(
    "hold a channel moved between a partner's customers once, on its home's day",
    () =>
      Effect.gen(function* moved() {
        const days = yield* AccountDays;
        const moves = yield* ChannelMoves;
        const day = yield* today;
        const home = yield* paying;
        const from = yield* workspaceOwnedBy([]);
        const to = yield* workspaceOwnedBy([]);

        yield* partnerOf(home, [from, to]);

        const channel = yield* connectedIn(from);

        yield* connectedIn(from);
        // As their connections counted them.
        yield* days.counted(from, Effect.succeed(2));

        yield* moves.move({
          channelId: channel.id,
          from,
          inside: Effect.void,
          to,
        });

        const kept = yield* keptOf(home);

        // Still two accounts in the pool: the day, and what it reported,
        // are as they were.
        assert.deepStrictEqual(kept.days, [{ day, peak: 2, reported: 2 }]);
        assert.deepStrictEqual(
          kept.reports.map(({ identifier, value }) => ({ identifier, value })),
          [{ identifier: identifierOf(home, day, 2), value: 2 }]
        );
        assert.deepStrictEqual((yield* keptOf(to)).days, []);

        yield* cleanUp([home, from, to]);
      })
  );

  it.effect(
    "count a partner's customers on its home, and a person's workspaces on their billing workspace",
    () =>
      Effect.gen(function* pooled() {
        const days = yield* AccountDays;
        const day = yield* today;
        const owner = yield* person;
        const home = yield* workspaceOwnedBy([owner]);
        const customer = yield* workspaceOwnedBy([]);
        const payer = yield* person;
        const first = yield* workspaceOwnedBy([payer]);
        const second = yield* workspaceOwnedBy([payer]);
        const third = yield* workspaceOwnedBy([payer]);

        yield* partnerOf(home, [customer]);
        yield* days.counted(customer, Effect.succeed(3));
        yield* days.counted(third, Effect.succeed(4));

        assert.deepStrictEqual((yield* keptOf(home)).days, [
          { day, peak: 3, reported: 0 },
        ]);
        assert.deepStrictEqual((yield* keptOf(customer)).days, []);
        assert.deepStrictEqual((yield* keptOf(first)).days, [
          { day, peak: 4, reported: 0 },
        ]);
        assert.deepStrictEqual((yield* keptOf(third)).days, []);

        yield* cleanUp([home, customer, first, second, third]);
      })
  );

  it.effect(
    "start each holder's day with the accounts its workspaces hold, again and again the same",
    () =>
      Effect.gen(function* started() {
        const start = yield* StartAccountDays;
        const day = yield* today;
        const payer = yield* person;
        const first = yield* workspaceOwnedBy([payer]);
        const second = yield* workspaceOwnedBy([payer]);
        const empty = yield* workspaceOwnedBy([yield* person]);
        const holder = yield* paying;

        yield* fill(first, 1);
        yield* fill(second, 2);
        yield* fill(holder, 3);

        // Every workspace given its account first, as the snapshot's
        // sweep does.
        yield* WorkspaceEntitlements.use((entitlements) =>
          entitlements.ofEach([first, second, empty, holder])
        );

        yield* start.run;
        yield* start.run;

        assert.deepStrictEqual((yield* keptOf(first)).days, [
          { day, peak: 3, reported: 0 },
        ]);
        assert.deepStrictEqual((yield* keptOf(empty)).days, []);
        assert.deepStrictEqual(yield* keptOf(holder), {
          days: [{ day, peak: 3, reported: 3 }],
          reports: [
            {
              customer: "cus_synthetic",
              event: "peal_accounts",
              identifier: identifierOf(holder, day, 3),
              value: 3,
            },
          ],
        });

        yield* cleanUp([first, second, empty, holder]);
      })
  );
});

// A server that does not bill counts nothing and reads nothing: no
// holder, no subscription, and the count is never asked for.
const UnbilledTest = AccountDays.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      Layer.mock(AccountDayStore, {}),
      Layer.mock(PlanHolders, {}),
      Layer.mock(Subscriptions, {}),
      UsageBillingTest,
      Layer.succeed(
        BillingMode,
        BillingMode.of({
          enabled: false,
          graceSince: Option.none(),
          graceUntil: Option.none(),
        })
      )
    )
  ),
  Layer.provideMerge(accountsTest)
);

layer(UnbilledTest)("the account-days on a server that does not bill", (it) => {
  it.effect("count nothing, and read nothing to count", () =>
    Effect.gen(function* unbilled() {
      const days = yield* AccountDays;
      const workspaceId = yield* workspaceOwnedBy([yield* person]);

      yield* days.counted(workspaceId, Effect.die("counted"));
      yield* days.subscribed(workspaceId);

      yield* cleanUpAccounts([workspaceId]);
    })
  );
});
