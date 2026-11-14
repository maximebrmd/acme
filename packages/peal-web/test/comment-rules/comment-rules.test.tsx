import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { CommentRule } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { commentRuleRequestOf, keywordsTyped } from "#comment-rules/rules.ts";
import { CommentRuleView } from "#components/comment-rules/comment-rule-views.tsx";
import { loadMessages } from "#i18n/messages.ts";

// Comment rules in the web app: the request the form sends, and how a
// rule reads, in both languages.

const rule: CommentRule = {
  channelId: "0190f3a0-0000-7000-8000-00000000c001",
  channels: [
    {
      channelId: "0190f3a0-0000-7000-8000-00000000c001",
      platform: "mastodon",
      reply: "available",
    },
  ],
  createdAt: DateTime.makeUnsafe("2026-07-06T07:00:00Z"),
  endedReason: null,
  id: "0190f3a0-0000-7000-8000-0000000c0001",
  keywords: ["price", "prix"],
  matches: [
    {
      code: null,
      commentId: "0190f3a0-0000-7000-8000-0000000c0101",
      lookedAt: DateTime.makeUnsafe("2026-07-06T08:00:00Z"),
      outcome: "replied",
      replyId: "0190f3a0-0000-7000-8000-0000000c0201",
    },
  ],
  postId: null,
  reply: "The price list is on our site.",
  startedBy: null,
  status: "active",
};

const render = async (locale: "en" | "fr") =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      <CommentRuleView actions={null} rule={rule} />
    </NextIntlClientProvider>
  );

describe("the comment rule form", () => {
  it("sends the channel, the keywords typed and the reply", () => {
    expect(keywordsTyped(" price, , prix ")).toStrictEqual(["price", "prix"]);
    expect(
      commentRuleRequestOf({
        channelId: "c",
        keywords: "price, prix",
        reply: " On our site. ",
      })
    ).toStrictEqual({
      channelId: "c",
      keywords: ["price", "prix"],
      reply: "On our site.",
    });
    expect(
      commentRuleRequestOf({ channelId: "", keywords: "a", reply: "b" })
    ).toBe("channel");
    expect(
      commentRuleRequestOf({ channelId: "c", keywords: " , ", reply: "b" })
    ).toBe("keywords");
  });

  it("reads a rule and what it did, in both languages", async () => {
    await expect(render("en")).resolves.toContain(
      "When a comment says: price, prix"
    );
    await expect(render("en")).resolves.toContain("Mastodon: answers there");
    await expect(render("fr")).resolves.toContain(
      "Quand un commentaire dit : price, prix"
    );
  });
});
