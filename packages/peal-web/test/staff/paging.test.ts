import { describe, expect, it } from "@effect/vitest";

import { pageCount, pagedHref, pageOf, queryOf } from "#staff/paging.ts";

describe("the console's lists", () => {
  it("read their page from the address, 1 unless told", () => {
    expect(
      ["3", undefined, "0", "two", ["2", "3"]].map((value) => pageOf(value))
    ).toStrictEqual([3, 1, 1, 1, 1]);
  });

  it("read their search from the address, if one was typed", () => {
    expect(
      ["  sam@example.test ", "   ", "x".repeat(201)].map((value) =>
        queryOf(value)
      )
    ).toStrictEqual(["sam@example.test", undefined, undefined]);
  });

  it("link to their pages", () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(51, 25)).toBe(3);
    expect(pagedHref("/admin/users", { page: 1 })).toBe("/admin/users");
    expect(pagedHref("/admin/users", { page: 2, query: "sam & co" })).toBe(
      "/admin/users?query=sam+%26+co&page=2"
    );
  });
});
