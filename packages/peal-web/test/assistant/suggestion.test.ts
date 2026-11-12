import { describe, expect, it } from "@effect/vitest";

import {
  acceptedText,
  languageLabel,
  shortenablePlatforms,
  writeAction,
  writablePlatforms,
} from "#assistant/suggestion.ts";

describe(acceptedText, () => {
  it("replaces the text with a suggested one", () => {
    expect(
      acceptedText("we shipped it", { _tag: "text", text: "We shipped it." })
    ).toBe("We shipped it.");
  });

  it("adds hashtags on a line of their own", () => {
    expect(
      acceptedText("Our spring sale.\n", {
        _tag: "hashtags",
        hashtags: ["#spring", "#sale"],
      })
    ).toBe("Our spring sale.\n\n#spring #sale");
  });

  it("gives the hashtags alone to an empty text", () => {
    expect(
      acceptedText("  ", { _tag: "hashtags", hashtags: ["#spring"] })
    ).toBe("#spring");
  });
});

describe(shortenablePlatforms, () => {
  it("offers the platforms of the post's channels that have a limit", () => {
    expect(
      shortenablePlatforms(["x", "pinterest", "x", "bluesky"])
    ).toStrictEqual(["x", "bluesky", "pinterest"]);
  });

  it("offers every platform with a limit while no channel is picked", () => {
    expect(shortenablePlatforms([])).toStrictEqual([
      "x",
      "linkedin",
      "bluesky",
      "mastodon",
      "threads",
      "instagram",
      "facebook",
      "tiktok",
      "youtube",
      "pinterest",
      "googleBusiness",
    ]);
  });
});

describe(languageLabel, () => {
  it("names a language as a menu item starts", () => {
    const french = new Intl.DisplayNames(["fr"], { type: "language" });
    const english = new Intl.DisplayNames(["en"], { type: "language" });

    expect(languageLabel(french, "fr", "de")).toBe("Allemand");
    expect(languageLabel(english, "en", "zh-Hans")).toBe("Simplified Chinese");
  });
});

describe(writablePlatforms, () => {
  it("offers the post's platforms whose text limit is short", () => {
    expect(
      writablePlatforms(["linkedin", "threads", "x", "pinterest", "x"])
    ).toStrictEqual(["x", "threads"]);
  });

  it("offers none for a post without such a platform", () => {
    expect(writablePlatforms([])).toStrictEqual([]);
    expect(writablePlatforms(["linkedin", "youtube"])).toStrictEqual([]);
  });
});

describe(writeAction, () => {
  it("names only what the person chose", () => {
    expect(writeAction({ platform: null, tone: null })).toStrictEqual({
      _tag: "write",
    });
    expect(writeAction({ platform: "x", tone: "witty" })).toStrictEqual({
      _tag: "write",
      platform: "x",
      tone: "witty",
    });
  });
});
