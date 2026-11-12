import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import type { Media, MediaAttachment } from "peal-contract";
import { maxMediaPerPost } from "peal-contract/post-text";

import {
  attach,
  describe as describeAttachment,
  detach,
  lacksAltText,
  move,
  roomLeft,
} from "#posts/attachments.ts";

const created = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

/** Ready synthetic media, with the library's description if given. */
const media = (id: string, altText: string | null = null): Media => ({
  aiGenerated: false,
  altText,
  byteSize: 200_000,
  codec: null,
  contentType: "image/jpeg",
  createdAt: created,
  dimensions: { height: 800, width: 1200 },
  durationMs: null,
  id,
  kind: "image",
  pageCount: null,
  status: { _tag: "ready" },
  updatedAt: created,
  url: null,
});

const attached = (...ids: readonly string[]): readonly MediaAttachment[] =>
  ids.map((mediaId) => ({ altText: `Alt ${mediaId}`, mediaId }));

const ids = (attachments: readonly MediaAttachment[]) =>
  attachments.map(({ mediaId }) => mediaId);

describe(attach, () => {
  it("adds media at the end, in order, with the library's description", () => {
    expect(
      attach(attached("a"), [media("b", "A chart"), media("c")])
    ).toStrictEqual([
      { altText: "Alt a", mediaId: "a" },
      { altText: "A chart", mediaId: "b" },
      { altText: "", mediaId: "c" },
    ]);
  });

  it("leaves media attached already where it is, and adds each once", () => {
    expect(
      ids(attach(attached("a", "b"), [media("b"), media("c"), media("c")]))
    ).toStrictEqual(["a", "b", "c"]);
  });

  it("stops at the most a post shows", () => {
    const full = Array.from({ length: maxMediaPerPost - 1 }, (_, index) =>
      String(index)
    );

    const added = attach(attached(...full), [media("x"), media("y")]);

    expect(added).toHaveLength(maxMediaPerPost);
    expect(added.at(-1)?.mediaId).toBe("x");
    expect(roomLeft(added)).toBe(0);
    expect(attach(added, [media("z")])).toStrictEqual(added);
  });
});

describe(roomLeft, () => {
  it("counts down from the most a post shows", () => {
    expect(roomLeft([])).toBe(maxMediaPerPost);
    expect(roomLeft(attached("a", "b"))).toBe(maxMediaPerPost - 2);
  });
});

describe(move, () => {
  const list = attached("a", "b", "c");

  it("moves media earlier or later", () => {
    expect(ids(move(list, "c", -1))).toStrictEqual(["a", "c", "b"]);
    expect(ids(move(list, "a", 1))).toStrictEqual(["b", "a", "c"]);
    expect(ids(move(list, "a", 2))).toStrictEqual(["b", "c", "a"]);
  });

  it("never goes past either end", () => {
    expect(ids(move(list, "a", -1))).toStrictEqual(["a", "b", "c"]);
    expect(ids(move(list, "c", 5))).toStrictEqual(["a", "b", "c"]);
  });

  it("keeps each attachment's alt text, and ignores unknown media", () => {
    expect(move(list, "b", 1)).toStrictEqual([
      { altText: "Alt a", mediaId: "a" },
      { altText: "Alt c", mediaId: "c" },
      { altText: "Alt b", mediaId: "b" },
    ]);
    expect(move(list, "z", 1)).toStrictEqual(list);
  });

  it("leaves the list it is given alone", () => {
    move(list, "a", 1);

    expect(ids(list)).toStrictEqual(["a", "b", "c"]);
  });
});

describe(detach, () => {
  it("removes the media, keeping the others in order", () => {
    expect(ids(detach(attached("a", "b", "c"), "b"))).toStrictEqual(["a", "c"]);
    expect(ids(detach(attached("a"), "z"))).toStrictEqual(["a"]);
  });
});

describe(describeAttachment, () => {
  it("changes the alt text of one attachment only", () => {
    expect(describeAttachment(attached("a", "b"), "b", "A map")).toStrictEqual([
      { altText: "Alt a", mediaId: "a" },
      { altText: "A map", mediaId: "b" },
    ]);
  });
});

describe(lacksAltText, () => {
  it("counts blank alt text as none", () => {
    expect(lacksAltText({ altText: " \n ", mediaId: "a" })).toBeTruthy();
    expect(lacksAltText({ altText: "", mediaId: "a" })).toBeTruthy();
    expect(lacksAltText({ altText: "A map", mediaId: "a" })).toBeFalsy();
  });
});
