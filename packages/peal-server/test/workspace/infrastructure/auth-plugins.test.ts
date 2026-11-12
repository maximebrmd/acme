import { describe, expect, it } from "@effect/vitest";

import { authWithoutDatabase } from "#test/workspace/support.ts";

describe("the auth plugins", () => {
  // Better Auth runs plugins' after hooks in the order of its plugins. On a
  // sign-in during an OAuth authorization, two-step verification's hook
  // deletes the session the password made, and answers with the second
  // step; the OAuth server's resumes the authorization with the session it
  // finds. Two-step verification's must run first, so that it finds none.
  it("run two-step verification's hooks before the OAuth server's", async () => {
    const { options } = await authWithoutDatabase().$context;
    const ids = (options.plugins ?? []).map(({ id }) => id);

    expect(ids).toContain("two-factor");
    expect(ids).toContain("oauth-provider");
    expect(ids).toContain("device-authorization");
    expect(ids.indexOf("two-factor")).toBeLessThan(
      ids.indexOf("oauth-provider")
    );
    expect(ids.indexOf("two-factor")).toBeLessThan(
      ids.indexOf("device-authorization")
    );
  });
});
