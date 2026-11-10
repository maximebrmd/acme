import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import { PlatformSchema } from "peal-contract";
import type { ApprovalRequest, ReviewComment } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ApprovalHistoryView } from "#components/review/approval-history-view.tsx";
import { ApprovalItemView } from "#components/review/approvals-list-view.tsx";
import { ChannelPreviewsView } from "#components/review/channel-previews-view.tsx";
import { CommentThreadsView } from "#components/review/comment-threads-view.tsx";
import { PolicyFields } from "#components/settings/approval-policy-form.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { threadsOf } from "#review/threads.ts";

// What reviews show, rendered to markup: what people typed stays text, and
// every view says what it shows in the reader's language and time zone.

const at = (iso: string) => DateTime.makeUnsafe(iso);

const channelId = "0190f3a0-0000-7000-8000-00000000c001";

const visitor = {
  kind: "visitor" as const,
  linkId: null,
  name: "Ada <b>Lovelace</b>",
  userId: null,
};

const comment = (
  id: string,
  more: Partial<ReviewComment> = {}
): ReviewComment => ({
  anchor: null,
  author: visitor,
  createdAt: at("2026-11-09T11:00:00Z"),
  id,
  parentId: null,
  postId: "0190f3a0-0000-7000-8000-00000000d004",
  resolved: null,
  text: "Plain words.",
  ...more,
});

const render = async (
  locale: "en" | "fr",
  node: ReactNode,
  timeZone = "UTC"
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={timeZone}
    >
      {node}
    </NextIntlClientProvider>
  );
};

const channelNames = new Map([[channelId, "@studio@example.social"]]);

const quoted = (located: { end: number; start: number } | null) =>
  comment("a", {
    anchor: {
      channelId,
      selection: { located, quote: "Friday", start: 30 },
    },
  });

describe(CommentThreadsView, () => {
  it("renders what people typed as text, never as markup", async () => {
    const html = await render(
      "en",
      <CommentThreadsView
        channelNames={channelNames}
        comments={[
          comment("a", {
            text: '<script>alert("x")</script>\n<img src=x onerror=alert(1)>',
          }),
        ]}
      />
    );

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>Lovelace");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("Ada &lt;b&gt;Lovelace&lt;/b&gt;");
  });

  it("groups answers under the comment that started their thread", () => {
    const root = comment("a");
    const answer = comment("b", { parentId: "a" });
    const other = comment("c");

    expect(threadsOf([root, answer, other])).toStrictEqual([
      { answers: [answer], root },
      { answers: [], root: other },
    ]);
  });

  it("says what a comment is about, and when the text no longer says it", async () => {
    const found = await render(
      "en",
      <CommentThreadsView
        channelNames={channelNames}
        comments={[quoted({ end: 36, start: 30 })]}
      />
    );

    const gone = await render(
      "fr",
      <CommentThreadsView
        channelNames={channelNames}
        comments={[quoted(null)]}
      />
    );

    expect(found).toContain("About these words, on @studio@example.social:");
    expect(found).toContain("Friday</blockquote>");
    expect(gone).toContain(
      "À propos de ces mots, que le texte sur @studio@example.social ne dit plus :"
    );
  });

  it("shows instants in the reader's time zone, and who is a reviewer", async () => {
    const html = await render(
      "en",
      <CommentThreadsView
        channelNames={channelNames}
        comments={[
          comment("a", {
            resolved: { at: at("2026-11-10T09:00:00Z"), by: visitor },
          }),
        ]}
      />,
      "Europe/Paris"
    );

    expect(html).toContain("Nov 9, 2026, 12:00 PM");
    expect(html).toContain("Reviewer");
    expect(html).toContain("Resolved");
  });
});

const previews = (
  <ChannelPreviewsView
    channels={[
      {
        channelId,
        handle: "@studio@example.social",
        platform: "mastodon",
        text: "Launch <day>\nJoin us.",
      },
      {
        channelId: "0190f3a0-0000-7000-8000-00000000c002",
        handle: null,
        platform: null,
        text: "",
      },
    ]}
    media={[
      {
        altText: "A red bicycle",
        kind: "image",
        mediaId: "m1",
        url: "https://media.example.test/m1",
      },
      { altText: "", kind: null, mediaId: "m2", url: null },
      {
        altText: "",
        kind: "document",
        mediaId: "m3",
        url: "https://media.example.test/m3",
      },
    ]}
  />
);

describe(ChannelPreviewsView, () => {
  it("shows each channel's own text as text, under its name and platform", async () => {
    const html = await render("en", previews);

    expect(html).toContain("@studio@example.social");
    expect(html).toContain("Mastodon");
    expect(html).toContain("Launch &lt;day&gt;\nJoin us.");
    expect(html).toContain(`data-review-channel="${channelId}"`);
  });

  it("says when a channel is gone or has no text", async () => {
    const html = await render("en", previews);

    expect(html).toContain("A disconnected channel");
    expect(html).toContain("No text on this channel.");
  });

  it("writes out each file's alt text, and says when it has none", async () => {
    const html = await render("en", previews);

    expect(html).toContain('alt="A red bicycle"');
    expect(html).toContain("Alt text: A red bicycle");
    expect(html).toContain("This file cannot be shown.");
    expect(html).toContain("No alt text.");
  });

  it("links a PDF document, which has no alt text to check", async () => {
    const html = await render("en", previews);

    expect(html).toContain("A PDF document, shown page by page on LinkedIn.");
    expect(html).toMatch(
      /<a href="https:\/\/media\.example\.test\/m3"[^>]*rel="noreferrer noopener"[^>]*>Open the document in a new tab<\/a>/u
    );
    // Two files could have alt text: the image has it, the other is gone.
    expect(html.match(/No alt text\./gu)).toHaveLength(1);

    await expect(render("fr", previews)).resolves.toContain(
      "Ouvrir le document dans un nouvel onglet"
    );
  });

  it("names every platform a post goes to", async () => {
    const html = await render(
      "en",
      <ChannelPreviewsView
        channels={PlatformSchema.literals.map((platform, index) => ({
          channelId: `0190f3a0-0000-7000-8000-00000000c1${String(index).padStart(2, "0")}`,
          handle: `synthetic-${platform}`,
          platform,
          text: "Launch day",
        }))}
        media={[]}
      />
    );

    for (const name of [
      "Pinterest",
      "Google Business Profile",
      "LinkedIn",
      "YouTube",
    ]) {
      expect(html).toContain(name);
    }

    // No platform falls back to its id.
    expect(html).not.toContain(">googleBusiness<");
  });
});

const approval = (more: Partial<ApprovalRequest> = {}): ApprovalRequest => ({
  decision: null,
  id: "0190f3a0-0000-7000-8000-00000000b001",
  postId: "0190f3a0-0000-7000-8000-00000000d004",
  requestedAt: at("2026-11-09T10:00:00Z"),
  requestedBy: "8d0f7780-8536-41ef-a55c-f18fd2a01bf8",
  requestedByName: "Synthetic Contributor",
  requestedVia: "member",
  schedule: { at: at("2026-11-21T09:00:00Z"), timeZone: "Europe/Paris" },
  status: "pending",
  subjectHash: "5a".repeat(32),
  ...more,
});

describe(ApprovalHistoryView, () => {
  it("says who asked, and who decided through a link", async () => {
    const html = await render(
      "en",
      <ApprovalHistoryView
        approvals={[
          approval({
            decision: { at: at("2026-11-10T08:00:00Z"), by: visitor },
            status: "approved",
          }),
          approval({
            id: "second",
            requestedBy: null,
            requestedByName: null,
            requestedVia: "apiKey",
          }),
        ]}
      />
    );

    expect(html).toContain("Approved");
    expect(html).toContain("Asked by Synthetic Contributor on Nov 9, 2026");
    expect(html).toContain(
      "Decided by Ada &lt;b&gt;Lovelace&lt;/b&gt;, through a review link, on Nov 10, 2026"
    );
    expect(html).toContain("Asked with an API key");
    expect(html).toContain("Awaiting approval");
  });
});

describe(ApprovalItemView, () => {
  it("shows a post that waits, with its link, when it goes out and who asked", async () => {
    const listed = await render(
      "fr",
      <ul>
        <ApprovalItemView approval={approval()}>
          <a href="https://example.test/post">Ouvrir</a>
        </ApprovalItemView>
      </ul>,
      "Europe/Paris"
    );

    expect(listed).toContain('<a href="https://example.test/post">Ouvrir</a>');
    expect(listed).toContain("pour partir le 21 nov. 2026, 10:00");
    expect(listed).toContain("Demandée par Synthetic Contributor");
  });
});

describe(PolicyFields, () => {
  it("offers the three policies, each with what it means, and checks the current one", async () => {
    const html = await render(
      "en",
      <PolicyFields
        disabled={false}
        value="contributorsAndApplications"
        onChange={() => {
          // Nothing changes while rendering to markup.
        }}
      />
    );

    expect(html).toContain("Posts wait for an approval");
    expect(html.match(/type="radio"/gu)).toHaveLength(3);
    expect(html.match(/checked=""/gu)).toHaveLength(1);
    expect(html).toContain("When a contributor or an application asks");
    expect(html).toContain("Whoever may approve may approve their own.");
  });
});
