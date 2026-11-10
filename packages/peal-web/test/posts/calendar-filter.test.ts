import { describe, expect, it } from "@effect/vitest";

import {
  filtered,
  isFiltering,
  knownFilter,
  matchesFilter,
  noFilter,
  withChoice,
} from "#posts/calendar-filter.ts";

const post = (tagIds: readonly string[], channelIds: readonly string[]) => ({
  tagIds,
  targets: channelIds.map((channelId) => ({ channelId })),
});

const launch = post(["campaign"], ["mastodon", "bluesky"]);
const news = post(["news", "weekly"], ["mastodon"]);
const untagged = post([], ["linkedin"]);

describe(matchesFilter, () => {
  it("shows every post while nothing is chosen", () => {
    expect(
      [launch, news, untagged].every((item) => matchesFilter(noFilter, item))
    ).toBeTruthy();
  });

  it("shows a post that has one of the chosen tags", () => {
    const filter = { channelIds: [], tagIds: ["campaign", "weekly"] };

    expect(matchesFilter(filter, launch)).toBeTruthy();
    expect(matchesFilter(filter, news)).toBeTruthy();
    expect(matchesFilter(filter, untagged)).toBeFalsy();
  });

  it("shows a post that goes to one of the chosen channels", () => {
    const filter = { channelIds: ["bluesky", "linkedin"], tagIds: [] };

    expect(matchesFilter(filter, launch)).toBeTruthy();
    expect(matchesFilter(filter, news)).toBeFalsy();
    expect(matchesFilter(filter, untagged)).toBeTruthy();
  });

  it("asks for both a chosen tag and a chosen channel when both are chosen", () => {
    const filter = { channelIds: ["mastodon"], tagIds: ["campaign"] };

    expect(matchesFilter(filter, launch)).toBeTruthy();
    expect(matchesFilter(filter, news)).toBeFalsy();
    expect(matchesFilter(filter, untagged)).toBeFalsy();
  });
});

describe(filtered, () => {
  it("counts what the filter hides, and keeps the order of what shows", () => {
    const items = [launch, news, untagged].map((item) => ({ post: item }));

    expect(
      filtered({ channelIds: ["mastodon"], tagIds: [] }, items)
    ).toStrictEqual({ hidden: 1, shown: [{ post: launch }, { post: news }] });
  });

  it("hides nothing without a filter", () => {
    const items = [{ post: untagged }];

    expect(filtered(noFilter, items)).toStrictEqual({
      hidden: 0,
      shown: items,
    });
  });
});

describe(isFiltering, () => {
  it("is true once a tag or a channel is chosen", () => {
    expect(isFiltering(noFilter)).toBeFalsy();
    expect(isFiltering({ channelIds: [], tagIds: ["news"] })).toBeTruthy();
    expect(isFiltering({ channelIds: ["mastodon"], tagIds: [] })).toBeTruthy();
  });
});

describe(withChoice, () => {
  it("adds an id once, and takes it off", () => {
    expect(withChoice(["a"], "b", true)).toStrictEqual(["a", "b"]);
    expect(withChoice(["a", "b"], "b", true)).toStrictEqual(["a", "b"]);
    expect(withChoice(["a", "b"], "a", false)).toStrictEqual(["b"]);
    expect(withChoice(["a"], "b", false)).toStrictEqual(["a"]);
  });
});

describe(knownFilter, () => {
  it("drops a tag deleted, or a channel disconnected, since it was chosen", () => {
    expect(
      knownFilter(
        { channelIds: ["mastodon", "gone"], tagIds: ["deleted", "news"] },
        { channelIds: ["mastodon", "bluesky"], tagIds: ["news"] }
      )
    ).toStrictEqual({ channelIds: ["mastodon"], tagIds: ["news"] });
  });
});
