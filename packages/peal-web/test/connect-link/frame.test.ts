import { describe, expect, it } from "@effect/vitest";

import { frameOf } from "#connect-link/frame.ts";

describe(frameOf, () => {
  it("gives a workspace's pages their own frame", () => {
    expect(frameOf("/app/00000000-0000-7000-8000-0000000000a1", false)).toBe(
      "workspace"
    );
    expect(
      frameOf("/app/00000000-0000-7000-8000-0000000000a1/settings/tags", false)
    ).toBe("workspace");
  });

  it("keeps the app's frame on the person's own pages and elsewhere", () => {
    for (const path of [
      "/app",
      "/app/account",
      "/app/agenda",
      "/app/notices/preferences",
      "/app/report",
      "/sign-in",
      "/",
    ]) {
      expect(frameOf(path, false)).toBe("app");
    }
  });

  it("keeps a connect link's pages hosted", () => {
    expect(frameOf("/connect/link", false)).toBe("hosted");
    expect(frameOf("/connect/x/callback", true)).toBe("hosted");
    expect(frameOf("/connect/x/callback", false)).toBe("app");
  });
});
