import { describe, expect, it } from "@effect/vitest";

import { authErrorKey } from "#auth/errors.ts";

describe(authErrorKey, () => {
  it("explains the errors Better Auth reports by code", () => {
    expect(
      authErrorKey({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })
    ).toBe("INVALID_EMAIL_OR_PASSWORD");
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
