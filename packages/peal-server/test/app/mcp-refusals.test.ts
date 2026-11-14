import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import { planRefusalText, usageRefusalText } from "#app/mcp/refusals.ts";
import { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

const billingUrl =
  "https://peal.example/app/0f5b8c1e-2a3d-4e6f-8a9b-1c2d3e4f5a6b/billing";

const full = new PlanLimitReached({
  allowed: 2,
  limit: "members",
  needed: 3,
  used: 2,
});

const accounts = new PlanLimitReached({
  allowed: 2,
  limit: "channels",
  needed: 3,
  used: 2,
});

describe(planRefusalText, () => {
  it("says a payment method gives room on the free tier, at the rate card's price", () => {
    expect(
      planRefusalText(accounts, {
        billingUrl,
        plan: Option.some("free"),
        planWithRoom: Option.some("payAsYouGo"),
      })
    ).toBe(
      `The workspace's Free plan allows 2 channels, and it has 2. A payment method gives room: with per-account pricing, each connected account past the first 2 costs $5.00 a month, excluding tax, less from account 11 on. An owner or an admin of the workspace adds one on its billing page, ${billingUrl}`
    );
  });

  it("names the plan, what the workspace holds, the plan with room and the billing page", () => {
    expect(
      planRefusalText(full, {
        billingUrl,
        plan: Option.some("free"),
        planWithRoom: Option.some("starter"),
      })
    ).toBe(
      `The workspace's Free plan allows 2 members, pending invitations included, and it has 2. The Starter plan has room: an owner or an admin of the workspace orders it on its billing page, ${billingUrl}`
    );
  });

  it("says how to ask for more on the largest plan", () => {
    expect(
      planRefusalText(full, {
        billingUrl,
        plan: Option.some("agency"),
        planWithRoom: Option.none(),
      })
    ).toBe(
      "The workspace's Agency plan allows 2 members, pending invitations included, and it has 2. No plan holds more: the user writes to the people who run this server to ask for more, or removes some."
    );
  });
});

describe(usageRefusalText, () => {
  const resetsAt = DateTime.makeUnsafe("2026-12-01T00:00:00Z");

  it("says a payment method lets the messages go on, at the rate card's price", () => {
    expect(
      usageRefusalText(
        new AllowanceReached({
          allowed: 10_000,
          meter: "outboundMessages",
          reason: "paymentMethodRequired",
          resetsAt,
          used: 10_000,
        }),
        billingUrl
      )
    ).toBe(
      `The workspace's billing account used 10000 of the 10000 inbox messages sent, comment replies included it may use this month, which starts again on 2026-12-01 (UTC). A payment method lets it go on (past the allowance 10000 cost $1.00, excluding tax): an owner or an admin of the workspace adds one on its billing page, ${billingUrl}. Reading and publishing go on meanwhile.`
    );
  });

  it("never quotes the assistant's unconfirmed price, sends a ceiling to the billing page, and a legacy plan to per-account pricing", () => {
    const reached = {
      allowed: 0,
      meter: "assistantImages" as const,
      resetsAt,
      used: 0,
    };

    expect(
      usageRefusalText(
        new AllowanceReached({ ...reached, reason: "paymentMethodRequired" }),
        billingUrl
      )
    ).toContain("its price past the allowance is not set yet");
    expect(
      usageRefusalText(
        new AllowanceReached({ ...reached, reason: "ceilingReached" }),
        billingUrl
      )
    ).toContain("Nothing past the allowance is used until its price is set");
    expect(
      usageRefusalText(
        new AllowanceReached({
          ...reached,
          meter: "xApi",
          reason: "ceilingReached",
        }),
        billingUrl
      )
    ).toContain(
      `raises the account's monthly ceiling on its billing page, ${billingUrl}`
    );
    expect(
      usageRefusalText(
        new AllowanceReached({ ...reached, reason: "planAllowance" }),
        billingUrl
      )
    ).not.toContain("ceiling");
  });

  it("tells the cap until a first invoice is paid in words of its own", () => {
    const capped = usageRefusalText(
      new AllowanceReached({
        allowed: 0,
        meter: "outboundMessages",
        reason: "spendCapReached",
        resetsAt,
        used: 0,
      }),
      billingUrl
    );

    expect(capped).toContain("until the account's first invoice is paid");
    expect(capped).not.toContain("raises the account's monthly ceiling");
  });
});
