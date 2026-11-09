import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { nextPathOf } from "#auth/next-path.ts";

describe(nextPathOf, () => {
  it.each(["/app", "/device?user_code=WDJB-MJHT", "/fr/oauth/workspace"])(
    "keeps %s, a path on this site",
    (path) => {
      expect(nextPathOf(path)).toStrictEqual(Option.some(path));
    }
  );

  it.each([
    "https://elsewhere.example/app",
    "//elsewhere.example/app",
    "/\\elsewhere.example",
    "app",
    "/ app",
    "",
  ])("refuses %s", (path) => {
    expect(nextPathOf(path)).toStrictEqual(Option.none());
  });

  it("refuses a repeated parameter", () => {
    expect(nextPathOf(["/app", "/device"])).toStrictEqual(Option.none());
    expect(nextPathOf(undefined)).toStrictEqual(Option.none());
  });
});
