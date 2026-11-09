import { describe, expect, it } from "@effect/vitest";
import { Cause, DateTime, Exit, Option } from "effect";
import { WorkspaceSubscribed } from "peal-contract";

import {
  apiErrorKey,
  settingsErrorKey,
  subscriptionToCancel,
} from "#settings/errors.ts";

describe(settingsErrorKey, () => {
  it.each([
    ["YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER", "lastOwner"],
    ["YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER", "lastOwner"],
    ["USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION", "alreadyInvited"],
    ["YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE", "forbidden"],
    ["IMPERSONATION_READ_ONLY", "impersonating"],
    ["INVALID_PASSWORD", "incorrectPassword"],
    ["SOMETHING_ELSE", "unknown"],
  ])("explains %s as %s", (code, key) => {
    expect(settingsErrorKey({ code, status: 400 })).toBe(key);
  });

  it("explains a plan with no room for one more member", () => {
    expect(
      settingsErrorKey({ code: "MEMBER_LIMIT_REACHED", status: 402 })
    ).toBe("memberLimit");
  });

  it("asks to wait when Better Auth limits the rate", () => {
    expect(settingsErrorKey({ status: 429 })).toBe("tooManyRequests");
  });
});

describe(apiErrorKey, () => {
  it("is none for a call that worked", () => {
    expect(apiErrorKey(Exit.succeed("done"))).toStrictEqual(Option.none());
  });

  it.each([
    ["WorkspaceNameMismatch", "nameMismatch"],
    ["WorkspaceBusy", "busy"],
    ["WorkspaceSubscribed", "subscribed"],
    ["BillingUnavailable", "billingUnavailable"],
    ["LastOwner", "lastOwner"],
    ["IncorrectPassword", "incorrectPassword"],
    ["TooManyPasswordAttempts", "tooManyRequests"],
    ["Forbidden", "forbidden"],
    ["Unauthenticated", "unknown"],
  ])("explains %s as %s", (tag, key) => {
    expect(apiErrorKey(Exit.fail({ _tag: tag }))).toStrictEqual(
      Option.some(key)
    );
  });

  it("calls anything but the API's errors unknown", () => {
    expect(apiErrorKey(Exit.failCause(Cause.die("offline")))).toStrictEqual(
      Option.some("unknown")
    );
  });
});

describe(subscriptionToCancel, () => {
  const paidUntil = DateTime.makeUnsafe("2026-12-09T10:00:00Z");

  it("tells what a deletion would cancel, for the person to agree to", () => {
    expect(
      subscriptionToCancel(
        Exit.fail(
          new WorkspaceSubscribed({
            paidUntil,
            plan: "pro",
            workspaceId: "6b1c8d0e-9f7a-4eb5-8a21-7c8d9eafb0c1",
          })
        )
      )
    ).toStrictEqual(
      Option.some({
        paidUntil: Option.some(paidUntil),
        plan: Option.some("pro"),
        workspaceId: "6b1c8d0e-9f7a-4eb5-8a21-7c8d9eafb0c1",
      })
    );
  });

  it("is none for any other ending", () => {
    expect(subscriptionToCancel(Exit.succeed("done"))).toStrictEqual(
      Option.none()
    );
    expect(
      subscriptionToCancel(Exit.fail({ _tag: "WorkspaceBusy" }))
    ).toStrictEqual(Option.none());
  });
});
