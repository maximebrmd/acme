import { describe, expect, it } from "@effect/vitest";
import { DateTime, Exit, Option } from "effect";
import {
  AssistantQuotaExceeded,
  Forbidden,
  PlanLimitReached,
} from "peal-contract";

import type { AuthClientError } from "#auth/errors.ts";
import { limitIn, limitOfAuthError } from "#billing/upgrade.ts";

const billingUrl = "https://peal.example/app/w/billing";

const quota = (plan: "free" | null) =>
  new AssistantQuotaExceeded({
    billingUrl: plan === null ? null : billingUrl,
    dailyLimit: 3,
    plan,
    planWithRoom: plan === null ? null : "starter",
    resetsAt: DateTime.makeUnsafe("2026-11-11T00:00:00Z"),
  });

describe(limitIn, () => {
  it("finds a plan's refusal in what a request ended with", () => {
    expect(
      limitIn(
        Exit.fail(
          new PlanLimitReached({
            allowed: 3,
            billingUrl,
            limit: "channels",
            plan: "free",
            planWithRoom: "starter",
            used: 3,
          })
        )
      )
    ).toStrictEqual(
      Option.some({
        allowed: 3,
        limit: "channels",
        plan: "free",
        planWithRoom: "starter",
        used: 3,
      })
    );
  });

  it("finds the assistant's daily allowance, on a server that bills only", () => {
    expect(limitIn(Exit.fail(quota("free")))).toStrictEqual(
      Option.some({
        allowed: 3,
        limit: "assistantRequests",
        plan: "free",
        planWithRoom: "starter",
        used: 3,
      })
    );
    expect(limitIn(Exit.fail(quota(null)))).toStrictEqual(Option.none());
  });

  it("finds none in a success or another failure", () => {
    expect(limitIn(Exit.succeed("done"))).toStrictEqual(Option.none());
    expect(limitIn(Exit.fail(new Forbidden()))).toStrictEqual(Option.none());
  });
});

// An error as the sign-in service's client hands it over: its body's
// fields beside the code and the status.
const answered = (
  error: AuthClientError & Readonly<Record<string, number | string | null>>
): AuthClientError => error;

describe(limitOfAuthError, () => {
  it("reads the members' limit the sign-in service answers", () => {
    expect(
      limitOfAuthError(
        answered({
          allowed: 2,
          billingUrl,
          code: "MEMBER_LIMIT_REACHED",
          limit: "members",
          plan: "free",
          planWithRoom: "starter",
          status: 402,
          used: 2,
        })
      )
    ).toStrictEqual(
      Option.some({
        allowed: 2,
        limit: "members",
        plan: "free",
        planWithRoom: "starter",
        used: 2,
      })
    );
  });

  it("reads no limit in a refusal of a second free workspace, which servers no longer send", () => {
    expect(
      limitOfAuthError(
        answered({
          billingUrl,
          code: "FREE_WORKSPACE_LIMIT_REACHED",
          plan: "pro",
          planWithRoom: "pro",
          status: 402,
          workspaceId: "w",
        })
      )
    ).toStrictEqual(Option.none());
  });

  it("reads nothing in another error", () => {
    expect(
      limitOfAuthError(answered({ code: "INVALID_EMAIL", status: 400 }))
    ).toStrictEqual(Option.none());
  });
});
