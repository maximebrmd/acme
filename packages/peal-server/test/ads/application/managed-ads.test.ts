// Managed ads on a server that bills: each ad a sync sees delivering or in
// review is one of the billing account's managed ads a month.
import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";
import { SqlClient } from "effect/sql";

import { AdReports } from "#ads/application/ad-reports.ts";
import { BoostOperations } from "#ads/application/boost-operations.ts";
import { Boosts } from "#ads/application/boosts.ts";
import { SyncAccount } from "#ads/application/sync-account.ts";
import { Audience } from "#ads/domain/audience.ts";
import { CurrencySchema } from "#ads/domain/money.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { TestPosts } from "#test/ads/fakes/test-posts.ts";
import {
  AdsTest,
  adsTestWith,
  connectedAccount,
  freshOwner,
  onMeta,
  spendingOwner,
} from "#test/ads/support.ts";
import { FakeMetersLedger, fakeMeters } from "#test/shared/support.ts";

const noRange = { from: Option.none(), to: Option.none() };

const ledger = FakeMetersLedger.use(Ref.get);

const counted = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        readonly id: string;
      }>`SELECT ad_external_id AS id FROM ads.active_ad_months WHERE workspace_id = ${workspaceId} ORDER BY ad_external_id`
  ).pipe(
    Effect.orDie,
    Effect.map((rows) => rows.map(({ id }) => id))
  );

const yesterday = DateTime.now.pipe(
  Effect.map((now) =>
    DateTime.formatIsoDateUtc(DateTime.subtract(now, { days: 1, hours: 2 }))
  )
);

const insightOf = (adId: string, day: string) => ({
  ad_id: adId,
  clicks: "10",
  date_start: day,
  impressions: "1000",
  reach: "800",
  spend: "1",
});

// A billing account without a payment method, one managed ad left this
// month.
const OneLeftTest = (() => {
  const meters = fakeMeters({
    allowed: Option.some(1),
    paymentMethod: false,
  });

  return Layer.merge(adsTestWith(meters), meters);
})();

layer(OneLeftTest, { excludeTestServices: true })(
  "managed ads without a payment method",
  (it) => {
    it.effect(
      "count an ad seen twice in a month once, and stop recording the ad past the allowance",
      () =>
        Effect.gen(function* syncing() {
          const api = yield* onMeta();
          const owner = yield* freshOwner;
          const account = yield* connectedAccount(owner);
          const sync = yield* SyncAccount;
          const reports = yield* AdReports;

          const campaign = api.hold("campaign", "1001", { name: "Autumn" });
          const adSet = api.hold("adset", "1001", { campaign_id: campaign.id });

          const first = api.hold("ad", "1001", {
            adset_id: adSet.id,
            name: "One",
          });

          yield* sync.run(account.id);
          yield* sync.run(account.id);

          assert.deepStrictEqual(yield* counted(owner.workspaceId), [first.id]);
          assert.lengthOf((yield* ledger).claims, 1);

          // A second ad, past the month's allowance: its numbers are not
          // recorded, and nothing a network runs is touched.
          const second = api.hold("ad", "1001", {
            adset_id: adSet.id,
            name: "Two",
          });

          api.addInsights([
            insightOf(first.id, yield* yesterday),
            insightOf(second.id, yield* yesterday),
          ]);

          yield* sync.run(account.id);

          assert.deepStrictEqual(yield* counted(owner.workspaceId), [first.id]);

          const ads = yield* reports.ads(
            owner,
            account.id,
            Option.some(campaign.id),
            noRange
          );

          assert.deepStrictEqual(
            ads.rows
              .map(({ name, totals }) => [name, totals.spend])
              .toSorted((left, right) =>
                String(left[0]).localeCompare(String(right[0]))
              ),
            [
              ["One", 100],
              ["Two", 0],
            ]
          );
        }).pipe(Effect.scoped)
    );

    it.effect("refuse a new boost once the allowance is used", () =>
      Effect.gen(function* boosting() {
        const api = yield* onMeta();
        const { account, owner } = yield* spendingOwner();
        const campaign = api.hold("campaign", "1001", { name: "Kept" });
        const adSet = api.hold("adset", "1001", { campaign_id: campaign.id });

        api.hold("ad", "1001", { adset_id: adSet.id, name: "Running" });

        yield* SyncAccount.use((sync) => sync.run(account.id));

        const post = yield* TestPosts.use((posts) =>
          posts.publish(owner.workspaceId)
        );

        const now = yield* DateTime.now;

        const refusal = yield* Boosts.use((boosts) =>
          boosts.request(
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
            crypto.randomUUID()
          )
        ).pipe(Effect.flip);

        assert.deepInclude(refusal, {
          _tag: "AllowanceReached",
          meter: "managedAds",
          reason: "paymentMethodRequired",
        });
      }).pipe(Effect.scoped)
    );
  }
);

// A billing account without a payment method, one managed ad left, on a
// layer of its own: its meter starts from zero.
const OwnBoostTest = (() => {
  const meters = fakeMeters({
    allowed: Option.some(1),
    paymentMethod: false,
  });

  return Layer.merge(adsTestWith(meters), meters);
})();

layer(OwnBoostTest, { excludeTestServices: true })(
  "managed ads of Peal's own boosts",
  (it) => {
    it.effect(
      "count and track the ad of a boost made through Peal before any other the network lists",
      () =>
        Effect.gen(function* own() {
          const api = yield* onMeta();
          const { account, owner } = yield* spendingOwner();
          const campaign = api.hold("campaign", "1001", { name: "Other" });
          const adSet = api.hold("adset", "1001", { campaign_id: campaign.id });

          const other = api.hold("ad", "1001", {
            adset_id: adSet.id,
            name: "Listed first",
          });

          const post = yield* TestPosts.use((posts) =>
            posts.publish(owner.workspaceId)
          );

          const now = yield* DateTime.now;

          const asked = yield* Boosts.use((boosts) =>
            boosts.request(
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
              crypto.randomUUID()
            )
          );

          yield* BoostOperations.use((operations) =>
            operations.place(asked.id)
          );

          const { boost } = yield* Boosts.use((boosts) =>
            boosts.get(owner, asked.id)
          );

          const boostAd = Option.getOrThrow(boost.objects.adId);

          yield* SyncAccount.use((sync) => sync.run(account.id));

          const kept = yield* counted(owner.workspaceId);

          assert.include(kept, boostAd);
          assert.notInclude(kept, other.id);
        }).pipe(Effect.scoped)
    );
  }
);

layer(AdsTest, { excludeTestServices: true })(
  "managed ads on a server that does not bill",
  (it) => {
    it.effect("record nothing", () =>
      Effect.gen(function* unbilled() {
        const api = yield* onMeta();
        const owner = yield* freshOwner;
        const account = yield* connectedAccount(owner);
        const campaign = api.hold("campaign", "1001", { name: "Autumn" });
        const adSet = api.hold("adset", "1001", { campaign_id: campaign.id });

        api.hold("ad", "1001", { adset_id: adSet.id, name: "One" });

        yield* SyncAccount.use((sync) => sync.run(account.id));

        assert.deepStrictEqual(yield* counted(owner.workspaceId), []);
      }).pipe(Effect.scoped)
    );
  }
);

// A billing account that pays but whose month holds no more managed ads,
// as a legacy plan at its allowance.
const PlanHeldTest = (() => {
  const meters = fakeMeters({ allowed: Option.some(0), paymentMethod: true });

  return Layer.merge(adsTestWith(meters), meters);
})();

layer(PlanHeldTest, { excludeTestServices: true })(
  "managed ads of an account that pays and can go no further",
  (it) => {
    it.effect("refuse a new boost, payment method or not", () =>
      Effect.gen(function* held() {
        yield* onMeta();

        const { account, owner } = yield* spendingOwner();

        const post = yield* TestPosts.use((posts) =>
          posts.publish(owner.workspaceId)
        );

        const now = yield* DateTime.now;

        const refusal = yield* Boosts.use((boosts) =>
          boosts.request(
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
            crypto.randomUUID()
          )
        ).pipe(Effect.flip);

        assert.deepInclude(refusal, {
          _tag: "AllowanceReached",
          meter: "managedAds",
        });
      }).pipe(Effect.scoped)
    );
  }
);
