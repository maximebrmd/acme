import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Option } from "effect";
import { SqlClient } from "effect/sql";

import { AdConnections } from "#ads/application/ad-connections.ts";
import { AdReports } from "#ads/application/ad-reports.ts";
import { BoostOperations } from "#ads/application/boost-operations.ts";
import { Boosts } from "#ads/application/boosts.ts";
import { AccountStore } from "#ads/application/ports/account-store.ts";
import { PurgeAdData } from "#ads/application/purge-ad-data.ts";
import { SyncAccount } from "#ads/application/sync-account.ts";
import {
  SyncAdAccounts,
  SyncPaceRef,
} from "#ads/application/sync-ad-accounts.ts";
import { Audience } from "#ads/domain/audience.ts";
import { CurrencySchema } from "#ads/domain/money.ts";
import {
  adAccountUsage,
  euroAccount,
  yenAccount,
} from "#test/ads/fakes/fake-marketing-api.ts";
import type { FakeInsight } from "#test/ads/fakes/fake-marketing-api.ts";
import { TestPosts } from "#test/ads/fakes/test-posts.ts";
import {
  AdsTest,
  connected,
  connectedAccount,
  freshOwner,
  member,
  onMeta,
  spendingOwner,
  tagOf,
  TestNetworks,
} from "#test/ads/support.ts";

// A day of the account's calendar, `daysAgo` days back, as the network
// writes dates.
const dayAgo = (daysAgo: number) =>
  DateTime.now.pipe(
    Effect.map((now) =>
      DateTime.formatIsoDateUtc(
        DateTime.subtract(now, { days: daysAgo, hours: 2 })
      )
    )
  );

const insight = (
  adId: string,
  day: string,
  spend: string,
  engagement?: string
): FakeInsight => {
  const row = {
    ad_id: adId,
    clicks: "10",
    date_start: day,
    impressions: "1000",
    reach: "800",
    spend,
  };

  return engagement === undefined
    ? row
    : {
        ...row,
        actions: [{ action_type: "post_engagement", value: engagement }],
      };
};

const noRange = { from: Option.none(), to: Option.none() };

// Rows of a name and something else, in the name's order.
const byName = (left: readonly unknown[], right: readonly unknown[]) =>
  String(left[0]).localeCompare(String(right[0]));

layer(AdsTest, { excludeTestServices: true })("syncing ad accounts", (it) => {
  it.effect(
    "reads campaigns, ads and their days, and reports them with what they spent",
    () =>
      Effect.gen(function* reading() {
        const api = yield* onMeta();
        const owner = yield* freshOwner;
        const account = yield* connectedAccount(owner);
        const sync = yield* SyncAccount;
        const reports = yield* AdReports;

        const campaign = api.hold("campaign", "1001", {
          name: "Autumn",
          objective: "OUTCOME_TRAFFIC",
        });

        const adSet = api.hold("adset", "1001", {
          campaign_id: campaign.id,
          daily_budget: "1500",
          name: "France",
        });

        const ad = api.hold("ad", "1001", { adset_id: adSet.id, name: "One" });

        const other = api.hold("ad", "1001", {
          adset_id: adSet.id,
          name: "Two",
        });

        api.addInsights([
          insight(ad.id, yield* dayAgo(1), "12.5", "31"),
          insight(ad.id, yield* dayAgo(2), "7.25"),
          insight(other.id, yield* dayAgo(1), "1"),
          // Before what the first sync reads.
          insight(ad.id, yield* dayAgo(200), "99"),
        ]);

        assert.strictEqual(yield* sync.run(account.id), "synced");

        const campaigns = yield* reports.campaigns(owner, account.id, noRange);
        const [row] = campaigns.rows;

        assert.lengthOf(campaigns.rows, 1);
        assert.strictEqual(row?.name, "Autumn");
        assert.strictEqual(row?.objective, "traffic");
        assert.strictEqual(row?.status, "active");
        // 12.50 + 7.25 + 1.00, in cents.
        assert.strictEqual(row?.totals.spend, 2075);
        assert.strictEqual(row?.totals.impressions, 3000);
        assert.deepStrictEqual(row?.totals.results, Option.some(31));

        const ads = yield* reports.ads(
          owner,
          account.id,
          Option.some(campaign.id),
          noRange
        );

        assert.deepStrictEqual(
          ads.rows
            .map(({ name, totals }) => [name, totals.spend])
            .toSorted(byName),
          [
            ["One", 1975],
            ["Two", 100],
          ]
        );

        const days = yield* reports.days(owner, account.id, noRange);

        assert.deepStrictEqual(
          days.rows.map(({ spend }) => spend),
          [725, 1350]
        );

        const stored = yield* AccountStore.use((accounts) =>
          accounts.get(account.id)
        );

        assert.isTrue(
          Option.exists(stored, (held) => Option.isSome(held.account.syncedAt))
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "keeps what the network stops listing, as archived, and replaces a day read again",
    () =>
      Effect.gen(function* again() {
        const api = yield* onMeta();
        const owner = yield* freshOwner;
        const account = yield* connectedAccount(owner);
        const sync = yield* SyncAccount;
        const reports = yield* AdReports;
        const campaign = api.hold("campaign", "1001", { name: "Kept" });
        const gone = api.hold("campaign", "1001", { name: "Gone" });
        const adSet = api.hold("adset", "1001", { campaign_id: campaign.id });
        const ad = api.hold("ad", "1001", { adset_id: adSet.id, name: "One" });
        const yesterday = yield* dayAgo(1);

        api.addInsights([insight(ad.id, yesterday, "1")]);
        yield* sync.run(account.id);

        // The network corrects yesterday, and archives a campaign, which it
        // then no longer lists.
        api.addInsights([insight(ad.id, yesterday, "3.5")]);
        gone.status = "ARCHIVED";

        const listed = api.objects("campaign").find(({ id }) => id === gone.id);

        assert.isDefined(listed);
        api.script({
          answer: {
            _tag: "answer",
            body: {
              data: [{ id: campaign.id, name: "Kept", status: "ACTIVE" }],
              paging: { cursors: { after: "1" } },
            },
            status: 200,
          },
          when: ({ method, path }) =>
            method === "GET" && path.endsWith("/act_1001/campaigns"),
        });
        yield* sync.run(account.id);

        const { rows } = yield* reports.campaigns(owner, account.id, noRange);

        assert.deepStrictEqual(
          rows.map(({ name, status }) => [name, status]).toSorted(byName),
          [
            ["Gone", "archived"],
            ["Kept", "active"],
          ]
        );
        // The later reading of the day replaced the earlier one.
        assert.isTrue(
          rows.some(
            ({ name, totals }) => name === "Kept" && totals.spend >= 350
          )
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "shows a post's organic counts beside what the ads that promote it did",
    () =>
      Effect.gen(function* sideBySide() {
        const api = yield* onMeta();
        const { account, owner } = yield* spendingOwner();
        const posts = yield* TestPosts;
        const boosts = yield* Boosts;
        const reports = yield* AdReports;
        const post = yield* posts.publish(owner.workspaceId);
        const now = yield* DateTime.now;

        yield* posts.countOn(post, { likes: 40, replies: 6 });

        const boost = yield* boosts.request(
          owner,
          {
            accountId: account.id,
            audience: new Audience({
              ageMax: 65,
              ageMin: 18,
              countries: ["US"],
            }),
            beneficiary: Option.none(),
            budget: { _tag: "total", amount: 5000 },
            channelId: post.channelId,
            currency: CurrencySchema.make("EUR"),
            endsAt: DateTime.add(now, { days: 7 }),
            payer: Option.none(),
            postId: post.postId,
            specialAdCategory: "none",
            startsAt: Option.none(),
          },
          "side-by-side"
        );

        yield* BoostOperations.use((operations) => operations.place(boost.id));

        const [ad] = api.objects("ad");

        // An ad made outside Peal that promotes the same post, and one that
        // promotes something else.
        const set = api.hold("adset", "1001", { campaign_id: "1" });

        const outside = api.hold("ad", "1001", {
          adset_id: set.id,
          creative: JSON.stringify({ object_story_id: post.platformPostId }),
          name: "Made in the network's own tool",
        });

        const unrelated = api.hold("ad", "1001", {
          adset_id: set.id,
          creative: JSON.stringify({ object_story_id: "700_1" }),
          name: "Another post",
        });

        api.addInsights([
          insight(ad?.id ?? "", yield* dayAgo(0), "20", "55"),
          insight(outside.id, yield* dayAgo(1), "5.5", "9"),
          insight(unrelated.id, yield* dayAgo(1), "100"),
        ]);
        yield* SyncAccount.use((sync) => sync.run(account.id));

        const performance = yield* reports.ofPost(owner, post.postId);

        assert.lengthOf(performance.paid, 1);
        assert.strictEqual(performance.paid[0]?.ads, 2);
        assert.strictEqual(performance.paid[0]?.totals.spend, 2550);
        assert.deepStrictEqual(
          performance.paid[0]?.totals.results,
          Option.some(64)
        );
        assert.strictEqual(
          performance.paid[0]?.account.account.currency,
          "EUR"
        );
        assert.deepStrictEqual(
          performance.organic.map(({ counts }) =>
            counts.pipe(Option.map(({ likes, replies }) => [likes, replies]))
          ),
          [Option.some([40, 6])]
        );
        assert.deepStrictEqual(
          performance.boosts.map(({ id }) => id),
          [boost.id]
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "tells the owners once when a boost has spent its whole budget",
    () =>
      Effect.gen(function* reached() {
        const api = yield* onMeta();
        const { account, owner } = yield* spendingOwner();
        const posts = yield* TestPosts;
        const boosts = yield* Boosts;
        const sync = yield* SyncAccount;
        const post = yield* posts.publish(owner.workspaceId);
        const now = yield* DateTime.now;

        const boost = yield* boosts.request(
          owner,
          {
            accountId: account.id,
            audience: new Audience({
              ageMax: 65,
              ageMin: 18,
              countries: ["US"],
            }),
            beneficiary: Option.none(),
            budget: { _tag: "total", amount: 5000 },
            channelId: post.channelId,
            currency: CurrencySchema.make("EUR"),
            endsAt: DateTime.add(now, { days: 7 }),
            payer: Option.none(),
            postId: post.postId,
            specialAdCategory: "none",
            startsAt: Option.none(),
          },
          "budget"
        );

        yield* BoostOperations.use((operations) => operations.place(boost.id));

        const adId = api.objects("ad")[0]?.id ?? "";

        api.addInsights([insight(adId, yield* dayAgo(1), "20")]);
        yield* sync.run(account.id);

        const news = () =>
          TestNetworks.use((networks) => networks.told(owner.workspaceId)).pipe(
            Effect.map((told) => told.map((entry) => entry.news))
          );

        assert.deepStrictEqual(yield* news(), ["started"]);

        api.addInsights([insight(adId, yield* dayAgo(0), "30")]);
        yield* sync.run(account.id);
        yield* sync.run(account.id);

        assert.deepStrictEqual(yield* news(), ["started", "budgetReached"]);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "puts off an account its network asks to slow down on, and keeps what was read",
    () =>
      Effect.gen(function* halted() {
        const api = yield* onMeta({ pageSize: 1 });
        const owner = yield* freshOwner;
        const account = yield* connectedAccount(owner);
        const accounts = yield* AccountStore;
        const reports = yield* AdReports;

        api.hold("campaign", "1001", { name: "One" });
        api.hold("campaign", "1001", { name: "Two" });
        api.setUsage(adAccountUsage(90, 3600));

        assert.strictEqual(
          yield* SyncAccount.use((sync) => sync.run(account.id)),
          "halted"
        );

        const now = yield* DateTime.now;
        const stored = Option.getOrThrow(yield* accounts.get(account.id));

        // Not read whole, and not due again for the hour the network asked.
        assert.isTrue(Option.isNone(stored.account.syncedAt));
        assert.lengthOf(
          yield* accounts
            .dueForSync(DateTime.add(now, { minutes: 50 }), 10, Option.none())
            .pipe(
              Effect.map((due) =>
                due.filter((entry) => entry.account.id === account.id)
              )
            ),
          0
        );

        // Read without a limit, it still shows nothing archived for being
        // unlisted in a read that was cut short.
        api.setUsage({});
        yield* SyncAccount.use((sync) => sync.run(account.id));

        assert.deepStrictEqual(
          (yield* reports.campaigns(owner, account.id, noRange)).rows
            .map(({ name, status }) => [name, status])
            .toSorted(byName),
          [
            ["One", "active"],
            ["Two", "active"],
          ]
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "stops reading an account whose sign-in the network refuses, until its person signs in again",
    () =>
      Effect.gen(function* refused() {
        const api = yield* onMeta();
        const owner = yield* freshOwner;
        const account = yield* connectedAccount(owner);
        const accounts = yield* AccountStore;

        api.expectToken("another-token");

        assert.strictEqual(
          yield* SyncAccount.use((sync) => sync.run(account.id)),
          "reconnectNeeded"
        );
        assert.deepStrictEqual(
          (yield* TestNetworks.use((networks) =>
            networks.told(owner.workspaceId)
          )).map(({ news }) => news),
          ["reconnectNeeded"]
        );

        const due = () =>
          DateTime.now.pipe(
            Effect.flatMap((now) =>
              accounts.dueForSync(
                DateTime.add(now, { days: 1 }),
                1000,
                Option.none()
              )
            ),
            Effect.map((listed) =>
              listed.filter((entry) => entry.account.id === account.id)
            )
          );

        assert.lengthOf(yield* due(), 0);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "reads every account that is due, and says what a run left when it is out of time",
    () =>
      Effect.gen(function* sweeping() {
        yield* onMeta({ accounts: [euroAccount(), yenAccount()] });

        const owner = yield* freshOwner;
        const accounts = yield* AccountStore;

        yield* connected(owner, ["1001", "1002"]);

        const mine = new Set(
          (yield* accounts.list(owner.workspaceId)).map(
            ({ account }) => account.id
          )
        );

        const dueOfMine = (at: DateTime.Utc) =>
          accounts
            .dueForSync(at, 1000, Option.none())
            .pipe(
              Effect.map((due) =>
                due.filter((entry) => mine.has(entry.account.id))
              )
            );

        const now = yield* DateTime.now;
        const sql = yield* SqlClient.SqlClient;

        // The sweep reads every account that is due: those other tests left
        // are put off, so this one reads its own.
        yield* sql`UPDATE ads.accounts SET next_sync_at = next_sync_at + interval '7 days' WHERE workspace_id <> ${owner.workspaceId} AND next_sync_at < ${DateTime.toDateUtc(DateTime.add(now, { days: 1 }))}`;

        assert.lengthOf(yield* dueOfMine(now), 2);

        // A run already past its budget starts nothing, and says so.
        const late = yield* SyncAdAccounts.use((sweep) =>
          sweep.run(DateTime.subtract(now, { hours: 2 }))
        ).pipe(
          Effect.provide(SyncAdAccounts.layer),
          Effect.provideService(SyncPaceRef, {
            accountConcurrency: 2,
            accountsPerPage: 1,
            budget: Duration.minutes(50),
          })
        );

        assert.strictEqual(late.synced, 0);

        const report = yield* SyncAdAccounts.use((sweep) => sweep.run(now));

        assert.strictEqual(report.synced, 2);
        assert.strictEqual(report.left, 0);
        assert.lengthOf(yield* dueOfMine(now), 0);
        // Due again in an hour.
        assert.lengthOf(
          yield* dueOfMine(DateTime.add(now, { minutes: 61 })),
          2
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "reads ads only for who may read them, in their own workspace",
    () =>
      Effect.gen(function* access() {
        yield* onMeta();

        const owner = yield* freshOwner;
        const stranger = yield* freshOwner;
        const account = yield* connectedAccount(owner);
        const reports = yield* AdReports;

        assert.strictEqual(
          yield* tagOf(reports.campaigns(stranger, account.id, noRange)),
          "AdAccountNotFound"
        );
        assert.strictEqual(
          yield* tagOf(
            reports.campaigns(
              member(owner.workspaceId, "viewer"),
              account.id,
              noRange
            )
          ),
          "MissingPermission"
        );
        assert.strictEqual(
          yield* tagOf(
            reports.days(owner, account.id, {
              from: Option.some({ day: 1, month: 1, year: 2020 }),
              to: Option.some({ day: 1, month: 1, year: 2026 }),
            })
          ),
          "InvalidAdRange"
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "removes a sign-in that connected nothing, and leaves one that did",
    () =>
      Effect.gen(function* purging() {
        yield* onMeta();

        const owner = yield* freshOwner;
        const unused = yield* freshOwner;
        const connections = yield* AdConnections;

        yield* connectedAccount(owner);
        yield* Effect.flatMap(connections.begin(unused, "meta"), (url) =>
          connections.complete(unused, {
            code: Option.some("good-code"),
            error: Option.none(),
            network: "meta",
            state: new URL(url).searchParams.get("state") ?? "",
          })
        );

        assert.lengthOf(yield* connections.list(unused), 1);

        // Within its day, it stays.
        yield* PurgeAdData.use((retention) => retention.purge);
        assert.lengthOf(yield* connections.list(unused), 1);
        assert.lengthOf(yield* connections.list(owner), 1);
      }).pipe(Effect.scoped)
  );
});
