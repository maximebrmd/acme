import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { outgoingText } from "#engagement/domain/reply-text.ts";

// The web app's reply box shows the same text (its `#inbox/reply-text.ts`,
// with the same cases in its test): change both together.

const from = (handle: string) =>
  Option.some({ displayName: Option.none(), handle, platformId: "7001" });

const toBob = (text: string) => outgoingText("mastodon", from("bob"), text);

describe(outgoingText, () => {
  it("puts the mention of the person answered first on Mastodon, once", () => {
    expect(toBob("  Thank you!  ")).toBe("@bob Thank you!");
    expect(toBob("Thank you @BOB!")).toBe("Thank you @BOB!");
    expect(outgoingText("bluesky", from("bob"), " Thank you! ")).toBe(
      "Thank you!"
    );
    expect(outgoingText("mastodon", Option.none(), "Thank you!")).toBe(
      "Thank you!"
    );
  });

  it("takes only a whole mention for one: another handle that starts alike is someone else", () => {
    expect(toBob("cc @bobby")).toBe("@bob cc @bobby");
    expect(toBob("cc @bob@other.example")).toBe("@bob cc @bob@other.example");
    expect(toBob("cc @bob.smith")).toBe("@bob cc @bob.smith");
    expect(toBob("write to x@bob")).toBe("@bob write to x@bob");
  });

  it("finds a whole mention after one that only starts alike, and before punctuation", () => {
    expect(toBob("@bobby and @bob, thanks.")).toBe("@bobby and @bob, thanks.");
    expect(toBob("Thanks @bob.")).toBe("Thanks @bob.");
    expect(toBob("(@Bob)")).toBe("(@Bob)");
  });
});
