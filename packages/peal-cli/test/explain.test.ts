import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { CliError } from "effect/cli";
import {
  Forbidden,
  PlanLimitReached,
  PostNotFound,
  SpendCeilingExceeded,
  TooManyRequests,
  UsageAllowanceReached,
  WebhookHeaderValuesRequired,
} from "peal-contract";

import { explain } from "#explain.ts";

const url = "http://localhost:3000";

const billingUrl =
  "https://peal.example/app/0f5b8c1e-2a3d-4e6f-8a9b-1c2d3e4f5a6b/billing";

const reasonOf = (failure: PlanLimitReached): string => {
  const explained = explain(url)(failure);

  return explained._tag === "Refused" ? explained.reason : explained._tag;
};

describe("a plan's refusal, explained", () => {
  it("says a payment method gives room on the free tier, at the rate card's price", () => {
    expect(
      reasonOf(
        new PlanLimitReached({
          allowed: 2,
          billingUrl,
          limit: "channels",
          plan: "free",
          planWithRoom: "payAsYouGo",
          used: 2,
        })
      )
    ).toBe(
      `The workspace's Free plan allows 2 channels, and it has 2. A payment method gives room: with per-account pricing, each connected account past the first 2 costs $5.00 a month, excluding tax, less from account 11 on. An owner or an admin adds one at ${billingUrl}`
    );
  });

  it("writes media storage in the units the plans are sold in", () => {
    expect(
      reasonOf(
        new PlanLimitReached({
          allowed: 500_000_000,
          billingUrl,
          limit: "mediaStorage",
          plan: "starter",
          planWithRoom: "agency",
          used: 480_000_000,
        })
      )
    ).toBe(
      `The workspace's Starter plan allows 500 MB of media stored, uploads in progress included, and it has 480 MB. The Agency plan has room: an owner or an admin orders it at ${billingUrl}`
    );
  });

  it("says how to ask for more on the largest plan", () => {
    expect(
      reasonOf(
        new PlanLimitReached({
          allowed: 100,
          billingUrl,
          limit: "channels",
          plan: "agency",
          planWithRoom: null,
          used: 100,
        })
      )
    ).toBe(
      "The workspace's Agency plan allows 100 channels, and it has 100. No plan holds more: write to the people who run this server to ask for more, or remove some."
    );
  });
});

describe("a refusal, with the request it answers", () => {
  it("ends with the request's id and the error's code, to quote when asking for help", () => {
    const explained = explain(url)(
      new PostNotFound({
        code: "post_not_found",
        requestId: "018f4e9a-7b1c-7d2e-8f3a-4b5c6d7e8f90",
      })
    );

    expect(explained[CliError.userMessage]).toBe(
      [
        "The workspace has no such post.",
        "  Request 018f4e9a-7b1c-7d2e-8f3a-4b5c6d7e8f90 (post_not_found).",
      ].join("\n")
    );
  });

  it("says nothing more when the server sent no id", () => {
    expect(explain(url)(new PostNotFound())[CliError.userMessage]).toBe(
      "The workspace has no such post."
    );
  });

  it("names what a refused sign-in or key lacks, as the server says it", () => {
    const explained = explain(url)(
      new Forbidden({
        code: "forbidden",
        message:
          "This token lacks the scope workspace:publish. Run peal login again and approve it.",
        permission: "post:schedule",
        reason: "missingScope",
        requestId: "deploy-42.attempt_3",
        scope: "workspace:publish",
      })
    );

    expect(explained[CliError.userMessage]).toBe(
      [
        "Peal refused: This token lacks the scope workspace:publish. Run peal login again and approve it.",
        "  Request deploy-42.attempt_3 (forbidden).",
      ].join("\n")
    );
  });

  it("says how long to wait once a sign-in sent too many requests", () => {
    expect(
      explain(url)(
        new TooManyRequests({
          limit: 600,
          retryAfterSeconds: 42,
          windowSeconds: 60,
        })
      )[CliError.userMessage]
    ).toBe(
      "Peal takes 600 requests every 60 seconds from one sign-in or key, and this one sent more: nothing was done. Try again in 42 seconds."
    );
  });

  it("writes a ceiling's amounts in the currency's units when it knows them", () => {
    const over = new SpendCeilingExceeded({
      ceiling: 30_000,
      committed: 28_000,
      currency: "EUR",
      requested: 5000,
    });

    expect(explain(url, 2)(over)[CliError.userMessage]).toContain(
      "the ceiling is 300.00 EUR, its boosts already commit 280.00 EUR, and this one would add 50.00 EUR"
    );
    expect(explain(url)(over)[CliError.userMessage]).toContain(
      "the ceiling is 30000, its boosts already commit 28000, and this one would add 5000. Nothing was reserved or sent. An owner raises the ceiling in the web app, or make the boost smaller; Peal never raises a ceiling on its own. Amounts are in EUR's minor units"
    );
  });

  it("sends a sign-in without the ads scope back to peal login --ads", () => {
    expect(
      explain(url)(
        new Forbidden({
          permission: "ads:spend",
          reason: "missingScope",
          scope: "workspace:publish",
        })
      )[CliError.userMessage]
    ).toContain("run peal login --ads again and approve it");
  });
});

describe("a webhook move that keeps headers, explained", () => {
  it("asks for every header again, or for none", () => {
    const explained = explain(url)(new WebhookHeaderValuesRequired());

    expect(explained._tag === "Refused" ? explained.reason : "").toContain(
      "--clear-headers"
    );
  });
});

const refusalOf = (failure: UsageAllowanceReached): string => {
  const explained = explain(url)(failure);

  return explained._tag === "Refused" ? explained.reason : explained._tag;
};

describe("a meter's refusal, explained", () => {
  const resetsAt = DateTime.makeUnsafe("2026-12-01T00:00:00Z");

  it("says a payment method lets the messages go on, at the rate card's price", () => {
    expect(
      refusalOf(
        new UsageAllowanceReached({
          allowed: 10_000,
          billingUrl,
          meter: "outboundMessages",
          reason: "paymentMethodRequired",
          resetsAt,
          used: 10_000,
        })
      )
    ).toBe(
      `The workspace's billing account used 10000 of the 10000 inbox messages sent, comment replies included it may use this month, which starts again on 2026-12-01 (UTC). A payment method lets it go on (past the allowance 10000 cost $1.00, excluding tax): an owner or an admin adds one at ${billingUrl}. Reading and publishing go on meanwhile.`
    );
  });

  it("never quotes the assistant's price before it is confirmed, nor offers a ceiling for it", () => {
    const assistant = {
      allowed: 0,
      billingUrl,
      meter: "assistantRequests" as const,
      resetsAt,
      used: 0,
    };

    expect(
      refusalOf(
        new UsageAllowanceReached({
          ...assistant,
          reason: "paymentMethodRequired",
        })
      )
    ).toContain("its price past the allowance is not set yet");
    expect(
      refusalOf(
        new UsageAllowanceReached({ ...assistant, reason: "ceilingReached" })
      )
    ).toContain("Nothing past the allowance is used until its price is set");
  });

  it("sends X's ceiling to the billing page", () => {
    expect(
      refusalOf(
        new UsageAllowanceReached({
          allowed: 0,
          billingUrl,
          meter: "xApi",
          reason: "ceilingReached",
          resetsAt,
          used: 0,
        })
      )
    ).toContain(`raises the account's monthly ceiling at ${billingUrl}`);
  });

  it("tells the cap until a first invoice is paid in words of its own", () => {
    const capped = refusalOf(
      new UsageAllowanceReached({
        allowed: 0,
        billingUrl,
        meter: "outboundMessages",
        reason: "spendCapReached",
        resetsAt,
        used: 0,
      })
    );

    expect(capped).toContain("until the account's first invoice is paid");
    expect(capped).not.toContain("monthly ceiling");
  });
});
