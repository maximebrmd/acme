import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { unverifiedThreshold } from "#billing/domain/account-days.ts";
import {
  decideClaim,
  defaultCeilingOf,
  includedUnits,
  meterEventIdentifier,
  meterMonthsOf,
  meterResetsAt,
  meterStandingOf,
  mostUnits,
  spendGroupOf,
  spendOf,
} from "#billing/domain/meter-claims.ts";
import type { ClaimAsked } from "#billing/domain/meter-claims.ts";
import {
  meterCharge,
  rateCard,
  unconfirmedMeters,
} from "#billing/domain/rate-card.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

const holder = WorkspaceIdSchema.make("6f1c1b8e-2f5a-4c3e-9d7b-0a1b2c3d4e5f");

const messages = rateCard.meters.outboundMessages;
const requests = rateCard.meters.assistantRequests;
const x = rateCard.meters.xApi;

// A claim of one unit, on per-account pricing, with no ceiling and no cap
// unless the test says.
const asked = (changes: Partial<ClaimAsked>): ClaimAsked => ({
  ceiling: Option.none(),
  counts: [],
  freeTier: true,
  meter: "outboundMessages",
  spendCap: Option.none(),
  standing: "payAsYouGo",
  units: 1,
  unpaidBefore: 0,
  ...changes,
});

// Per-account pricing's subscription, in `status`.
const entitled = (status: "active" | "past_due") => ({
  plan: Option.some("payAsYouGo" as const),
  status: Option.some(status),
});

describe("meter claims", () => {
  it("groups the assistant's two meters under one ceiling, and X under its own", () => {
    expect(spendGroupOf("assistantRequests")).toStrictEqual(
      Option.some("assistant")
    );
    expect(spendGroupOf("assistantImages")).toStrictEqual(
      Option.some("assistant")
    );
    expect(spendGroupOf("xApi")).toStrictEqual(Option.some("x"));
    expect(spendGroupOf("outboundMessages")).toStrictEqual(Option.none());
    expect(spendGroupOf("managedAds")).toStrictEqual(Option.none());
  });

  it("stops the assistant at what is included by default, and X at the rate card's ceiling", () => {
    expect(defaultCeilingOf("assistant")).toBe(requests.ceiling);
    expect(defaultCeilingOf("x")).toBe(rateCard.x.defaultCeiling);
  });

  it("includes the allowance without a payment method, none once staff required one, and the full one when paying", () => {
    expect(includedUnits("outboundMessages", "free", true)).toBe(
      messages.allowanceWithout
    );
    expect(includedUnits("outboundMessages", "free", false)).toBe(0);
    expect(includedUnits("assistantRequests", "free", true)).toBe(0);
    expect(includedUnits("assistantRequests", "payAsYouGo", true)).toBe(
      requests.allowance
    );
    expect(includedUnits("outboundMessages", "pastDue", true)).toBe(
      messages.allowance
    );
  });

  it("reads a past due per-account subscription apart from one that pays", () => {
    expect(meterStandingOf(entitled("active"))).toBe("payAsYouGo");
    expect(meterStandingOf(entitled("past_due"))).toBe("pastDue");
    expect(
      meterStandingOf({
        plan: Option.some("pro"),
        status: Option.some("active"),
      })
    ).toBe("legacy");
    expect(
      meterStandingOf({ plan: Option.some("free"), status: Option.none() })
    ).toBe("free");
  });

  it("resets on the first of next month, and names each event of a month once", () => {
    const month = DateTime.makeUnsafe("2026-12-01T00:00:00Z");

    expect(DateTime.formatIso(meterResetsAt(month))).toBe(
      "2027-01-01T00:00:00.000Z"
    );
    expect(meterEventIdentifier("outboundMessages", holder, month, 3)).toBe(
      `outboundMessages:${holder}:2026-12:3`
    );
  });

  it("refuses the unit past the allowance without a payment method", () => {
    const at = messages.allowanceWithout;

    expect(
      decideClaim(
        asked({
          counts: [{ meter: "outboundMessages", used: at - 1 }],
          standing: "free",
        })
      )
    ).toStrictEqual(Result.succeed({ used: at }));

    expect(
      decideClaim(
        asked({
          counts: [{ meter: "outboundMessages", used: at }],
          standing: "free",
        })
      )
    ).toStrictEqual(
      Result.fail({ allowed: at, reason: "paymentMethodRequired", used: at })
    );
  });

  it("refuses the assistant at 0 without a payment method", () => {
    expect(
      decideClaim(
        asked({
          ceiling: Option.some(0),
          meter: "assistantRequests",
          standing: "free",
        })
      )
    ).toStrictEqual(
      Result.fail({ allowed: 0, reason: "paymentMethodRequired", used: 0 })
    );
  });

  it("passes a meter without a ceiling past its allowance when paying", () => {
    expect(
      decideClaim(
        asked({
          counts: [{ meter: "outboundMessages", used: messages.allowance }],
        })
      )
    ).toStrictEqual(Result.succeed({ used: messages.allowance + 1 }));
  });

  it("bills nothing past the allowance of a meter whose price is not confirmed, whatever the ceiling", () => {
    expect(unconfirmedMeters).toContain("assistantRequests");

    expect(
      decideClaim(
        asked({
          ceiling: Option.some(5000),
          counts: [{ meter: "assistantRequests", used: requests.allowance }],
          meter: "assistantRequests",
        })
      )
    ).toStrictEqual(
      Result.fail({
        allowed: requests.allowance,
        reason: "ceilingReached",
        used: requests.allowance,
      })
    );
  });

  it("stops X at its ceiling, and passes once the ceiling is raised", () => {
    // X includes nothing: each unit is billed.
    expect(
      decideClaim(asked({ ceiling: Option.some(0), meter: "xApi", units: 10 }))
    ).toStrictEqual(
      Result.fail({ allowed: x.allowance, reason: "ceilingReached", used: 0 })
    );

    expect(
      decideClaim(
        asked({
          ceiling: Option.some(meterCharge("xApi", 10)),
          meter: "xApi",
          units: 10,
        })
      )
    ).toStrictEqual(Result.succeed({ used: 10 }));
  });

  it("counts only the meter's own group against its ceiling", () => {
    const counts = [
      { meter: "outboundMessages" as const, used: messages.allowance * 7 },
      {
        meter: "managedAds" as const,
        used: rateCard.meters.managedAds.allowance + 400,
      },
      { meter: "xApi" as const, used: 0 },
    ];

    const terms = {
      ceiling: Option.some(meterCharge("xApi", 100)),
      freeTier: true,
      spendCap: Option.none(),
      standing: "payAsYouGo" as const,
      unpaidBefore: 0,
    };

    const alone = mostUnits("xApi", {
      ...terms,
      counts: [{ meter: "xApi", used: 0 }],
    });

    expect(alone).toStrictEqual(Option.some(100));
    expect(mostUnits("xApi", { ...terms, counts })).toStrictEqual(alone);
  });

  it("caps every meter's spend at the threshold until a first invoice is paid", () => {
    // The messages billed this month leave one cent of the cap.
    const cap = Option.some(unverifiedThreshold);
    const billed = (unverifiedThreshold - 1) * 100;

    const counts = [
      { meter: "outboundMessages" as const, used: messages.allowance + billed },
    ];

    expect(spendOf(counts)).toBe(unverifiedThreshold - 1);

    const ofX = (units: number) =>
      decideClaim(
        asked({
          ceiling: Option.some(1_000_000),
          counts,
          meter: "xApi",
          spendCap: cap,
          units,
        })
      );

    expect(Result.isSuccess(ofX(10))).toBeTruthy();
    expect(Result.isFailure(ofX(20))).toBeTruthy();

    // The cap, not a ceiling, refused it: in words of its own.
    expect(ofX(20)).toStrictEqual(
      Result.fail({ allowed: 10, reason: "spendCapReached", used: 0 })
    );

    // Messages, which have no ceiling, stop there too, for the same reason.
    expect(
      decideClaim(asked({ counts, spendCap: cap, units: 200 }))
    ).toStrictEqual(
      Result.fail({
        allowed: messages.allowance + billed + 100,
        reason: "spendCapReached",
        used: messages.allowance + billed,
      })
    );
  });

  it("says the ceiling refused when it is lower than the cap", () => {
    expect(
      decideClaim(
        asked({
          ceiling: Option.some(1),
          meter: "xApi",
          spendCap: Option.some(unverifiedThreshold),
          units: 20,
        })
      )
    ).toStrictEqual(
      Result.fail({ allowed: 10, reason: "ceilingReached", used: 0 })
    );
  });

  it("caps what is billed and unpaid since the subscription began, not each month alone", () => {
    // Earlier months billed all but one cent of the cap, still unpaid.
    const ofX = (units: number) =>
      decideClaim(
        asked({
          ceiling: Option.some(1_000_000),
          meter: "xApi",
          spendCap: Option.some(unverifiedThreshold),
          units,
          unpaidBefore: unverifiedThreshold - 1,
        })
      );

    expect(Result.isSuccess(ofX(10))).toBeTruthy();
    expect(ofX(20)).toStrictEqual(
      Result.fail({ allowed: 10, reason: "spendCapReached", used: 0 })
    );

    // Once an invoice is paid there is no cap, and the months before
    // count for nothing.
    expect(
      Result.isSuccess(
        decideClaim(
          asked({
            ceiling: Option.some(1_000_000),
            meter: "xApi",
            units: 20,
            unpaidBefore: unverifiedThreshold,
          })
        )
      )
    ).toBeTruthy();
  });

  it("grants a past due account its allowance and nothing past it", () => {
    expect(
      decideClaim(
        asked({
          ceiling: Option.some(1_000_000),
          meter: "xApi",
          standing: "pastDue",
        })
      )
    ).toStrictEqual(
      Result.fail({ allowed: 0, reason: "paymentFailed", used: 0 })
    );
    expect(
      decideClaim(
        asked({
          counts: [{ meter: "outboundMessages", used: messages.allowance }],
          standing: "pastDue",
        })
      )
    ).toStrictEqual(
      Result.fail({
        allowed: messages.allowance,
        reason: "paymentFailed",
        used: messages.allowance,
      })
    );
  });

  it("refuses a ceiling lowered below what was spent", () => {
    expect(
      mostUnits("xApi", {
        ceiling: Option.some(0),
        counts: [{ meter: "xApi", used: 30 }],
        freeTier: true,
        spendCap: Option.none(),
        standing: "payAsYouGo",
        unpaidBefore: 0,
      })
    ).toStrictEqual(Option.some(x.allowance));
  });

  it("gives a legacy plan its allowance and nothing past it, in words of its own", () => {
    expect(
      decideClaim(
        asked({
          counts: [{ meter: "outboundMessages", used: messages.allowance }],
          standing: "legacy",
        })
      )
    ).toStrictEqual(
      Result.fail({
        allowed: messages.allowance,
        reason: "planAllowance",
        used: messages.allowance,
      })
    );
  });

  it("tells the page the same most as the claim", () => {
    const counts = [
      { meter: "outboundMessages" as const, used: messages.allowance * 8 },
      { meter: "xApi" as const, used: 5 },
    ];

    const [xMonth] = meterMonthsOf({
      ceilings: new Map([["x" as const, meterCharge("xApi", 50)]]),
      counts,
      freeTier: true,
      meters: ["xApi"],
      month: DateTime.makeUnsafe("2026-11-01T00:00:00Z"),
      spendCap: Option.some(unverifiedThreshold),
      standing: "payAsYouGo",
      unpaidBefore: unverifiedThreshold - 3,
    });

    expect(xMonth?.most).toStrictEqual(
      mostUnits("xApi", {
        ceiling: Option.some(meterCharge("xApi", 50)),
        counts,
        freeTier: true,
        spendCap: Option.some(unverifiedThreshold),
        standing: "payAsYouGo",
        unpaidBefore: unverifiedThreshold - 3,
      })
    );
  });
});
