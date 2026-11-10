import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Effect, Option, Redacted } from "effect";

import { AdSignInFailed } from "#ads/application/ad-sign-in-failed.ts";
import type { NewObject } from "#ads/application/ports/ad-network.ts";
import { Audience } from "#ads/domain/audience.ts";
import type { BoostBudget } from "#ads/domain/boost.ts";
import { NetworkObjectIdSchema } from "#ads/domain/ids.ts";
import { CurrencySchema } from "#ads/domain/money.ts";
import { platformRegistrations } from "#channels/infrastructure/platforms/platform-addresses.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  adAccountUsage,
  adsBusinessUsage,
  adsUserId,
  creating,
  euroAccount,
  marketingError,
  settingStatus,
  yenAccount,
} from "#test/ads/fakes/fake-marketing-api.ts";
import { metaAgainstFake, token } from "#test/ads/meta-client.ts";
import { dropped } from "#test/publishing/fakes/platform-server.ts";

const eur = CurrencySchema.make("EUR");
const paris = TimeZoneIdSchema.make("Europe/Paris");
const account = NetworkObjectIdSchema.make("1001");
const at = (iso: string) => DateTime.makeUnsafe(iso);

const campaign: NewObject = { _tag: "campaign", name: "Peal boost b1" };

const total: BoostBudget = { _tag: "total", amount: 5000 };

const adSet = (campaignId: string, budget: BoostBudget = total): NewObject => ({
  _tag: "adSet",
  audience: new Audience({ ageMax: 45, ageMin: 25, countries: ["FR", "BE"] }),
  beneficiary: Option.some("Example Studio"),
  budget,
  campaignId: NetworkObjectIdSchema.make(campaignId),
  endsAt: at("2026-11-17T12:00:00Z"),
  name: "Peal boost b1",
  payer: Option.some("Example Studio"),
  startsAt: at("2026-11-10T12:00:00Z"),
});

const ad = (
  adSetId: string,
  platform: "facebook" | "instagram"
): NewObject => ({
  _tag: "ad",
  adSetId: NetworkObjectIdSchema.make(adSetId),
  name: "Peal boost b1",
  post:
    platform === "facebook"
      ? { accountId: "700", platform, platformPostId: "700_900" }
      : { accountId: "17840000000000001", platform, platformPostId: "1790001" },
});

const snapshotRequest = {
  currency: eur,
  externalId: account,
  since: { day: 1, month: 11, year: 2026 },
  timeZone: paris,
  until: { day: 10, month: 11, year: 2026 },
};

describe("signing in to Meta for ads", () => {
  it.live("asks for reading only on a server that only reads", () =>
    Effect.gen(function* reading() {
      const { client } = yield* metaAgainstFake({}, "read");
      const url = new URL(client.authorizationUrl("state-1"));

      assert.strictEqual(url.pathname, "/v27.0/dialog/oauth");
      assert.strictEqual(url.searchParams.get("scope"), "ads_read");
      assert.strictEqual(url.searchParams.get("state"), "state-1");
      assert.strictEqual(
        url.searchParams.get("redirect_uri"),
        "https://peal.example/connect/ads/meta/callback"
      );
      // The address the operator is told to register for it.
      assert.deepStrictEqual(
        platformRegistrations("https://peal.example")
          .filter(({ id }) => id === "metaAds")
          .flatMap(({ addresses }) => addresses.map((address) => address.url)),
        [url.searchParams.get("redirect_uri")]
      );
    }).pipe(Effect.scoped)
  );

  it.live("asks for what running ads takes on a server that spends", () =>
    Effect.gen(function* spending() {
      const { client } = yield* metaAgainstFake();
      const url = new URL(client.authorizationUrl("state-1"));

      assert.strictEqual(
        url.searchParams.get("scope"),
        "ads_read,ads_management,pages_show_list,pages_read_engagement,pages_manage_ads"
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "exchanges the code for a long-lived token and what was allowed",
    () =>
      Effect.gen(function* exchanging() {
        const { client } = yield* metaAgainstFake({ expiresIn: 5_184_000 });
        const before = yield* DateTime.now;
        const grant = yield* client.complete("good-code");

        assert.strictEqual(grant.platformUserId, adsUserId);
        assert.strictEqual(Redacted.value(grant.token), Redacted.value(token));
        assert.include(grant.scopes, "ads_management");
        assert.isTrue(client.maySpend(grant.scopes));
        assert.isTrue(
          Option.exists(grant.expiresAt, (expiry) =>
            Duration.isGreaterThanOrEqualTo(
              DateTime.distance(before, expiry),
              Duration.days(59)
            )
          )
        );
      }).pipe(Effect.scoped)
  );

  it.live("keeps a token that names no end as one without an end", () =>
    Effect.gen(function* endless() {
      const { client } = yield* metaAgainstFake();

      assert.isTrue(
        Option.isNone((yield* client.complete("good-code")).expiresAt)
      );
    }).pipe(Effect.scoped)
  );

  it.live("connects a person who allowed reading only, without spending", () =>
    Effect.gen(function* readOnly() {
      const { client } = yield* metaAgainstFake({ permissions: ["ads_read"] });
      const grant = yield* client.complete("good-code");

      assert.isFalse(client.maySpend(grant.scopes));
    }).pipe(Effect.scoped)
  );

  it.live(
    "fails when the person declined reading, or the code is refused",
    () =>
      Effect.gen(function* declined() {
        const { client } = yield* metaAgainstFake({ permissions: [] });

        assert.deepStrictEqual(
          yield* Effect.flip(client.complete("good-code")),
          new AdSignInFailed({ reason: "denied" })
        );
        assert.deepStrictEqual(
          yield* Effect.flip(client.complete("stale-code")),
          new AdSignInFailed({ reason: "failed" })
        );
      }).pipe(Effect.scoped)
  );
});

describe("reading ad accounts", () => {
  it.live("lists the accounts a person reaches, page after page", () =>
    Effect.gen(function* listing() {
      const { client } = yield* metaAgainstFake({
        accounts: [euroAccount(), yenAccount()],
        pageSize: 1,
      });

      const [euro, yen] = yield* client.accounts(token);

      assert.strictEqual(euro?.externalId, "1001");
      assert.strictEqual(euro?.currency, "EUR");
      assert.strictEqual(euro?.status, "active");
      assert.deepStrictEqual(euro?.timeZone, Option.some(paris));
      // "A value of 0 means no spending-cap."
      assert.deepStrictEqual(euro?.spendCap, Option.none());
      // Yen have no smaller unit: the cap is in yen.
      assert.deepStrictEqual(yen?.spendCap, Option.some(500_000));
      assert.deepStrictEqual(yen?.amountSpent, Option.some(120_000));
    }).pipe(Effect.scoped)
  );

  it.live(
    "reads a disabled account as disabled, and an unknown zone as none",
    () =>
      Effect.gen(function* disabled() {
        const { client } = yield* metaAgainstFake({
          accounts: [
            {
              ...euroAccount(),
              account_status: 2,
              timezone_name: "Mars/Olympus",
            },
          ],
        });

        const facts = yield* client.account(token, account);

        assert.strictEqual(facts.status, "disabled");
        assert.isTrue(Option.isNone(facts.timeZone));
      }).pipe(Effect.scoped)
  );

  it.live("tells a refused token from a limit and from an outage", () =>
    Effect.gen(function* failures() {
      const { api, client } = yield* metaAgainstFake();

      api.script({ answer: marketingError(190, 463, 401), when: () => true });
      assert.strictEqual(
        (yield* Effect.flip(client.accounts(token)))._tag,
        "TokenRejected"
      );

      api.script({
        answer: marketingError(
          80_004,
          2_446_079,
          400,
          adsBusinessUsage("1001", 12)
        ),
        when: () => true,
      });

      const limited = yield* Effect.flip(client.accounts(token));

      assert.strictEqual(limited._tag, "RateLimited");
      assert.deepStrictEqual(
        limited._tag === "RateLimited" ? limited.retryAfter : undefined,
        Duration.minutes(12)
      );

      api.script({ answer: dropped, when: () => true });
      assert.strictEqual(
        (yield* Effect.flip(client.accounts(token)))._tag,
        "PlatformUnavailable"
      );

      api.script({
        answer: marketingError(200, undefined, 403),
        when: () => true,
      });

      const refused = yield* Effect.flip(client.accounts(token));

      assert.strictEqual(refused._tag, "AdNetworkRefused");
      assert.strictEqual(
        refused._tag === "AdNetworkRefused" ? refused.kind : "",
        "permission"
      );
    }).pipe(Effect.scoped)
  );
});

describe("a snapshot of an account", () => {
  it.live("reads campaigns, ad sets, ads and their days", () =>
    Effect.gen(function* reading() {
      const { api, client } = yield* metaAgainstFake({ pageSize: 2 });

      const held = api.hold("campaign", "1001", {
        name: "Autumn",
        objective: "OUTCOME_TRAFFIC",
      });

      const set = api.hold("adset", "1001", {
        campaign_id: held.id,
        daily_budget: "1500",
        end_time: "2026-11-30T00:00:00+0000",
        name: "France",
        start_time: "2026-11-01T00:00:00+0000",
      });

      const shown = api.hold(
        "ad",
        "1001",
        {
          adset_id: set.id,
          creative: JSON.stringify({ object_story_id: "700_900" }),
          name: "The post",
        },
        "PAUSED"
      );

      api.addInsights([
        {
          actions: [
            { action_type: "post_engagement", value: "31" },
            { action_type: "link_click", value: "4" },
          ],
          ad_id: shown.id,
          clicks: "12",
          date_start: "2026-11-09",
          impressions: "1400",
          reach: "1100",
          spend: "12.5",
        },
        { ad_id: shown.id, date_start: "2026-11-10", spend: "0.07" },
        { ad_id: shown.id, date_start: "2026-10-01", spend: "99" },
      ]);

      const snapshot = yield* client.snapshot(token, snapshotRequest);

      assert.isTrue(snapshot.complete);
      assert.isTrue(Option.isNone(snapshot.haltedFor));
      assert.strictEqual(snapshot.campaigns[0]?.objective, "traffic");
      assert.strictEqual(snapshot.campaigns[0]?.status, "active");
      assert.deepStrictEqual(
        snapshot.adSets[0]?.dailyBudget,
        Option.some(1500)
      );
      assert.strictEqual(snapshot.ads[0]?.status, "paused");
      assert.deepStrictEqual(
        snapshot.ads[0]?.promotedPagePostId,
        Option.some("700_900")
      );
      assert.deepStrictEqual(
        snapshot.insights.map(({ day, results, spend }) => [
          day.day,
          spend,
          results,
        ]),
        [
          [9, 1250, Option.some(31)],
          [10, 7, Option.none()],
        ]
      );
    }).pipe(Effect.scoped)
  );

  it.live("stops reading an account that nears its rate limit", () =>
    Effect.gen(function* halting() {
      const { api, client } = yield* metaAgainstFake({ pageSize: 1 });

      for (const name of ["One", "Two", "Three"]) {
        api.hold("campaign", "1001", { name });
      }

      // The account's own read is under the mark; the listing is not.
      api.script({
        answer: {
          _tag: "answer",
          body: { ...euroAccount(), id: "act_1001" },
          headers: adAccountUsage(10),
          status: 200,
        },
        when: ({ path }) => path === "/v27.0/act_1001",
      });
      api.setUsage(adAccountUsage(80, 240));

      const snapshot = yield* client.snapshot(token, snapshotRequest);

      assert.isFalse(snapshot.complete);
      assert.deepStrictEqual(
        snapshot.haltedFor,
        Option.some(Duration.seconds(240))
      );
      // The first page is kept, and nothing more was asked.
      assert.lengthOf(snapshot.campaigns, 1);
      assert.lengthOf(
        api.requests().filter(({ path }) => path.endsWith("/campaigns")),
        1
      );
      assert.lengthOf(
        api.requests().filter(({ path }) => path.endsWith("/adsets")),
        0
      );
    }).pipe(Effect.scoped)
  );
});

describe("the requests a boost is made of", () => {
  it.live("makes a campaign, an ad set and an ad, each paused", () =>
    Effect.gen(function* making() {
      const { api, client } = yield* metaAgainstFake();

      const campaignId = yield* client.create(token, account, campaign);
      const adSetId = yield* client.create(token, account, adSet(campaignId));

      yield* client.create(token, account, ad(adSetId, "facebook"));

      const [first, second, third] = api.writes();

      assert.strictEqual(first?.path, "/act_1001/campaigns");
      assert.strictEqual(first?.params["status"], "PAUSED");
      assert.strictEqual(first?.params["objective"], "OUTCOME_ENGAGEMENT");
      assert.strictEqual(first?.params["special_ad_categories"], "[]");
      assert.strictEqual(first?.params["name"], "Peal boost b1");

      assert.strictEqual(second?.path, "/act_1001/adsets");
      assert.strictEqual(second?.params["status"], "PAUSED");
      assert.strictEqual(second?.params["lifetime_budget"], "5000");
      assert.isUndefined(second?.params["daily_budget"]);
      assert.strictEqual(
        second?.params["end_time"],
        "2026-11-17T12:00:00.000Z"
      );
      assert.strictEqual(second?.params["dsa_beneficiary"], "Example Studio");
      assert.strictEqual(second?.params["dsa_payor"], "Example Studio");
      assert.deepStrictEqual(JSON.parse(second?.params["targeting"] ?? "{}"), {
        age_max: 45,
        age_min: 25,
        geo_locations: { countries: ["FR", "BE"] },
      });

      assert.strictEqual(third?.path, "/act_1001/ads");
      assert.strictEqual(third?.params["status"], "PAUSED");
      assert.deepStrictEqual(JSON.parse(third?.params["creative"] ?? "{}"), {
        object_story_id: "700_900",
      });

      // The token goes in the body, never in the address.
      assert.isTrue(
        api
          .requests()
          .filter(({ method }) => method === "POST")
          .every(({ search }) => !search.includes("access_token"))
      );
      assert.isTrue(api.objects().every(({ status }) => status === "PAUSED"));
    }).pipe(Effect.scoped)
  );

  it.live(
    "shows an Instagram media through the Page its account is linked to",
    () =>
      Effect.gen(function* instagram() {
        const { api, client } = yield* metaAgainstFake({
          pages: [{ id: "700" }, { id: "701", instagram: "17840000000000001" }],
        });

        const campaignId = yield* client.create(token, account, campaign);
        const adSetId = yield* client.create(token, account, adSet(campaignId));

        yield* client.create(token, account, ad(adSetId, "instagram"));

        assert.deepStrictEqual(
          JSON.parse(api.writes()[2]?.params["creative"] ?? "{}"),
          {
            instagram_user_id: "17840000000000001",
            object_id: "701",
            source_instagram_media_id: "1790001",
          }
        );
      }).pipe(Effect.scoped)
  );

  it.live(
    "refuses an Instagram media whose Page the person does not manage",
    () =>
      Effect.gen(function* unreachable() {
        const { api, client } = yield* metaAgainstFake({
          pages: [{ id: "700" }],
        });

        const campaignId = yield* client.create(token, account, campaign);
        const adSetId = yield* client.create(token, account, adSet(campaignId));

        const refused = yield* Effect.flip(
          client.create(token, account, ad(adSetId, "instagram"))
        );

        assert.strictEqual(refused._tag, "AdNetworkRefused");
        assert.lengthOf(api.objects("ad"), 0);
      }).pipe(Effect.scoped)
  );

  it.live("reads a budget under the network's minimum as its refusal", () =>
    Effect.gen(function* tooLow() {
      const { client } = yield* metaAgainstFake();
      const campaignId = yield* client.create(token, account, campaign);

      const refused = yield* Effect.flip(
        client.create(
          token,
          account,
          adSet(campaignId, { _tag: "daily", amount: 50 })
        )
      );

      assert.strictEqual(
        refused._tag === "AdNetworkRefused" ? refused.kind : refused._tag,
        "budgetTooLow"
      );
      assert.strictEqual(
        refused._tag === "AdNetworkRefused" ? refused.code : "",
        "graph100.1885272"
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "says the outcome is unknown when the answer is lost, and finds the object by its name",
    () =>
      Effect.gen(function* lost() {
        const { api, client } = yield* metaAgainstFake();

        assert.deepStrictEqual(yield* client.find(token, account, campaign), {
          _tag: "absent",
        });

        api.script({ answer: "lost", when: creating("campaigns") });

        assert.strictEqual(
          (yield* Effect.flip(client.create(token, account, campaign)))._tag,
          "OutcomeUnknown"
        );

        const found = yield* client.find(token, account, campaign);

        assert.strictEqual(found._tag, "found");
        assert.lengthOf(api.objects("campaign"), 1);

        const campaignId = found._tag === "found" ? found.value : account;

        api.script({ answer: "lost", when: creating("adsets") });
        yield* Effect.flip(client.create(token, account, adSet(campaignId)));

        const set = yield* client.find(token, account, adSet(campaignId));

        assert.strictEqual(set._tag, "found");
      }).pipe(Effect.scoped)
  );

  it.live(
    "says the outcome is unknown on a failure of the network's own, and a lookup cannot tell while it is down",
    () =>
      Effect.gen(function* down() {
        const { api, client } = yield* metaAgainstFake();

        api.script({
          answer: marketingError(2, undefined, 500),
          when: creating("campaigns"),
        });

        assert.strictEqual(
          (yield* Effect.flip(client.create(token, account, campaign)))._tag,
          "OutcomeUnknown"
        );

        api.script({ answer: dropped, when: () => true });

        assert.deepStrictEqual(yield* client.find(token, account, campaign), {
          _tag: "unknown",
        });
      }).pipe(Effect.scoped)
  );

  it.live("reads a rate limit on a creation as nothing made", () =>
    Effect.gen(function* limited() {
      const { api, client } = yield* metaAgainstFake();

      api.script({
        answer: marketingError(17, 2_446_079, 400, adsBusinessUsage("1001", 5)),
        when: creating("campaigns"),
      });

      assert.strictEqual(
        (yield* Effect.flip(client.create(token, account, campaign)))._tag,
        "RateLimited"
      );
      assert.lengthOf(api.objects(), 0);
    }).pipe(Effect.scoped)
  );

  it.live(
    "runs and pauses an object by setting its state, and reads it back",
    () =>
      Effect.gen(function* running() {
        const { api, client } = yield* metaAgainstFake();
        const campaignId = yield* client.create(token, account, campaign);

        assert.deepStrictEqual(yield* client.isRunning(token, campaignId), {
          _tag: "found",
          value: false,
        });

        yield* client.setRunning(token, campaignId, true);
        yield* client.setRunning(token, campaignId, true);

        assert.deepStrictEqual(yield* client.isRunning(token, campaignId), {
          _tag: "found",
          value: true,
        });

        api.script({
          answer: "lost",
          when: settingStatus(campaignId, "PAUSED"),
        });

        assert.strictEqual(
          (yield* Effect.flip(client.setRunning(token, campaignId, false)))
            ._tag,
          "OutcomeUnknown"
        );
        // The request was taken though its answer was lost.
        assert.deepStrictEqual(yield* client.isRunning(token, campaignId), {
          _tag: "found",
          value: false,
        });
      }).pipe(Effect.scoped)
  );
});
