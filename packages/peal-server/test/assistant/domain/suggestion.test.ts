import { describe, expect, it } from "@effect/vitest";
import { DateTime, Result } from "effect";

import { checkDraft, maxDraftLength } from "#assistant/domain/draft.ts";
import type { Draft } from "#assistant/domain/draft.ts";
import {
  acceptHashtags,
  acceptText,
  maxSuggestionLength,
} from "#assistant/domain/suggestion.ts";
import { remainingOf, usageWindowAt } from "#assistant/domain/usage-window.ts";

const draftOf = (text: string): Draft => Result.getOrThrow(checkDraft(text));

describe(checkDraft, () => {
  it("takes a text up to the limit, as written", () => {
    const text = `  ${"a".repeat(maxDraftLength - 2)}`;

    expect(Result.getOrThrow(checkDraft(text))).toBe(text);
  });

  it("refuses a blank text", () => {
    for (const text of ["", " \n\t "]) {
      expect(
        Result.match(checkDraft(text), {
          onFailure: ({ reason }) => reason,
          onSuccess: () => "accepted",
        })
      ).toBe("empty");
    }
  });

  it("refuses a text longer than the assistant takes", () => {
    const rejected = checkDraft("a".repeat(maxDraftLength + 1));

    expect(
      Result.match(rejected, {
        onFailure: ({ maxLength, reason }) => ({ maxLength, reason }),
        onSuccess: () => null,
      })
    ).toStrictEqual({ maxLength: maxDraftLength, reason: "tooLong" });
  });
});

describe(acceptText, () => {
  it("offers the text without the spaces around it", () => {
    expect(
      Result.getOrThrow(acceptText({ text: "\n  Our sale starts.\nCome!  " }))
    ).toStrictEqual({ _tag: "text", text: "Our sale starts.\nCome!" });
  });

  it("refuses an empty answer", () => {
    expect(
      Result.match(acceptText({ text: "  \n" }), {
        onFailure: ({ reason }) => reason,
        onSuccess: () => "accepted",
      })
    ).toBe("empty");
  });

  it("refuses an answer longer than any post the assistant writes", () => {
    expect(
      Result.match(acceptText({ text: "a".repeat(maxSuggestionLength + 1) }), {
        onFailure: ({ reason }) => reason,
        onSuccess: () => "accepted",
      })
    ).toBe("tooLong");
  });
});

const hashtagsOf = (proposed: readonly string[], draft = "Our sale") =>
  Result.match(acceptHashtags({ hashtags: proposed }, draftOf(draft)), {
    onFailure: ({ reason }) => reason,
    onSuccess: (suggestion) =>
      suggestion._tag === "hashtags" ? suggestion.hashtags : [],
  });

describe(acceptHashtags, () => {
  it("writes each with its #, once whatever its case", () => {
    expect(
      hashtagsOf(["spring", " #Sale ", "#sale", "#SALE", "#été_2026"])
    ).toStrictEqual(["#spring", "#Sale", "#été_2026"]);
  });

  it("leaves out what does not read as a hashtag", () => {
    expect(
      hashtagsOf(["#two words", "#", "#2026", "#ok!", "", "#launch"])
    ).toStrictEqual(["#launch"]);
  });

  it("leaves out the hashtags the draft already has", () => {
    expect(hashtagsOf(["#Launch", "#news"], "Big day. #launch")).toStrictEqual([
      "#news",
    ]);
  });

  it("keeps eight at most", () => {
    expect(
      hashtagsOf(Array.from({ length: 12 }, (_, index) => `#tag${index}a`))
    ).toHaveLength(8);
  });

  it("refuses an answer with no hashtag left", () => {
    expect(hashtagsOf(["not a tag", "#"])).toBe("noHashtags");
    expect(hashtagsOf([])).toBe("noHashtags");
  });

  // A pattern that can read a run of letters several ways takes quadratic
  // time over an answer it does not match: seconds for this one.
  it("reads a long answer in linear time", () => {
    const started = performance.now();

    expect(hashtagsOf([`#${"a".repeat(200_000)}!`, "#launch"])).toStrictEqual([
      "#launch",
    ]);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe(usageWindowAt, () => {
  it("counts by UTC day, starting again at midnight UTC", () => {
    const window = usageWindowAt(DateTime.makeUnsafe("2026-11-09T23:59:59Z"));

    expect(window.day).toStrictEqual({ day: 9, month: 11, year: 2026 });
    expect(DateTime.formatIso(window.resetsAt)).toBe(
      "2026-11-10T00:00:00.000Z"
    );
  });

  it("leaves nothing below zero", () => {
    expect(remainingOf(3, 1)).toBe(2);
    expect(remainingOf(3, 5)).toBe(0);
  });
});
