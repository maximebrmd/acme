import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { Audience } from "#ads/domain/audience.ts";
import {
  activated,
  Boost,
  committedWhenStopped,
  countsAgainstCeiling,
  ended,
  failed,
  noObjects,
  paused,
  planBoost,
  stopped,
  unconfirmed,
} from "#ads/domain/boost.ts";
import type { BoostRequest } from "#ads/domain/boost.ts";
import { AdAccountIdSchema, BoostIdSchema } from "#ads/domain/ids.ts";
import { CurrencySchema } from "#ads/domain/money.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

const utc = TimeZoneIdSchema.make("Etc/UTC");
const eur = CurrencySchema.make("EUR");
const now = DateTime.makeUnsafe("2026-11-10T12:00:00Z");
const at = (iso: string) => DateTime.makeUnsafe(iso);
const account = { currency: eur, timeZone: utc };

const abroad = new Audience({ ageMax: 65, ageMin: 18, countries: ["US"] });
const home = new Audience({ ageMax: 40, ageMin: 25, countries: ["FR", "US"] });

const request = (changes: Partial<BoostRequest> = {}): BoostRequest => ({
  audience: abroad,
  beneficiary: Option.none(),
  budget: { _tag: "total", amount: 5000 },
  currency: eur,
  endsAt: at("2026-11-17T12:00:00Z"),
  payer: Option.none(),
  specialAdCategory: "none",
  startsAt: Option.none(),
  ...changes,
});

const violationsOf = (asked: BoostRequest) =>
  Result.match(planBoost(asked, account, now), {
    onFailure: ({ violations }) => [...violations],
    onSuccess: () => [],
  });

describe(planBoost, () => {
  it("plans a run from now to its end, committing a total budget whole", () => {
    expect(Result.getOrThrow(planBoost(request(), account, now))).toStrictEqual(
      {
        committed: 5000,
        days: 8,
        endsAt: at("2026-11-17T12:00:00Z"),
        startsAt: now,
      }
    );
  });

  it("starts now a run asked to start in the past", () => {
    const plan = Result.getOrThrow(
      planBoost(
        request({ startsAt: Option.some(at("2026-11-01T00:00:00Z")) }),
        account,
        now
      )
    );

    expect(plan.startsAt).toStrictEqual(now);
  });

  it("refuses a budget in another currency than the account's", () => {
    expect(
      violationsOf(request({ currency: CurrencySchema.make("USD") }))
    ).toStrictEqual(["currencyMismatch"]);
  });

  it("refuses an empty budget", () => {
    expect(
      violationsOf(request({ budget: { _tag: "daily", amount: 0 } }))
    ).toStrictEqual(["budgetEmpty"]);
  });

  it("refuses a run that ends before it starts, or has ended", () => {
    expect(
      violationsOf(request({ endsAt: at("2026-11-09T12:00:00Z") }))
    ).toStrictEqual(["endsBeforeStart"]);
    expect(
      violationsOf(
        request({
          endsAt: at("2026-11-12T00:00:00Z"),
          startsAt: Option.some(at("2026-11-13T00:00:00Z")),
        })
      )
    ).toStrictEqual(["endsBeforeStart"]);
  });

  it("refuses a run shorter than a day", () => {
    expect(
      violationsOf(request({ endsAt: at("2026-11-11T11:59:00Z") }))
    ).toStrictEqual(["runTooShort"]);
    expect(
      violationsOf(request({ endsAt: at("2026-11-11T12:00:00Z") }))
    ).toStrictEqual([]);
  });

  it("asks a daily budget for a run longer than a day", () => {
    expect(
      violationsOf(
        request({
          budget: { _tag: "daily", amount: 500 },
          endsAt: at("2026-11-11T12:00:00Z"),
        })
      )
    ).toStrictEqual(["runTooShort"]);
  });

  it("refuses a run longer than 90 days, or starting more than 30 days ahead", () => {
    expect(
      violationsOf(request({ endsAt: at("2027-02-09T12:00:01Z") }))
    ).toStrictEqual(["runTooLong"]);
    expect(
      violationsOf(
        request({
          endsAt: at("2026-12-20T12:00:00Z"),
          startsAt: Option.some(at("2026-12-10T12:00:01Z")),
        })
      )
    ).toStrictEqual(["startsTooFarAhead"]);
  });

  it("refuses ages the wrong way round", () => {
    expect(
      violationsOf(
        request({
          audience: new Audience({ ageMax: 20, ageMin: 30, countries: ["US"] }),
        })
      )
    ).toStrictEqual(["ageRange"]);
  });

  it("refuses every special ad category", () => {
    for (const category of [
      "housing",
      "employment",
      "financialProductsServices",
      "issuesElectionsPolitics",
    ] as const) {
      expect(
        violationsOf(request({ specialAdCategory: category }))
      ).toStrictEqual(["specialCategory"]);
    }
  });

  it("asks who benefits and who pays for an audience in the European Union", () => {
    expect(violationsOf(request({ audience: home }))).toStrictEqual([
      "beneficiaryRequired",
    ]);
    expect(
      violationsOf(
        request({ audience: home, beneficiary: Option.some("Example Studio") })
      )
    ).toStrictEqual(["beneficiaryRequired"]);
    expect(
      violationsOf(
        request({
          audience: home,
          beneficiary: Option.some("Example Studio"),
          payer: Option.some("Example Studio"),
        })
      )
    ).toStrictEqual([]);
  });

  it("lists every violation at once", () => {
    expect(
      violationsOf(
        request({
          budget: { _tag: "total", amount: 0 },
          currency: CurrencySchema.make("USD"),
          specialAdCategory: "housing",
        })
      )
    ).toStrictEqual(["currencyMismatch", "budgetEmpty", "specialCategory"]);
  });
});

const boost = (changes: Partial<Boost> = {}) =>
  new Boost({
    activatedAt: Option.none(),
    adAccountId: AdAccountIdSchema.make("00000000-0000-7000-8000-00000000000a"),
    audience: abroad,
    beneficiary: Option.none(),
    budget: { _tag: "total", amount: 5000 },
    channelId: ChannelIdSchema.make("00000000-0000-7000-8000-00000000000c"),
    committed: 5000,
    createdAt: now,
    currency: eur,
    endsAt: at("2026-11-17T12:00:00Z"),
    id: BoostIdSchema.make("00000000-0000-7000-8000-00000000000b"),
    idempotencyKey: "synthetic-key",
    objective: "engagement",
    objects: noObjects,
    payer: Option.none(),
    platform: "facebook",
    postId: PostIdSchema.make("00000000-0000-7000-8000-00000000000d"),
    requestedBy: Option.none(),
    startsAt: now,
    state: { _tag: "requested" },
    targetId: PostTargetIdSchema.make("00000000-0000-7000-8000-00000000000e"),
    updatedAt: now,
    workspaceId: WorkspaceIdSchema.make("5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"),
    ...changes,
  });

const later = at("2026-11-12T08:00:00Z");

describe("a boost's life", () => {
  it("runs once the network confirms, and remembers when it first ran", () => {
    const running = Result.getOrThrow(activated(boost(), now));

    expect(running.state).toStrictEqual({ _tag: "active", since: now });
    expect(running.activatedAt).toStrictEqual(Option.some(now));

    const again = Result.getOrThrow(
      activated(Result.getOrThrow(paused(running, later)), later)
    );

    expect(again.activatedAt).toStrictEqual(Option.some(now));
  });

  it("fails only before it ran, and then commits nothing", () => {
    const refused = Result.getOrThrow(
      failed(boost(), "budgetTooLow", Option.some("1885272"), now)
    );

    expect(refused.committed).toBe(0);
    expect(countsAgainstCeiling(refused.state)).toBeFalsy();

    const running = Result.getOrThrow(activated(boost(), now));

    expect(
      Result.isFailure(failed(running, "refused", Option.none(), later))
    ).toBeTruthy();
  });

  it("keeps counting a boost whose start could not be read back", () => {
    const unknown = Result.getOrThrow(unconfirmed(boost(), now));

    expect(unknown.committed).toBe(5000);
    expect(countsAgainstCeiling(unknown.state)).toBeTruthy();
    expect(unknown.activatedAt).toStrictEqual(Option.some(now));
  });

  it("pauses a boost that runs or may run, twice as once", () => {
    const running = Result.getOrThrow(activated(boost(), now));
    const once = Result.getOrThrow(paused(running, later));

    expect(once.state).toStrictEqual({ _tag: "paused", since: later });
    expect(Result.getOrThrow(paused(once, at("2026-11-13T00:00:00Z")))).toBe(
      once
    );
    expect(
      Result.getOrThrow(
        paused(Result.getOrThrow(unconfirmed(boost(), now)), later)
      ).state._tag
    ).toBe("paused");
    expect(Result.isFailure(paused(boost(), later))).toBeTruthy();
  });

  it("stops from any state but failed or ended, twice as once", () => {
    for (const from of [
      boost(),
      Result.getOrThrow(activated(boost(), now)),
      Result.getOrThrow(unconfirmed(boost(), now)),
      Result.getOrThrow(
        paused(Result.getOrThrow(activated(boost(), now)), now)
      ),
    ]) {
      const over = Result.getOrThrow(stopped(from, later, utc));

      expect(over.state).toStrictEqual({ _tag: "stopped", at: later });
      expect(Result.getOrThrow(stopped(over, later, utc))).toBe(over);
    }

    expect(
      Result.isFailure(
        stopped(
          Result.getOrThrow(failed(boost(), "refused", Option.none(), now)),
          later,
          utc
        )
      )
    ).toBeTruthy();
  });

  it("ends only once its end date passed", () => {
    const running = Result.getOrThrow(activated(boost(), now));

    expect(Result.isFailure(ended(running, later))).toBeTruthy();
    expect(
      Result.getOrThrow(ended(running, at("2026-11-17T12:00:00Z"))).state._tag
    ).toBe("ended");
    expect(
      Result.isFailure(ended(boost(), at("2026-11-18T00:00:00Z")))
    ).toBeTruthy();
  });
});

describe(committedWhenStopped, () => {
  it("commits nothing for a boost that never ran", () => {
    expect(committedWhenStopped(boost(), later, utc)).toBe(0);
  });

  it("keeps a total budget whole, as the network may have spent it all", () => {
    const running = Result.getOrThrow(activated(boost(), now));

    expect(committedWhenStopped(running, later, utc)).toBe(5000);
  });

  it("counts the days a daily budget ran, with the network's share", () => {
    const daily = Result.getOrThrow(
      activated(
        boost({ budget: { _tag: "daily", amount: 1000 }, committed: 10_000 }),
        now
      )
    );

    // The 10th, 11th and 12th: three days at 12.50 at most.
    expect(committedWhenStopped(daily, later, utc)).toBe(3750);
    // Never more than it committed at first.
    expect(committedWhenStopped(daily, at("2026-12-25T00:00:00Z"), utc)).toBe(
      10_000
    );
  });
});
