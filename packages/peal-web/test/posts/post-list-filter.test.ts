import { describe, expect, it } from "@effect/vitest";

import {
  filtersOf,
  isFiltering,
  noFilters,
  queryOf,
  searchOf,
  withFilter,
} from "#posts/post-list-filter.ts";

const channelId = "00000000-0000-7000-8000-00000000c001";
const tagId = "00000000-0000-7000-8000-00000000d001";

describe(filtersOf, () => {
  it("reads every filter the query string holds", () => {
    expect(
      filtersOf(
        new URLSearchParams(
          `status=finished&outcome=failed&channel=${channelId}&tag=${tagId}&sort=scheduledAsc`
        )
      )
    ).toStrictEqual({
      channelId,
      outcome: "failed",
      sort: "scheduledAsc",
      status: "finished",
      tagId,
    });
  });

  it("lists every post, newest first, from an empty query string", () => {
    expect(filtersOf(new URLSearchParams())).toStrictEqual(noFilters);
  });

  it("ignores a value it does not know, as a link written by hand may hold", () => {
    expect(
      filtersOf(new URLSearchParams("status=lost&sort=random&outcome=won"))
    ).toStrictEqual(noFilters);
  });

  it("keeps an outcome only with the finished posts", () => {
    expect(
      filtersOf(new URLSearchParams("status=scheduled&outcome=failed"))
    ).toStrictEqual({ ...noFilters, status: "scheduled" });
    expect(filtersOf(new URLSearchParams("outcome=failed"))).toStrictEqual(
      noFilters
    );
  });
});

describe(queryOf, () => {
  it("writes back what it reads, leaving defaults out", () => {
    const query = `status=finished&outcome=partiallyPublished&channel=${channelId}&tag=${tagId}&sort=createdAsc`;

    expect(queryOf(filtersOf(new URLSearchParams(query)))).toBe(query);
    expect(queryOf(noFilters)).toBe("");
  });
});

describe(searchOf, () => {
  it("asks the API for the filters, with the cursor of the page after", () => {
    expect(
      searchOf(
        {
          channelId,
          outcome: "failed",
          sort: "scheduledDesc",
          status: "finished",
          tagId,
        },
        "cursor-2"
      )
    ).toStrictEqual({
      channelId,
      cursor: "cursor-2",
      outcome: "failed",
      sort: "scheduledDesc",
      status: "finished",
      tagId,
    });
    expect(searchOf(noFilters, undefined)).toStrictEqual({
      sort: "createdDesc",
    });
  });
});

describe(isFiltering, () => {
  it("says whether a filter narrows the list, as ordering by time does", () => {
    expect(isFiltering(noFilters)).toBeFalsy();
    expect(isFiltering({ ...noFilters, sort: "createdAsc" })).toBeFalsy();
    expect(isFiltering({ ...noFilters, sort: "scheduledAsc" })).toBeTruthy();
    expect(isFiltering({ ...noFilters, tagId })).toBeTruthy();
  });
});

describe(withFilter, () => {
  it("sets one filter and keeps the others", () => {
    expect(
      withFilter({ ...noFilters, tagId }, "channel", channelId)
    ).toStrictEqual({ ...noFilters, channelId, tagId });
  });

  it("takes a filter off, and the outcome with the finished status", () => {
    expect(
      withFilter(
        { ...noFilters, outcome: "failed", status: "finished" },
        "status",
        undefined
      )
    ).toStrictEqual(noFilters);
  });

  it("refuses a value the list does not know", () => {
    expect(withFilter(noFilters, "status", "lost")).toStrictEqual(noFilters);
  });
});
