import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { planRefusalText } from "#app/mcp/refusals.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

const billingUrl =
  "https://peal.example/app/0f5b8c1e-2a3d-4e6f-8a9b-1c2d3e4f5a6b/billing";

const full = new PlanLimitReached({
  allowed: 2,
  limit: "members",
  needed: 3,
  used: 2,
});

describe(planRefusalText, () => {
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
      "The workspace's Agency plan allows 2 members, pending invitations included, and it has 2. No plan is larger: the user writes to the people who run this server to ask for more, or removes some."
    );
  });
});
