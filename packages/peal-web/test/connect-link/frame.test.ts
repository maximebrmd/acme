import { describe, expect, it } from "@effect/vitest";

import { frameOf } from "#connect-link/frame.ts";

describe(frameOf, () => {
  it("leaves the signed-in app's pages to their own frame", () => {
    for (const path of [
      "/app",
      "/app/account",
      "/app/notices/preferences",
      "/app/00000000-0000-7000-8000-0000000000a1",
      "/app/00000000-0000-7000-8000-0000000000a1/settings/tags",
    ]) {
      expect(frameOf(path, false)).toBe("own");
    }
  });

  it("keeps the app's frame elsewhere", () => {
    for (const path of ["/sign-in", "/", "/apps", "/cancel"]) {
      expect(frameOf(path, false)).toBe("app");
    }
  });

  it("keeps a connect link's pages hosted", () => {
    expect(frameOf("/connect/link", false)).toBe("hosted");
    expect(frameOf("/connect/x/callback", true)).toBe("hosted");
    expect(frameOf("/connect/x/callback", false)).toBe("app");
  });
});
