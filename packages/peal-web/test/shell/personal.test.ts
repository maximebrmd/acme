import { describe, expect, it } from "@effect/vitest";

import { personalPageAt } from "#shell/personal.ts";

describe(personalPageAt, () => {
  it("names the person's pages, the notices' preferences under the notices", () => {
    expect(personalPageAt("/app")).toBe("overview");
    expect(personalPageAt("/app/agenda")).toBe("agenda");
    expect(personalPageAt("/app/report")).toBe("report");
    expect(personalPageAt("/app/notices/preferences")).toBe("notices");
    expect(personalPageAt("/app/account")).toBe("account");
  });

  it("names no page elsewhere, a workspace's pages included", () => {
    expect(
      personalPageAt("/app/0190a1b2-0000-7000-8000-000000000001")
    ).toBeNull();
    expect(personalPageAt("/app/accounts")).toBeNull();
  });
});
