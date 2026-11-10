import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import { maxTagsPerPost } from "peal-contract";
import type { Tag } from "peal-contract";

import {
  hasRoomForTag,
  tagDetailsOf,
  tagsOf,
  withTag,
} from "#tags/post-tags.ts";

const tag = (id: string): Tag => ({
  colour: "blue",
  createdAt: DateTime.makeUnsafe("2026-11-01T09:00:00Z"),
  id,
  name: `Tag ${id}`,
});

const tags = ["a", "b", "c"].map(tag);

describe(tagsOf, () => {
  it("names the post's tags, in the workspace's order", () => {
    expect(tagsOf(["c", "a"], tags).map(({ id }) => id)).toStrictEqual([
      "a",
      "c",
    ]);
  });

  it("names nothing for a tag deleted since", () => {
    expect(tagsOf(["gone"], tags)).toStrictEqual([]);
  });
});

describe(withTag, () => {
  it("adds a tag, keeping the workspace's order", () => {
    expect(withTag(["c"], tags, "a", true)).toStrictEqual(["a", "c"]);
  });

  it("takes a tag off", () => {
    expect(withTag(["a", "c"], tags, "a", false)).toStrictEqual(["c"]);
  });

  it("leaves out a tag the workspace no longer has", () => {
    expect(withTag(["gone", "b"], tags, "c", true)).toStrictEqual(["b", "c"]);
  });

  it("adds nothing to a post that has as many tags as it may", () => {
    const many = Array.from({ length: maxTagsPerPost + 1 }, (_, index) =>
      tag(`t${index}`)
    );

    const full = many.slice(0, maxTagsPerPost).map(({ id }) => id);

    expect(hasRoomForTag(full)).toBeFalsy();
    expect(withTag(full, many, `t${maxTagsPerPost}`, true)).toStrictEqual(full);
    expect(withTag(full, many, "t0", false)).toHaveLength(maxTagsPerPost - 1);
  });
});

describe(tagDetailsOf, () => {
  it("saves a name without the spaces around it", () => {
    expect(tagDetailsOf({ colour: "teal", name: "  Launch  " })).toStrictEqual(
      Option.some({ colour: "teal", name: "Launch" })
    );
  });

  it.each([
    ["no name", ""],
    ["spaces alone", "   "],
    ["a name too long", "x".repeat(41)],
    ["a name on two lines", "Launch\nweek"],
  ])("saves nothing with %s", (_, name) => {
    expect(tagDetailsOf({ colour: "gray", name })).toStrictEqual(Option.none());
  });
});
