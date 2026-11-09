import { describe, expect, it } from "@effect/vitest";

import { facetsOf } from "#publishing/infrastructure/platforms/bluesky/facets.ts";

// The links a text's facets mark, in order.
const linked = (text: string) =>
  facetsOf(text).flatMap(({ features }) =>
    features.flatMap((feature) =>
      feature.$type === "app.bsky.richtext.facet#link" ? [feature.uri] : []
    )
  );

describe("Bluesky facets", () => {
  it("marks links over their UTF-8 bytes, without the punctuation after", () => {
    expect(
      facetsOf("Café ✨ see https://example.com/a?b=1, then")
    ).toStrictEqual([
      {
        features: [
          {
            $type: "app.bsky.richtext.facet#link",
            uri: "https://example.com/a?b=1",
          },
        ],
        // "Café ✨ see " is 14 bytes: é takes 2 and ✨ 3.
        index: { byteEnd: 39, byteStart: 14 },
      },
    ]);
  });

  it("marks hashtags after a space or at the start, not numbers or fragments", () => {
    expect(
      facetsOf("#launch day! #2026 https://example.com/#top #ship.")
    ).toStrictEqual([
      {
        features: [{ $type: "app.bsky.richtext.facet#tag", tag: "launch" }],
        index: { byteEnd: 7, byteStart: 0 },
      },
      {
        features: [
          {
            $type: "app.bsky.richtext.facet#link",
            uri: "https://example.com/#top",
          },
        ],
        index: { byteEnd: 43, byteStart: 19 },
      },
      {
        features: [{ $type: "app.bsky.richtext.facet#tag", tag: "ship" }],
        index: { byteEnd: 49, byteStart: 44 },
      },
    ]);
  });

  it("keeps a link's own closing parenthesis, not one that wraps it", () => {
    expect(
      linked("Read https://en.wikipedia.org/wiki/Mastodon_(software).")
    ).toStrictEqual(["https://en.wikipedia.org/wiki/Mastodon_(software)"]);
    expect(linked("(see https://example.com/notes).")).toStrictEqual([
      "https://example.com/notes",
    ]);
    expect(
      linked("(see https://en.wikipedia.org/wiki/Mastodon_(software))")
    ).toStrictEqual(["https://en.wikipedia.org/wiki/Mastodon_(software)"]);
  });

  it("marks nothing in plain text", () => {
    expect(facetsOf("Nothing to see here.")).toStrictEqual([]);
  });
});
