import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import {
  decideClaim,
  defaultCeilingOf,
  includedUnits,
  meterEventIdentifier,
  meterResetsAt,
  mostUnits,
  spendGroupOf,
  spendOf,
} from "#billing/domain/meter-claims.ts";
import { meterCharge, rateCard } from "#billing/domain/rate-card.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

const holder = WorkspaceIdSchema.make("6f1c1b8e-2f5a-4c3e-9d7b-0a1b2c3d4e5f");

const messages = rateCard.meters.outboundMessages;
const requests = rateCard.meters.assistantRequests;
const images = rateCard.meters.assistantImages;

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
    expect(includedUnits("assistantImages", "legacy", true)).toBe(
      images.allowance
    );
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
      decideClaim({
        ceiling: Option.none(),
        counts: [{ meter: "outboundMessages", used: at - 1 }],
        freeTier: true,
        meter: "outboundMessages",
        standing: "free",
        units: 1,
      })
    ).toStrictEqual(Result.succeed({ used: at }));

    expect(
      decideClaim({
        ceiling: Option.none(),
        counts: [{ meter: "outboundMessages", used: at }],
        freeTier: true,
        meter: "outboundMessages",
        standing: "free",
        units: 1,
      })
    ).toStrictEqual(
      Result.fail({ allowed: at, reason: "paymentMethodRequired", used: at })
    );
  });

  it("refuses the assistant at 0 without a payment method", () => {
    expect(
      decideClaim({
        ceiling: Option.some(0),
        counts: [],
        freeTier: true,
        meter: "assistantRequests",
        standing: "free",
        units: 1,
      })
    ).toStrictEqual(
      Result.fail({ allowed: 0, reason: "paymentMethodRequired", used: 0 })
    );
  });

  it("passes a meter without a ceiling past its allowance when paying", () => {
    expect(
      decideClaim({
        ceiling: Option.none(),
        counts: [{ meter: "outboundMessages", used: messages.allowance }],
        freeTier: true,
        meter: "outboundMessages",
        standing: "payAsYouGo",
        units: 1,
      })
    ).toStrictEqual(Result.succeed({ used: messages.allowance + 1 }));
  });

  it("stops the assistant at its ceiling, counting both of its meters", () => {
    // A ceiling that pays for one image past the allowance, and nothing
    // more.
    const ceiling = meterCharge("assistantImages", 1);

    const imagesUsed = [
      { meter: "assistantImages" as const, used: images.allowance + 1 },
    ];

    expect(spendOf(imagesUsed)).toBe(ceiling);

    expect(
      decideClaim({
        ceiling: Option.some(defaultCeilingOf("assistant")),
        counts: [{ meter: "assistantRequests", used: requests.allowance }],
        freeTier: true,
        meter: "assistantRequests",
        standing: "payAsYouGo",
        units: 1,
      })
    ).toStrictEqual(
      Result.fail({
        allowed: requests.allowance,
        reason: "ceilingReached",
        used: requests.allowance,
      })
    );

    // The image spent the whole ceiling: a request past the allowance
    // finds none left, whatever it costs.
    expect(
      Result.isFailure(
        decideClaim({
          ceiling: Option.some(ceiling),
          counts: [
            ...imagesUsed,
            { meter: "assistantRequests", used: requests.allowance },
          ],
          freeTier: true,
          meter: "assistantRequests",
          standing: "payAsYouGo",
          units: 1,
        })
      )
    ).toBeTruthy();

    // Raised by a request's price, it passes once.
    expect(
      decideClaim({
        ceiling: Option.some(ceiling + meterCharge("assistantRequests", 1)),
        counts: [
          ...imagesUsed,
          { meter: "assistantRequests", used: requests.allowance },
        ],
        freeTier: true,
        meter: "assistantRequests",
        standing: "payAsYouGo",
        units: 1,
      })
    ).toStrictEqual(Result.succeed({ used: requests.allowance + 1 }));
  });

  it("refuses a ceiling lowered below what was spent", () => {
    expect(
      mostUnits("assistantRequests", {
        ceiling: Option.some(0),
        counts: [{ meter: "assistantRequests", used: requests.allowance + 3 }],
        freeTier: true,
        standing: "payAsYouGo",
      })
    ).toStrictEqual(Option.some(requests.allowance));
  });

  it("gives a legacy plan its allowance and nothing past it", () => {
    expect(
      decideClaim({
        ceiling: Option.none(),
        counts: [{ meter: "outboundMessages", used: messages.allowance }],
        freeTier: true,
        meter: "outboundMessages",
        standing: "legacy",
        units: 1,
      })
    ).toStrictEqual(
      Result.fail({
        allowed: messages.allowance,
        reason: "ceilingReached",
        used: messages.allowance,
      })
    );
  });
});
