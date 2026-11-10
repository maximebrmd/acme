import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import {
  checkBoost,
  emptyBoostDraft,
  parseCountries,
  targetsEu,
} from "#ads/boost-draft.ts";
import type { BoostContext, BoostDraft } from "#ads/boost-draft.ts";

import { euroAccount, yenAccount } from "./fixtures.ts";

const context: BoostContext = {
  account: euroAccount,
  channelId: "00000000-0000-7000-8000-0000000000d1",
  postId: "00000000-0000-7000-8000-000000000001",
  today: { day: 10, month: 11, year: 2026 },
};

const ready: BoostDraft = {
  ...emptyBoostDraft,
  accountId: euroAccount.id,
  amount: "50",
  countries: "US, CA",
  declared: true,
  endDate: "2026-11-17",
};

const iso = (instant: DateTime.Utc | undefined) =>
  instant === undefined ? undefined : DateTime.formatIso(instant);

const problemsOf = (fields: Partial<BoostDraft>) =>
  checkBoost({ ...ready, ...fields }, context).problems;

describe(parseCountries, () => {
  it("reads codes of two capital letters, between commas or spaces", () => {
    expect(parseCountries("FR, DE ES")).toStrictEqual(
      Option.some(["FR", "DE", "ES"])
    );
    expect(parseCountries(" us ")).toStrictEqual(Option.none());
    expect(parseCountries("FRA")).toStrictEqual(Option.none());
    expect(parseCountries("")).toStrictEqual(Option.none());
    expect(parseCountries("FR, FR")).toStrictEqual(Option.none());
  });

  it("takes 25 countries at most", () => {
    const codes = Array.from(
      { length: 26 },
      (_, index) => `A${String.fromCodePoint(65 + index)}`
    );

    expect(
      Option.isSome(parseCountries(codes.slice(0, 25).join(",")))
    ).toBeTruthy();
    expect(parseCountries(codes.join(","))).toStrictEqual(Option.none());
  });
});

describe(targetsEu, () => {
  it("knows the member states of the European Union", () => {
    expect(targetsEu("US, FR")).toBeTruthy();
    expect(targetsEu("HR")).toBeTruthy();
    expect(targetsEu("US, GB, CH, NO")).toBeFalsy();
    expect(targetsEu("")).toBeFalsy();
  });
});

describe(checkBoost, () => {
  it("makes a total budget in minor units, to the end of the last day of the account's calendar", () => {
    const { boost, problems } = checkBoost(ready, context);
    const made = Option.getOrUndefined(boost);

    expect(problems).toStrictEqual([]);
    expect(made?.budget).toStrictEqual({ amount: 5000, kind: "total" });
    expect(made?.currency).toBe("EUR");
    // 23:59 in Paris, an hour ahead of UTC in November.
    expect(iso(made?.endsAt)).toBe("2026-11-17T22:59:00.000Z");
    expect(made?.specialAdCategory).toBe("none");
  });

  it("starts now unless a later first day is given", () => {
    const now = Option.getOrUndefined(checkBoost(ready, context).boost);

    const today = Option.getOrUndefined(
      checkBoost({ ...ready, startDate: "2026-11-10" }, context).boost
    );

    const later = Option.getOrUndefined(
      checkBoost({ ...ready, startDate: "2026-11-12" }, context).boost
    );

    expect(now).toBeDefined();
    expect(now).not.toHaveProperty("startsAt");
    expect(today).not.toHaveProperty("startsAt");
    expect(iso(later?.startsAt)).toBe("2026-11-11T23:00:00.000Z");
  });

  it("makes a daily budget in a currency without a minor unit", () => {
    const { boost } = checkBoost(
      { ...ready, accountId: yenAccount.id, amount: "5000", kind: "daily" },
      { ...context, account: yenAccount }
    );

    const made = Option.getOrUndefined(boost);

    expect(made?.budget).toStrictEqual({ amount: 5000, kind: "daily" });
    expect(made?.currency).toBe("JPY");
    expect(iso(made?.endsAt)).toBe("2026-11-17T14:59:00.000Z");
  });

  it("sends nothing without the declaration", () => {
    const { boost, problems } = checkBoost(
      { ...ready, declared: false },
      context
    );

    expect(problems).toStrictEqual(["declaration"]);
    expect(boost).toStrictEqual(Option.none());
  });

  it("asks who benefits and who pays once a country is in the European Union", () => {
    const inEu = { ...ready, countries: "US, FR" };

    const named = Option.getOrUndefined(
      checkBoost(
        { ...inEu, beneficiary: " Synthetic Bakery ", payer: "Synthetic SARL" },
        context
      ).boost
    );

    expect(checkBoost(inEu, context).problems).toStrictEqual([
      "beneficiary",
      "payer",
    ]);
    expect(named?.beneficiary).toBe("Synthetic Bakery");
    expect(named?.payer).toBe("Synthetic SARL");
    expect(
      Option.getOrUndefined(checkBoost(ready, context).boost)
    ).not.toHaveProperty("beneficiary");
  });

  it("names every field at fault", () => {
    const { boost, problems } = checkBoost(
      {
        ...emptyBoostDraft,
        accountId: euroAccount.id,
        ageMax: "17",
        amount: "0",
        startDate: "2026-11-09",
      },
      context
    );

    expect(problems).toStrictEqual([
      "amount",
      "start",
      "end",
      "countries",
      "ages",
      "declaration",
    ]);
    expect(boost).toStrictEqual(Option.none());
  });

  it("refuses a run that ends on its first day, or before", () => {
    const sameDay = { ...ready, endDate: "2026-11-10" };
    const before = { ...ready, endDate: "2026-11-11", startDate: "2026-11-12" };

    expect(checkBoost(sameDay, context).problems).toStrictEqual([
      "endBeforeStart",
    ]);
    expect(checkBoost(before, context).problems).toStrictEqual([
      "endBeforeStart",
    ]);
  });

  it("refuses ages out of range or out of order, and garbage amounts", () => {
    expect(problemsOf({ ageMax: "66" })).toStrictEqual(["ages"]);
    expect(problemsOf({ ageMax: "30", ageMin: "40" })).toStrictEqual(["ages"]);
    expect(problemsOf({ ageMin: "18.5" })).toStrictEqual(["ages"]);
    expect(problemsOf({ amount: "50.123" })).toStrictEqual(["amount"]);
    expect(problemsOf({ amount: "fifty" })).toStrictEqual(["amount"]);
  });

  it("asks for an ad account first", () => {
    expect(
      checkBoost(ready, { ...context, account: undefined }).problems
    ).toStrictEqual(["account"]);
  });
});
