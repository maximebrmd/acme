import { describe, expect, it } from "@effect/vitest";

import {
  addPart,
  delayChoices,
  followUpsOf,
  movePart,
  partsOf,
  partsTaken,
  partTextOn,
  removePart,
  roomForParts,
  updatePart,
  withPartOverride,
} from "#posts/parts.ts";
import type { PartDraft } from "#posts/parts.ts";

const mastodon = "0190f3a0-0000-7000-8000-00000000c001";
const bluesky = "0190f3a0-0000-7000-8000-00000000c002";

const part = (key: string, text: string, more: Partial<PartDraft> = {}) => ({
  delaySeconds: 0,
  key,
  media: [],
  overrides: [],
  text,
  ...more,
});

const order = (list: readonly PartDraft[]) => list.map(({ key }) => key);

describe("a part's text on a channel", () => {
  const own = part("a", "For everyone", {
    overrides: [{ channelId: bluesky, text: "For Bluesky alone" }],
  });

  it("is the channel's own when the part has one, as the server sends it", () => {
    expect(partTextOn(own, bluesky)).toBe("For Bluesky alone");
    expect(partTextOn(own, mastodon)).toBe("For everyone");
  });

  it("changes with the channel's own text, and goes back to the text for all once it is dropped", () => {
    const changed = withPartOverride(own.overrides, bluesky, "Rewritten");

    expect(changed).toStrictEqual([{ channelId: bluesky, text: "Rewritten" }]);
    expect(partTextOn({ ...own, overrides: changed }, bluesky)).toBe(
      "Rewritten"
    );

    const dropped = withPartOverride(own.overrides, bluesky, null);

    expect(dropped).toStrictEqual([]);
    expect(partTextOn({ ...own, overrides: dropped }, bluesky)).toBe(
      "For everyone"
    );
  });

  it("gives a channel no text of its own it did not have", () => {
    expect(withPartOverride(own.overrides, mastodon, "New")).toStrictEqual(
      own.overrides
    );
  });
});

describe("the parts that follow a post, as the composer edits them", () => {
  it("start from the post's, each with a key of its own", () => {
    const parts = partsOf({
      followUps: [
        { delaySeconds: 60, media: [], overrides: [], text: "Second" },
        { delaySeconds: 0, media: [], overrides: [], text: "Third" },
      ],
      media: [],
      overrides: [],
      text: "First",
    });

    expect(
      parts.map(({ delaySeconds, text }) => [text, delaySeconds])
    ).toStrictEqual([
      ["Second", 60],
      ["Third", 0],
    ]);
    expect(new Set(parts.map(({ key }) => key)).size).toBe(2);
    expect(partsOf(undefined)).toStrictEqual([]);
    expect(partsOf({ media: [], overrides: [], text: "Alone" })).toStrictEqual(
      []
    );
  });

  it("add an empty part at the end, while there is room", () => {
    const added = addPart([part("a", "Second")], "b");

    expect(added).toStrictEqual([part("a", "Second"), part("b", "")]);

    const full = Array.from({ length: 24 }, (_, index) =>
      part(String(index), "More")
    );

    expect(roomForParts(full)).toBe(0);
    expect(addPart(full, "z")).toBe(full);
  });

  it("remove a part, and move one earlier or later, never past an end", () => {
    const parts = [part("a", "A"), part("b", "B"), part("c", "C")];

    expect(order(removePart(parts, "b"))).toStrictEqual(["a", "c"]);
    expect(order(movePart(parts, "c", -1))).toStrictEqual(["a", "c", "b"]);
    expect(order(movePart(parts, "a", 1))).toStrictEqual(["b", "a", "c"]);
    expect(order(movePart(parts, "a", -1))).toStrictEqual(["a", "b", "c"]);
    expect(order(movePart(parts, "c", 1))).toStrictEqual(["a", "b", "c"]);
  });

  it("change one part and leave the others as they are", () => {
    const parts = [part("a", "A"), part("b", "B")];
    const changed = updatePart(parts, "b", { delaySeconds: 300, text: "B!" });

    expect(changed[0]).toBe(parts[0]);
    expect(changed[1]).toStrictEqual(part("b", "B!", { delaySeconds: 300 }));
  });

  it("become the content's parts, with texts only for the post's channels", () => {
    const parts = [
      part("a", "Second", {
        overrides: [
          { channelId: mastodon, text: "Second, here" },
          { channelId: bluesky, text: "Second, there" },
        ],
      }),
    ];

    expect(followUpsOf(parts, [mastodon])).toStrictEqual([
      {
        delaySeconds: 0,
        media: [],
        overrides: [{ channelId: mastodon, text: "Second, here" }],
        text: "Second",
      },
    ]);
  });

  it("say which platforms take them, and how many", () => {
    expect(partsTaken("mastodon", 3)).toStrictEqual({
      _tag: "taken",
      kind: "thread",
    });
    expect(partsTaken("youtube", 1)).toStrictEqual({ _tag: "alone" });
    expect(partsTaken("youtube", 0)).toStrictEqual({
      _tag: "taken",
      kind: "none",
    });
    expect(partsTaken("x", 25)).toStrictEqual({ _tag: "tooMany", maximum: 24 });
  });

  it("offer waits from none to a day, and keep one a post already has", () => {
    expect(delayChoices(0)).toStrictEqual([
      0, 60, 300, 900, 1800, 3600, 7200, 21_600, 43_200, 86_400,
    ]);
    expect(delayChoices(45)).toContain(45);
    expect(delayChoices(45).indexOf(45)).toBe(1);
  });
});
