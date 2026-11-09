import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { landingLocale, nextPathOf } from "#auth/next-path.ts";

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

describe(landingLocale, () => {
  it("opens the app in the language the account keeps", () => {
    expect(landingLocale("/app", "fr")).toStrictEqual(Option.some("fr"));
    expect(landingLocale("/device?user_code=ABCD", "en")).toStrictEqual(
      Option.some("en")
    );
  });

  it("keeps the language a path names, and ignores one it does not know", () => {
    expect(landingLocale("/fr/device", "en")).toStrictEqual(Option.none());
    expect(landingLocale("/fr", "en")).toStrictEqual(Option.none());
    expect(landingLocale("/app", "de")).toStrictEqual(Option.none());
    expect(landingLocale("/app", undefined)).toStrictEqual(Option.none());
  });

  it("does not take a path that starts like a language for one", () => {
    expect(landingLocale("/french-notes", "en")).toStrictEqual(
      Option.some("en")
    );
  });
});
