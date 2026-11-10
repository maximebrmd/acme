import { describe, expect, it } from "@effect/vitest";
import { CliError } from "effect/cli";
import { Forbidden, PlanLimitReached, PostNotFound } from "peal-contract";

import { explain } from "#explain.ts";

const url = "http://localhost:3000";

const billingUrl =
  "https://peal.example/app/0f5b8c1e-2a3d-4e6f-8a9b-1c2d3e4f5a6b/billing";

const reasonOf = (failure: PlanLimitReached): string => {
  const explained = explain(url)(failure);

  return explained._tag === "Refused" ? explained.reason : explained._tag;
};

describe("a plan's refusal, explained", () => {
  it("names the plan, what the workspace holds, the plan with room and the billing page", () => {
    expect(
      reasonOf(
        new PlanLimitReached({
          allowed: 2,
          billingUrl,
          limit: "members",
          plan: "free",
          planWithRoom: "starter",
          used: 2,
        })
      )
    ).toBe(
      `The workspace's Free plan allows 2 members, pending invitations included, and it has 2. The Starter plan has room: an owner or an admin orders it at ${billingUrl}`
    );
  });

  it("writes media storage in the units the plans are sold in", () => {
    expect(
      reasonOf(
        new PlanLimitReached({
          allowed: 500_000_000,
          billingUrl,
          limit: "mediaStorage",
          plan: "free",
          planWithRoom: "starter",
          used: 480_000_000,
        })
      )
    ).toBe(
      `The workspace's Free plan allows 500 MB of media stored, uploads in progress included, and it has 480 MB. The Starter plan has room: an owner or an admin orders it at ${billingUrl}`
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
      "The workspace's Agency plan allows 100 channels, and it has 100. No plan is larger: write to the people who run this server to ask for more, or remove some."
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
});
