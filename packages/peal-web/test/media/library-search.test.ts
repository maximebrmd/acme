import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";
import { maxMediaQueryLength } from "peal-contract";

import {
  isNarrowed,
  pageKeyOf,
  pageOfKey,
  queryOf,
} from "#media/library-search.ts";

describe(queryOf, () => {
  it("asks for the whole library when nothing narrows it", () => {
    expect(queryOf({ kind: null, text: "   " }, Option.none())).toStrictEqual(
      {}
    );
  });

  it("asks for the text trimmed, the kind and the cursor", () => {
    expect(
      queryOf({ kind: "video", text: "  launch day " }, Option.some("c1"))
    ).toStrictEqual({ cursor: "c1", kind: "video", q: "launch day" });
  });

  it("cuts a text longer than the API takes, never inside a character", () => {
    const query = queryOf(
      { kind: null, text: "👍".repeat(maxMediaQueryLength + 5) },
      Option.none()
    );

    expect(query.q?.length).toBe(maxMediaQueryLength);
    expect(query.q?.isWellFormed()).toBeTruthy();
  });
});

describe(isNarrowed, () => {
  it("says whether a text or a kind narrows the library", () => {
    expect(isNarrowed({ kind: null, text: " " })).toBeFalsy();
    expect(isNarrowed({ kind: "image", text: "" })).toBeTruthy();
    expect(isNarrowed({ kind: null, text: "a" })).toBeTruthy();
  });
});

describe(pageKeyOf, () => {
  it("names each page of each search apart, whatever the text holds", () => {
    const search = { kind: "document", text: 'a/"b"\\c' } as const;
    const key = pageKeyOf("w1", search, Option.some("c1"));

    expect(pageOfKey(key)).toStrictEqual({
      cursor: Option.some("c1"),
      search,
      workspaceId: "w1",
    });
    expect(key).not.toBe(pageKeyOf("w1", search, Option.none()));
    expect(key).not.toBe(
      pageKeyOf("w1", { ...search, kind: "image" }, Option.some("c1"))
    );
  });
});
