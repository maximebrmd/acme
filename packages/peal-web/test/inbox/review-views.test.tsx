import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { constVoid } from "effect/Function";
import { NextIntlClientProvider } from "next-intl";
import type { Channel, InboxReview, InboxReviewThread } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ReviewReplyBoxView,
  ReviewThreadRowView,
  ReviewView,
} from "#components/inbox/review-views.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (locale: "en" | "fr", view: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      {view}
    </NextIntlClientProvider>
  );

const at = (iso: string) => DateTime.makeUnsafe(iso);

const link = (href: string, label: string) => <a href={href}>{label}</a>;

const workspaceId = "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f";

const channel: Channel = {
  avatarUrl: null,
  connection: null,
  displayName: "Synthetic bakery",
  handle: "Synthetic bakery",
  id: "00000000-0000-7000-8000-0000000000c2",
  label: null,
  platform: "googleBusiness",
  status: { _tag: "active" },
  tokenExpiresAt: null,
};

const thread: InboxReviewThread = {
  averageRating: 4.46,
  channelId: channel.id,
  id: "00000000-0000-7000-8000-0000000000e1",
  kind: "reviews",
  lastCollectedAt: at("2026-11-14T09:27:00Z"),
  lastReviewAt: at("2026-11-14T08:00:00Z"),
  reviews: 2,
  totalReviewCount: 31,
  unanswered: 1,
};

const review: InboxReview = {
  id: "00000000-0000-7000-8000-0000000000e2",
  markedAnswered: false,
  photos: 2,
  rating: 2,
  receivedAt: at("2026-11-14T09:27:00Z"),
  reply: {
    moderation: "pending",
    text: "Sorry about the wait.",
    updatedAt: at("2026-11-14T10:00:00Z"),
  },
  reviewerName: null,
  state: "answered",
  text: "<b>Slow</b> service.",
  threadId: thread.id,
  updatedAt: at("2026-11-14T08:00:00Z"),
  writtenAt: at("2026-11-14T08:00:00Z"),
};

describe("the reviews' views", () => {
  it("show a location's counts and Google's figures, in both languages", async () => {
    const view = (
      <ReviewThreadRowView
        channel={channel}
        link={link}
        thread={thread}
        workspaceId={workspaceId}
      />
    );

    const english = await render("en", view);

    expect(english).toContain(`/app/${workspaceId}/inbox/reviews/${thread.id}`);
    expect(english).toContain("1 waiting of 2");
    expect(english).toContain("4.5 stars on average · 31 on Google");

    const french = await render("fr", view);

    expect(french).toContain("1 en attente sur 2");
    expect(french).toContain("4,5 étoiles en moyenne · 31 sur Google");
  });

  it("show a review as text, its stars, its photos counted, and the location's reply", async () => {
    const html = await render(
      "en",
      <ReviewView actions={null} replies={[]} review={review} />
    );

    expect(html).toContain("&lt;b&gt;Slow&lt;/b&gt; service.");
    expect(
      [
        "2 stars",
        "Someone who stays anonymous",
        "2 photos, not shown",
        "Google is checking it",
        "Sorry about the wait.",
      ].filter((text) => !html.includes(text))
    ).toStrictEqual([]);
    expect(html).not.toContain("photos.example");
  });

  it("count a reply in Google's bytes, and hold the send past them", async () => {
    const html = await render(
      "fr",
      <ReviewReplyBoxView
        bytes={4100}
        error={null}
        maximum={4096}
        pending={false}
        sending={false}
        text="é"
        onChange={constVoid}
        onSend={constVoid}
      />
    );

    expect(html).toMatch(/4\s100 sur 4\s096 octets/u);
    expect(html).toContain('aria-invalid="true"');
  });
});
