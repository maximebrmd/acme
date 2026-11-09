import { describe, expect, it } from "@effect/vitest";
import { Cause, Exit, Option } from "effect";

import { apiErrorKey, settingsErrorKey } from "#settings/errors.ts";

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
