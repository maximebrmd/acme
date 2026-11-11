import { describe, expect, it } from "@effect/vitest";

import { authErrorKey } from "#auth/errors.ts";

describe(authErrorKey, () => {
  it("explains the errors Better Auth reports by code", () => {
    expect(
      authErrorKey({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })
    ).toBe("INVALID_EMAIL_OR_PASSWORD");
  });

  it.each(["MEMBER_LIMIT_REACHED", "MISSING_RESPONSE", "VERIFICATION_FAILED"])(
    "explains %s, from billing and the captcha",
    (code) => {
      expect(authErrorKey({ code, status: 400 })).toBe(code);
    }
  );

  it("tells an account locked by two-step verification from rate limiting", () => {
    expect(
      authErrorKey({ code: "ACCOUNT_TEMPORARILY_LOCKED", status: 429 })
    ).toBe("ACCOUNT_TEMPORARILY_LOCKED");
  });

  it.each([
    "INVALID_CODE",
    "INVALID_BACKUP_CODE",
    "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE",
    "INVALID_TWO_FACTOR_COOKIE",
    "TOTP_ALREADY_ENABLED",
    "EMAIL_NOT_VERIFIED_FOR_TWO_STEP",
    "TWO_STEP_REQUIRED_BY_WORKSPACE",
    "TWO_STEP_REQUIRED",
  ])("explains %s, from two-step verification", (code) => {
    expect(authErrorKey({ code, status: 400 })).toBe(code);
  });

  it("explains rate limiting by its status", () => {
    expect(authErrorKey({ status: 429 })).toBe("TOO_MANY_REQUESTS");
  });

  it("reads any other failure as unknown", () => {
    expect(authErrorKey({ code: "SOMETHING_NEW", status: 400 })).toBe(
      "UNKNOWN"
    );
    expect(authErrorKey({ status: 500 })).toBe("UNKNOWN");
  });
});
