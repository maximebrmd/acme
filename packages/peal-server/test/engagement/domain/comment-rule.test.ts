import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { CommentRuleIdSchema } from "#engagement/domain/comment-rule-id.ts";
import {
  changeCommentRule,
  commentRuleSupport,
  endCommentRule,
  isMatch,
  keywordsOf,
  startCommentRule,
} from "#engagement/domain/comment-rule.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

const now = DateTime.makeUnsafe("2026-07-06T07:00:00Z");

const ruleWith = (keywords: readonly string[]) =>
  startCommentRule(
    {
      id: CommentRuleIdSchema.make("00000000-0000-7000-8000-000000000601"),
      keywords: keywordsOf(keywords),
      reply: "The price list is on our site.",
      scope: {
        _tag: "channel",
        channelId: ChannelIdSchema.make("00000000-0000-7000-8000-000000000201"),
      },
      startedBy: Option.none(),
      startedVia: { _tag: "web" },
      workspaceId: WorkspaceIdSchema.make(
        "0b6c3b1e-2f6d-4a8e-9f0a-3c5d7e9f1a2b"
      ),
    },
    now
  );

describe("a comment rule's keywords", () => {
  it("are kept folded, trimmed and once each", () => {
    expect(
      keywordsOf([" Prix ", "PRIX", "", "Price  list", "Café"])
    ).toStrictEqual(["prix", "price list", "cafe"]);
  });

  it("match a comment that holds one as a word, whatever its case and accents", () => {
    const rule = ruleWith(["prix", "price list", "café"]);

    expect(isMatch(rule, "Quel est le PRIX ?")).toBeTruthy();
    expect(isMatch(rule, "Where is the price list?")).toBeTruthy();
    expect(isMatch(rule, "Un cafe, s'il vous plaît")).toBeTruthy();
    expect(isMatch(rule, "C'est surprixé")).toBeFalsy();
    expect(isMatch(rule, "pricelist")).toBeFalsy();
  });
});

describe("a comment rule", () => {
  it("pauses, resumes, and changes no more once ended", () => {
    const rule = ruleWith(["prix"]);

    const paused = Result.getOrThrow(
      changeCommentRule(rule, { paused: true }, now)
    );

    expect(paused.status._tag).toBe("paused");
    expect(
      Result.getOrThrow(changeCommentRule(paused, { paused: false }, now))
        .status._tag
    ).toBe("active");
    expect(
      Result.isFailure(
        changeCommentRule(endCommentRule(rule, "stopped", now), {}, now)
      )
    ).toBeTruthy();
  });

  it("answers only where the platform's rules let an app answer by itself", () => {
    expect({
      bluesky: commentRuleSupport.bluesky,
      linkedin: commentRuleSupport.linkedin,
      mastodon: commentRuleSupport.mastodon,
      x: commentRuleSupport.x,
      youtube: commentRuleSupport.youtube,
    }).toStrictEqual({
      bluesky: "notAllowed",
      linkedin: "notAllowed",
      mastodon: "available",
      x: "notAllowed",
      youtube: "notAllowed",
    });
  });
});
