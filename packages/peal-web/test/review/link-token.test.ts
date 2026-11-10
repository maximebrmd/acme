import { describe, expect, it } from "@effect/vitest";

import { tokenOfFragment } from "#review/link-token.ts";

describe("a review link's token", () => {
  it("is what follows the # in its address", () => {
    expect(tokenOfFragment("#VSohJ3yZiv7FXmf-TgIfJpiYQJ_P")).toBe(
      "VSohJ3yZiv7FXmf-TgIfJpiYQJ_P"
    );
    expect(tokenOfFragment("#a%2Db")).toBe("a-b");
    expect(tokenOfFragment("")).toBe("");
  });

  it("is taken as it is when the address was cut short or mangled", () => {
    // A stray % is no address component: it opens nothing, and breaks
    // nothing.
    expect(tokenOfFragment("#VSohJ3%")).toBe("VSohJ3%");
    expect(tokenOfFragment("#%E0%A4%A")).toBe("%E0%A4%A");
  });
});
