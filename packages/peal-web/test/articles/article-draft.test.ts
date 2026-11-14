import { describe, expect, it } from "@effect/vitest";
import { DateTime, Exit } from "effect";
import type { Article } from "peal-contract";

import {
  articleFailureOf,
  draftOf,
  errorTagOf,
  inputOf,
  timeInputOf,
} from "#articles/article-draft.ts";

const article: Article = {
  authorId: null,
  body: {
    content: [
      { content: [{ text: "Sow early.", type: "text" }], type: "paragraph" },
    ],
    type: "doc",
  },
  categories: ["Garden", "Vegetables"],
  channelId: "0190f3a0-0000-7000-8000-00000000a003",
  coverMediaId: "0190f3a0-0000-7000-8000-00000000c001",
  createdAt: DateTime.makeUnsafe("2026-11-13T09:00:00Z"),
  excerpt: null,
  id: "0190f3a0-0000-7000-8000-00000000f001",
  siteStatus: "future",
  state: {
    _tag: "scheduled",
    scheduledAt: DateTime.makeUnsafe("2026-11-20T08:30:00Z"),
    timeZone: "Europe/Paris",
  },
  tags: ["peas"],
  title: "Spring sowing",
  updatedAt: DateTime.makeUnsafe("2026-11-13T09:00:00Z"),
};

describe("an article's draft", () => {
  it("holds what the article says, its time on the reader's clock", () => {
    const draft = draftOf(article, "unused", "Europe/Paris");

    expect(draft.categories).toBe("Garden, Vegetables");
    expect(draft.time).toBe("2026-11-20T09:30");
    expect(draft.channelId).toBe(article.channelId);
  });

  it("goes back as the API takes it: names split, an empty excerpt none", () => {
    const draft = {
      ...draftOf(article, "unused", "Europe/Paris"),
      excerpt: "  ",
      tags: " peas , , beans ",
    };

    expect(inputOf(draft)).toStrictEqual({
      body: article.body,
      categories: ["Garden", "Vegetables"],
      coverMediaId: article.coverMediaId,
      excerpt: null,
      siteStatus: "future",
      tags: ["peas", "beans"],
      title: "Spring sowing",
    });
  });

  it("sends at the wall-clock time in the zone, or now when none is given", () => {
    const draft = draftOf(article, "unused", "Europe/Paris");

    const time = timeInputOf(draft, "Europe/Paris");

    expect("at" in time ? DateTime.formatIso(time.at) : "").toBe(
      "2026-11-20T08:30:00.000Z"
    );
    expect(timeInputOf({ ...draft, time: "" }, "Europe/Paris")).toStrictEqual({
      timeZone: "Europe/Paris",
    });
  });

  it("words the errors it knows, and the others as unknown", () => {
    const failure = articleFailureOf(
      Exit.fail({ _tag: "ArticleChangeRefused", code: "rest_cannot_edit" })
    );

    expect(failure._tag === "Some" ? errorTagOf(failure.value) : "").toBe(
      "ArticleChangeRefused"
    );
    expect(errorTagOf({ _tag: "SomethingElse" })).toBe("unknown");
  });
});
