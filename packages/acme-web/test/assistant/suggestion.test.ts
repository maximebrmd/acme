import { describe, expect, it } from "@effect/vitest";

import {
  acceptedText,
  languageLabel,
  shortenablePlatforms,
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
    expect(shortenablePlatforms(["x", "pinterest", "x", "bluesky"])).toStrictEqual(
      ["x", "bluesky"]
    );
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
    ]);
    expect(shortenablePlatforms(["pinterest"])).toStrictEqual(
      shortenablePlatforms([])
    );
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
