import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref, Schema } from "effect";

import { minorUnits, money } from "#ads-money.ts";

import { filesLayer, signedIn } from "./signed-in.ts";
import type { Runs } from "./signed-in.ts";
import {
  boostablePostId,
  boostIdAfter,
  euroAccountId,
  facebookPageId,
  runningBoostId,
  yenAccountId,
} from "./studio-ads.ts";
import type { AdsWorld } from "./studio-ads.ts";
import { instagramId, mastodonId, scheduledId, studioId } from "./studio.ts";
import type { Studio, StudioKey } from "./studio.ts";

// peal ads, against the in-memory studio: what each subcommand asks the
// server, what it prints, and that nothing spends without the person's
// agreement.

const inStudio = ["--workspace", "studio"];

const parsed = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown));

const ErrorSchema = Schema.fromJsonString(
  Schema.Struct({ error: Schema.Record(Schema.String, Schema.Unknown) })
);

const errorOf = (text: string) =>
  Schema.decodeUnknownSync(ErrorSchema)(text).error;

const changes = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ changes: made }) => made));

const boostsOf = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ ads }) => ads.boosts));

const setAds = (studio: Studio, change: Partial<AdsWorld>) =>
  Ref.update(studio.state, (current) => ({
    ...current,
    ads: { ...current.ads, ...change },
  }));

// A sign-in that asked to work with ads, as peal login --ads does.
const withAds = signedIn({ withAds: true });

const newBoostId = boostIdAfter(1);

// A boost of 50.00 EUR in all, until the 20th, in France and Belgium.
const flags = {
  "--account": euroAccountId,
  "--beneficiary": "Studio",
  "--channel": facebookPageId,
  "--countries": "FR,BE",
  "--currency": "EUR",
  "--ends": "2026-11-20T09:00:00Z",
  "--payer": "Studio",
  "--post": boostablePostId,
  "--total": "50",
};

const boostArgs = (
  command: "create" | "quote",
  overrides: Readonly<Record<string, string | null>> = {},
  ...rest: readonly string[]
) => [
  "ads",
  "boost",
  command,
  ...Object.entries({ ...flags, ...overrides }).flatMap(([flag, value]) =>
    value === null ? [] : [flag, value]
  ),
  "--not-special-category",
  ...rest,
  ...inStudio,
];

const spendingKey: StudioKey = {
  id: "5f8b2c3d-4e6a-4b7c-8d9e-1f2a3b4c5d6e",
  key: "peal_test_synthetic_ads_reading_key",
  permissions: ["ads:read", "channel:read"],
  workspaceId: studioId,
};

const ownerKey: StudioKey = {
  id: "6a9c3d4e-5f7b-4c8d-9e0f-2a3b4c5d6e7f",
  key: "peal_test_synthetic_ads_owner_key",
  permissions: ["ads:read", "ads:manage", "ads:spend", "ads:authorize"],
  workspaceId: studioId,
};

const withKey = (
  session: { withEnv: (env: Record<string, string>) => Runs },
  key: StudioKey
) => session.withEnv({ PEAL_API_KEY: key.key, PEAL_WORKSPACE: studioId });

const amount = (given: string, currency: string, digits: 0 | 2) =>
  minorUnits(given, currency, digits, "--total");

const refusal = (given: string, currency: string, digits: 0 | 2) =>
  amount(given, currency, digits).pipe(
    Effect.flip,
    Effect.map(({ reason }) => reason)
  );

describe("an amount typed in a currency's units", () => {
  it.effect("is counted in minor units, from its digits alone", () =>
    Effect.gen(function* counts() {
      assert.strictEqual(yield* amount("50", "EUR", 2), 5000);
      assert.strictEqual(yield* amount("50.00", "EUR", 2), 5000);
      assert.strictEqual(yield* amount("50.5", "EUR", 2), 5050);
      assert.strictEqual(yield* amount("50", "JPY", 0), 50);
      // Neither is a sum of binary fractions: 4.35 * 100 is 434.99999….
      assert.strictEqual(yield* amount("4.35", "EUR", 2), 435);
      assert.strictEqual(yield* amount("1.15", "EUR", 2), 115);
      assert.strictEqual(yield* amount("0.07", "EUR", 2), 7);
    })
  );

  it.effect("is refused when finer than the currency, zero or not one", () =>
    Effect.gen(function* refuses() {
      assert.include(
        yield* refusal("50.5", "JPY", 0),
        "JPY has no smaller unit: --total takes a whole amount, not 50.5."
      );
      assert.include(
        yield* refusal("0.001", "EUR", 2),
        "EUR goes to 2 decimals: --total 0.001 is finer than that."
      );
      assert.include(yield* refusal("0", "EUR", 2), "above zero");
      assert.include(yield* refusal("0.00", "EUR", 2), "above zero");

      for (const garbage of ["fifty", "50,00", "-5", "1e3", "5.", ".5", ""]) {
        assert.include(
          yield* refusal(garbage, "EUR", 2),
          "--total takes an amount in EUR"
        );
      }
    })
  );

  it("is written back from its digits", () => {
    assert.strictEqual(money(5000, "EUR", 2), "50.00 EUR");
    assert.strictEqual(money(7, "EUR", 2), "0.07 EUR");
    assert.strictEqual(money(435, "EUR", 2), "4.35 EUR");
    assert.strictEqual(money(5000, "JPY", 0), "5000 JPY");
  });
});

describe("peal ads, reading", () => {
  it.effect("says what the server offers", () =>
    Effect.gen(function* status() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed(["ads", "status", ...inStudio]),
        "This server offers ads, spending included"
      );

      yield* setAds(session.studio, { mode: "read" });

      const reading = yield* session.printed(["ads", "status", ...inStudio]);

      assert.include(reading, "Nothing spends");
      assert.include(reading, "Ad networks: meta.");

      yield* setAds(session.studio, { mode: "off" });

      assert.include(
        yield* session.printed(["ads", "status", ...inStudio]),
        "Ads are off on this server"
      );
      assert.deepStrictEqual(
        parsed(
          yield* session.printed(["ads", "status", "--json", ...inStudio])
        ),
        { mode: "off", networks: [] }
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists the ad accounts, with what each may spend", () =>
    Effect.gen(function* accounts() {
      const session = yield* signedIn();
      const listed = yield* session.printed(["ads", "accounts", ...inStudio]);

      assert.match(
        listed,
        new RegExp(
          `${euroAccountId}\\s+Studio ads\\s+meta\\s+EUR\\s+active\\s+spending on, 300\\.00 EUR a month at most`,
          "u"
        )
      );
      assert.match(
        listed,
        new RegExp(
          `${yenAccountId}\\s+Studio Japan\\s+meta\\s+JPY\\s+active\\s+spending off`,
          "u"
        )
      );

      const one = yield* session.printed([
        "ads",
        "account",
        euroAccountId,
        ...inStudio,
      ]);

      assert.match(one, /Committed this month\s+120\.00 EUR/u);
      assert.match(one, /Spending\s+on: .* 300\.00 EUR in a calendar month/u);

      const yen = yield* session.printed([
        "ads",
        "account",
        yenAccountId,
        ...inStudio,
      ]);

      assert.match(yen, /Spending\s+off: an owner turns it on/u);
      assert.match(yen, /Its own cap\s+500000 JPY at the ad network/u);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says who connects an ad account, where none is", () =>
    Effect.gen(function* none() {
      const session = yield* signedIn();

      yield* setAds(session.studio, { accounts: [] });

      const listed = yield* session.printed(["ads", "accounts", ...inStudio]);

      assert.include(listed, "Studio connects no ad account.");
      assert.include(
        listed,
        "are a person's, in the web app, signed in themselves: no command, API key or application does them."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("reads campaigns, ads and each day's numbers", () =>
    Effect.gen(function* reports() {
      const session = yield* signedIn();

      const campaigns = yield* session.printed([
        "ads",
        "campaigns",
        euroAccountId,
        "--from",
        "2026-11-01",
        "--to",
        "2026-11-09",
        ...inStudio,
      ]);

      assert.include(
        campaigns,
        "Campaigns of Studio ads, with what their ads did from 2026-11-01 to 2026-11-09:"
      );
      assert.match(
        campaigns,
        /120210000000000001\s+Spring catalogue\s+active\s+engagement\s+43\.50 EUR spent\s+12000 impressions/u
      );

      const listed = yield* session.printed([
        "ads",
        "list",
        euroAccountId,
        "--campaign",
        "120210000000000001",
        ...inStudio,
      ]);

      assert.include(listed, `post ${boostablePostId}`);
      assert.include(
        yield* session.printed([
          "ads",
          "list",
          euroAccountId,
          "--campaign",
          "another",
          ...inStudio,
        ]),
        "Peal has read no such ad of Studio ads"
      );
      assert.match(
        yield* session.printed(["ads", "insights", euroAccountId, ...inStudio]),
        /2026-11-07\s+20\.35 EUR spent\s+5600 impressions/u
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("shows a post's organic and paid numbers apart", () =>
    Effect.gen(function* post() {
      const session = yield* signedIn();

      const shown = yield* session.printed([
        "ads",
        "post",
        boostablePostId,
        ...inStudio,
      ]);

      assert.include(shown, "never add the two");
      assert.match(shown, /Organic, by channel:\n.*40 likes.*900 impressions/u);
      assert.match(
        shown,
        /Paid, by ad account:\n\s+Studio ads\s+1 ad\s+43\.50 EUR spent/u
      );
      assert.match(
        shown,
        new RegExp(
          `Boosts:\\n\\s+${runningBoostId}\\s+active\\s+post ${boostablePostId}\\s+120\\.00 EUR for the whole run`,
          "u"
        )
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists boosts, and shows one with what was sent for it", () =>
    Effect.gen(function* boosts() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed(["ads", "boosts", ...inStudio]),
        runningBoostId
      );
      assert.include(
        yield* session.printed([
          "ads",
          "boosts",
          "--post",
          scheduledId,
          ...inStudio,
        ]),
        `Post ${scheduledId} has no boost.`
      );

      const shown = yield* session.printed([
        "ads",
        "boost",
        "show",
        runningBoostId,
        ...inStudio,
      ]);

      assert.include(
        shown,
        `Boost ${runningBoostId} is active: it runs, and spends, until its end.`
      );
      assert.match(shown, /Most it can cost\s+120\.00 EUR/u);
      assert.match(shown, /Audience\s+people aged 18 to 65 and over, in FR/u);
      assert.match(shown, /2026-11-05T09:00:10Z\s+createCampaign\s+done/u);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says why a boost failed, and that one may be spending", () =>
    Effect.gen(function* states() {
      const session = yield* signedIn();
      const [running] = yield* boostsOf(session.studio);

      assert.isDefined(running);

      const show = ["ads", "boost", "show", runningBoostId, ...inStudio];

      yield* setAds(session.studio, {
        boosts:
          running === undefined ? [] : [{ ...running, state: "unconfirmed" }],
      });

      assert.include(yield* session.printed(show), "it MAY BE SPENDING");

      yield* setAds(session.studio, {
        boosts:
          running === undefined
            ? []
            : [
                {
                  ...running,
                  failureReason: "budgetTooLow",
                  networkCode: "1885272",
                  state: "failed",
                },
              ],
      });

      const failed = yield* session.printed(show);

      assert.include(failed, "nothing ran or was spent");
      assert.include(
        failed,
        "Why: the budget is under the ad network's minimum: ask for a larger one (the network's code: 1885272)."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("prints each answer as the contract encodes it", () =>
    Effect.gen(function* json() {
      const session = yield* signedIn();

      const read = (...args: readonly string[]) =>
        session
          .printed(["ads", ...args, "--json", ...inStudio])
          .pipe(Effect.map(parsed));

      assert.deepStrictEqual(yield* read("status"), {
        mode: "spend",
        networks: ["meta"],
      });
      assert.isArray(yield* read("accounts"));
      assert.deepInclude(yield* read("account", euroAccountId), {
        committedThisMonth: 12_000,
      });
      assert.hasAllKeys(yield* read("campaigns", euroAccountId), [
        "account",
        "from",
        "rows",
        "to",
      ]);
      assert.hasAllKeys(yield* read("list", euroAccountId), [
        "account",
        "from",
        "rows",
        "to",
      ]);
      assert.hasAllKeys(yield* read("insights", euroAccountId), [
        "account",
        "from",
        "rows",
        "to",
      ]);
      assert.hasAllKeys(yield* read("post", boostablePostId), [
        "boosts",
        "organic",
        "paid",
      ]);
      assert.hasAllKeys(yield* read("boosts"), ["boosts", "nextCursor"]);
      assert.hasAllKeys(yield* read("boost", "show", runningBoostId), [
        "boost",
        "steps",
      ]);
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("tells a member who may not read ads, and an unknown id", () =>
    Effect.gen(function* refused() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused(["ads", "accounts", "--workspace", "shop"]),
        "Your role in this workspace does not have the permission ads:read."
      );
      assert.include(
        yield* session.refused(["ads", "account", "unknown", ...inStudio]),
        "The workspace has no ad account with that id: peal ads accounts lists them."
      );
      assert.include(
        yield* session.refused([
          "ads",
          "boost",
          "show",
          "unknown",
          ...inStudio,
        ]),
        "The workspace has no boost with that id: peal ads boosts lists them."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal ads boost quote", () => {
  it.effect("says what a boost would spend, and makes nothing", () =>
    Effect.gen(function* quotes() {
      const session = yield* withAds;
      const quoted = yield* session.printed(boostArgs("quote"));

      assert.include(quoted, "Checked, and made nothing");
      assert.match(quoted, /Most it can cost\s+50\.00 EUR/u);
      assert.match(quoted, /Budget\s+50\.00 EUR for the whole run/u);
      assert.match(quoted, /Starts\s+2026-11-09T12:00:00Z/u);
      assert.match(
        quoted,
        /Ends\s+2026-11-20T09:00:00Z: 12 calendar days of the ad account's time zone \(Europe\/Paris\)/u
      );
      assert.match(
        quoted,
        /Audience\s+people aged 18 to 65 and over, in FR, BE/u
      );
      assert.match(
        quoted,
        /Ad account\s+Studio ads \(meta, act_1000000000000001\): the ad network charges its payment method/u
      );
      assert.match(
        quoted,
        /Monthly ceiling\s+300\.00 EUR, of which its other boosts already commit 120\.00 EUR: 180\.00 EUR left before this one/u
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("counts a daily budget over its days, and a quarter more", () =>
    Effect.gen(function* daily() {
      const session = yield* withAds;

      const quoted = parsed(
        yield* session.printed(
          boostArgs(
            "quote",
            {
              "--daily": "4.35",
              "--ends": "2026-11-13T10:00",
              "--starts": "2026-11-10T10:00",
              "--total": null,
            },
            "--json"
          )
        )
      );

      // Four days of Paris, at 4.35 EUR, and 25% more: 21.75 EUR.
      assert.deepInclude(quoted, {
        commitment: 2175,
        committed: 12_000,
        currency: "EUR",
        days: 4,
        endsAt: "2026-11-13T09:00:00.000Z",
        minorUnitDigits: 2,
      });
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses, before any request, what it can tell by itself", () =>
    Effect.gen(function* refusals() {
      const session = yield* withAds;

      const special = yield* session.refused(
        boostArgs("quote").filter((word) => word !== "--not-special-category")
      );

      assert.include(
        special,
        "Peal does not boost ads about housing, employment, financial products or services, or social issues, elections or politics."
      );
      assert.include(special, "--not-special-category");
      assert.include(
        yield* session.refused(boostArgs("quote", { "--daily": "5" })),
        "Give --total or --daily, not both."
      );
      assert.include(
        yield* session.refused(boostArgs("quote", { "--total": null })),
        "No budget is ever assumed."
      );
      assert.include(
        yield* session.refused(boostArgs("quote", { "--countries": "France" })),
        "--countries takes 1 to 25 ISO 3166-1 alpha-2 codes"
      );
      assert.include(
        yield* session.refused(boostArgs("quote", { "--age-min": "16" })),
        "--age-min and --age-max take 18 to 65"
      );
      assert.include(
        yield* session.refused(boostArgs("quote", { "--ends": "next week" })),
        "--ends takes an instant"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("never converts or rounds an amount", () =>
    Effect.gen(function* amounts() {
      const session = yield* withAds;

      assert.include(
        yield* session.refused(boostArgs("quote", { "--currency": "USD" })),
        "The ad account Studio ads is in EUR, and --currency says USD: a budget is written in the account's currency, and none is ever converted. Nothing was sent."
      );
      assert.include(
        yield* session.refused(boostArgs("quote", { "--total": "0.001" })),
        "EUR goes to 2 decimals"
      );
      assert.include(
        yield* session.refused(
          boostArgs("quote", {
            "--account": yenAccountId,
            "--currency": "JPY",
            "--total": "50.5",
          })
        ),
        "JPY has no smaller unit"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("explains what the server refuses", () =>
    Effect.gen(function* refusals() {
      const session = yield* withAds;

      const european = yield* session.refused(
        boostArgs("quote", { "--beneficiary": null, "--payer": null })
      );

      assert.include(
        european,
        "Peal refused the boost, and reserved and sent nothing:"
      );
      assert.include(
        european,
        "beneficiaryRequired: the audience is in the European Union"
      );
      assert.include(european, "give --beneficiary and --payer");
      assert.include(
        yield* session.refused(
          boostArgs("quote", { "--ends": "2026-11-09T18:00:00Z" })
        ),
        "runTooShort: the run is shorter than a day"
      );
      assert.include(
        yield* session.refused(boostArgs("quote", { "--post": scheduledId })),
        "The post is not published on that channel"
      );
      assert.include(
        yield* session.refused(boostArgs("quote", { "--channel": mastodonId })),
        "Peal boosts posts on Facebook Pages and Instagram only"
      );
      assert.include(
        yield* session.refused(
          boostArgs("quote", { "--channel": instagramId })
        ),
        "connected through Instagram Login, which cannot run ads"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says what only a person does, in the web app", () =>
    Effect.gen(function* persons() {
      const session = yield* withAds;

      // Spending is off on the account in yen: only an owner turns it on.
      assert.include(
        yield* session.refused(
          boostArgs("quote", {
            "--account": yenAccountId,
            "--countries": "JP",
            "--currency": "JPY",
          })
        ),
        "An owner turns spending on, with a monthly ceiling, in the web app, signed in themselves: no command, API key or application does it. Nothing was spent."
      );

      yield* setAds(session.studio, { mode: "read" });

      assert.include(
        yield* session.refused(boostArgs("quote")),
        "This server offers ads for reading only"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("names the ceiling, what is committed and what was asked", () =>
    Effect.gen(function* ceiling() {
      const session = yield* withAds;

      const over = yield* session.refused(
        boostArgs("quote", { "--total": "200" })
      );

      assert.include(
        over,
        "The boost would pass the ad account's monthly ceiling: the ceiling is 300.00 EUR, its boosts already commit 120.00 EUR, and this one would add 200.00 EUR. Nothing was reserved or sent. An owner raises the ceiling in the web app, or make the boost smaller; Peal never raises a ceiling on its own."
      );
      assert.include(over, "(spend_ceiling_exceeded)");

      const failure = errorOf(
        yield* session.refused(
          boostArgs("create", { "--total": "200" }, "--yes", "--json")
        )
      );

      assert.deepInclude(failure, {
        ceiling: 30_000,
        code: "spend_ceiling_exceeded",
        committed: 12_000,
        currency: "EUR",
        requested: 20_000,
      });
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal ads boost create", () => {
  it.effect("prints what it will spend, and makes nothing unasked", () =>
    Effect.gen(function* unasked() {
      const session = yield* withAds;

      // Nobody is at a terminal, and nobody said yes.
      const { errors, logs } = yield* session.refusedAfter(boostArgs("create"));

      assert.include(
        logs,
        "This boost SPENDS MONEY: up to 50.00 EUR, until 2026-11-20T09:00:00Z."
      );
      assert.match(logs, /Monthly ceiling\s+300\.00 EUR/u);
      assert.include(errors, "Nothing was done");
      assert.include(errors, "--yes");
      assert.notInclude(logs, "Idempotency key");
      assert.deepStrictEqual(yield* changes(session.studio), []);
      assert.lengthOf(yield* boostsOf(session.studio), 1);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("asks at a terminal, and takes only yes for an answer", () =>
    Effect.gen(function* asks() {
      const session = yield* withAds;

      for (const answer of ["", "no", "maybe"]) {
        const { errors, logs } = yield* session
          .answering([answer])
          .refusedAfter(boostArgs("create"));

        assert.include(logs, "Boost this post? Type yes to confirm:");
        assert.include(errors, "Not confirmed: nothing was done.");
      }

      // Nor when the person leaves without answering.
      assert.include(
        yield* session.answering([]).refused(boostArgs("create")),
        "Not confirmed: nothing was done."
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);

      const made = yield* session
        .answering(["yes"])
        .printed(boostArgs("create"));

      assert.include(made, `Boost ${newBoostId} is requested`);
      assert.lengthOf(yield* boostsOf(session.studio), 2);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("makes the boost with --yes, and says how to read it", () =>
    Effect.gen(function* creates() {
      const session = yield* withAds;
      const made = yield* session.printed(boostArgs("create", {}, "--yes"));

      const [, key = ""] =
        /Idempotency key: (?<key>[\da-f-]{36})\./u.exec(made) ?? [];

      assert.match(key, /^[\da-f-]{36}$/u);
      assert.include(made, `--idempotency-key ${key}`);
      assert.include(
        made,
        `Boost ${newBoostId} is requested: it was accepted and is being made in the background, paused first: it spends nothing yet.`
      );
      assert.include(
        made,
        `See how it went: peal ads boost show ${newBoostId} --workspace studio`
      );
      assert.include(made, `peal ads boost stop ${newBoostId}`);
      assert.deepStrictEqual(yield* changes(session.studio), [
        `ads:boost:create:${newBoostId}:total:5000:EUR:${key}`,
      ]);

      const [boost] = yield* boostsOf(session.studio);

      assert.deepInclude(boost, {
        audience: { ageMax: 65, ageMin: 18, countries: ["FR", "BE"] },
        committed: 5000,
        state: "requested",
      });
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("never asks with --json, and takes --yes for the answer", () =>
    Effect.gen(function* json() {
      const session = yield* withAds;

      // Even at a terminal, where it could ask.
      const failure = errorOf(
        yield* session
          .answering(["yes"])
          .refused(boostArgs("create", {}, "--json"))
      );

      assert.strictEqual(failure["code"], "confirmation_required");
      assert.include(failure["message"], "--yes is required with --json");
      assert.deepStrictEqual(yield* changes(session.studio), []);

      const made = parsed(
        yield* session.printed(boostArgs("create", {}, "--json", "--yes"))
      );

      assert.deepInclude(made, {
        budget: { amount: 5000, kind: "total" },
        currency: "EUR",
        id: newBoostId,
        state: "requested",
      });
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses an ad of a special category before any request", () =>
    Effect.gen(function* special() {
      const session = yield* withAds;

      const refused = yield* session.refused(
        boostArgs("create", {}, "--yes").filter(
          (word) => word !== "--not-special-category"
        )
      );

      assert.include(
        refused,
        "Peal does not boost ads about housing, employment, financial products or services, or social issues, elections or politics. Nothing was sent."
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("makes one boost for one key, however often it is sent", () =>
    Effect.gen(function* idempotent() {
      const session = yield* withAds;
      const keyed = ["--yes", "--json", "--idempotency-key", "spring-boost-1"];

      const first = parsed(
        yield* session.printed(boostArgs("create", {}, ...keyed))
      );

      const again = parsed(
        yield* session.printed(boostArgs("create", {}, ...keyed))
      );

      assert.deepStrictEqual(again, first);
      assert.deepStrictEqual(yield* changes(session.studio), [
        `ads:boost:create:${newBoostId}:total:5000:EUR:spring-boost-1`,
      ]);
      assert.lengthOf(yield* boostsOf(session.studio), 2);

      // The same key, for another budget: nothing is made.
      const reused = yield* session.refused(
        boostArgs(
          "create",
          { "--total": "60" },
          "--yes",
          "--idempotency-key",
          "spring-boost-1"
        )
      );

      assert.include(
        reused,
        "This idempotency key already names a boost of the workspace that asked for something else"
      );
      assert.lengthOf(yield* boostsOf(session.studio), 2);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal ads boost pause, resume and stop", () => {
  it.effect("pauses once, however often it is asked", () =>
    Effect.gen(function* pauses() {
      const session = yield* withAds;
      const pause = ["ads", "boost", "pause", runningBoostId, ...inStudio];
      const paused = yield* session.printed(pause);

      assert.include(
        paused,
        `Boost ${runningBoostId} is paused: it spends nothing while paused`
      );
      assert.deepInclude(parsed(yield* session.printed([...pause, "--json"])), {
        id: runningBoostId,
        state: "paused",
      });
      assert.deepStrictEqual(yield* changes(session.studio), [
        `ads:boost:pause:${runningBoostId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("asks before resuming, which spends", () =>
    Effect.gen(function* resumes() {
      const session = yield* withAds;
      const resume = ["ads", "boost", "resume", runningBoostId, ...inStudio];

      yield* session.printed([
        "ads",
        "boost",
        "pause",
        runningBoostId,
        ...inStudio,
      ]);

      const { errors, logs } = yield* session.refusedAfter(resume);

      assert.include(
        logs,
        `Resuming boost ${runningBoostId} SPENDS MONEY: it runs again until 2026-11-25T09:00:00Z, on a budget of 120.00 EUR for the whole run`
      );
      assert.include(errors, "Nothing was done");
      assert.strictEqual(
        errorOf(yield* session.refused([...resume, "--json"]))["code"],
        "confirmation_required"
      );
      assert.include(
        yield* session.answering(["n"]).refused(resume),
        "Not confirmed: nothing was done."
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `ads:boost:pause:${runningBoostId}`,
      ]);
      assert.include(
        yield* session.answering(["y"]).printed(resume),
        `Boost ${runningBoostId} is active`
      );
      // A boost that runs is not resumed again.
      assert.include(
        yield* session.refused([...resume, "--yes"]),
        "The boost is active, which does not allow this: only a paused boost resumes"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("stops for good, once, after asking", () =>
    Effect.gen(function* stops() {
      const session = yield* withAds;
      const stop = ["ads", "boost", "stop", runningBoostId, ...inStudio];

      const { errors, logs } = yield* session.refusedAfter(stop);

      assert.include(logs, "is final: it never runs again");
      assert.include(errors, "Nothing was done");
      assert.strictEqual(
        errorOf(yield* session.refused([...stop, "--json"]))["code"],
        "confirmation_required"
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
      assert.include(
        yield* session.printed([...stop, "--yes"]),
        `Boost ${runningBoostId} is stopped: it was stopped for good, and never runs again.`
      );
      assert.deepInclude(
        parsed(yield* session.printed([...stop, "--yes", "--json"])),
        { state: "stopped" }
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `ads:boost:stop:${runningBoostId}`,
      ]);
      assert.include(
        yield* session.refused([
          "ads",
          "boost",
          "pause",
          runningBoostId,
          ...inStudio,
        ]),
        "The boost is stopped, which does not allow this"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal ads, and who may spend", () => {
  it.effect("asks for the ads scope only with peal login --ads", () =>
    Effect.gen(function* scopes() {
      // A sign-in as every sign-in is made reads ads, and spends nothing.
      const session = yield* signedIn();

      assert.include(
        yield* session.printed(["ads", "accounts", ...inStudio]),
        euroAccountId
      );

      const told =
        "This sign-in was made without the permission to work with ads (the scope workspace:ads), which is asked only on purpose, as it lets an application spend: run peal login --ads again and approve it. Nothing was done.";

      assert.include(yield* session.refused(boostArgs("quote")), told);
      assert.include(
        yield* session.refused(boostArgs("create", {}, "--yes")),
        told
      );
      assert.include(
        yield* session.refused([
          "ads",
          "boost",
          "pause",
          runningBoostId,
          ...inStudio,
        ]),
        told
      );
      assert.deepInclude(
        errorOf(
          yield* session.refused(boostArgs("create", {}, "--yes", "--json"))
        ),
        { code: "forbidden", reason: "missingScope", scope: "workspace:ads" }
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("tells peal doctor which sign-in may work with ads", () =>
    Effect.gen(function* doctor() {
      const without = yield* signedIn();

      assert.match(
        yield* without.printed(["doctor", ...inStudio]),
        /^ok\s+ads-scope\s+The sign-in was made without workspace:ads, as every sign-in is unless asked: it reads ads/mu
      );

      const session = yield* withAds;

      assert.match(
        yield* session.printed(["doctor", ...inStudio]),
        /^ok\s+ads-scope\s+The sign-in has workspace:ads and workspace:publish: it can boost posts, which spends money/mu
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("names the permission an API key lacks to spend", () =>
    Effect.gen(function* keys() {
      const session = yield* signedIn({ keys: [spendingKey], signIn: false });
      const runs = withKey(session, spendingKey);

      // It reads ads.
      assert.include(yield* runs.printed(["ads", "accounts"]), euroAccountId);

      const refused = yield* runs.refused(
        boostArgs("create", {}, "--yes").slice(0, -2)
      );

      assert.include(
        refused,
        "Peal refused: This API key does not have the permission ads:spend."
      );
      assert.deepInclude(
        errorOf(
          yield* runs.refused([
            "ads",
            "boost",
            "stop",
            runningBoostId,
            "--yes",
            "--json",
          ])
        ),
        {
          code: "forbidden",
          permission: "ads:spend",
          reason: "missingPermission",
        }
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("reads the audit trail to who decides what is spent", () =>
    Effect.gen(function* audit() {
      const session = yield* signedIn({
        keys: [ownerKey],
        withAds: true,
      });

      // No application is ever given ads:authorize, the command line
      // included: the server refuses the owner's own sign-in.
      assert.include(
        yield* session.refused(["ads", "audit", ...inStudio]),
        "no application is ever given the permission it takes (ads:authorize), this command line's sign-in included: an owner reads it in the web app"
      );

      const trail = yield* withKey(session, ownerKey).printed(["ads", "audit"]);

      assert.match(
        trail,
        new RegExp(
          `2026-11-05T09:00:00Z\\s+boostRequested\\s+by member \\S+\\s+account ${euroAccountId}\\s+boost ${runningBoostId}\\s+budget 120\\.00 EUR, committed 120\\.00 EUR`,
          "u"
        )
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
