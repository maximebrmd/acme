import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { AnalyticsSummary, Channel, PostAnalytics } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ChannelTotals } from "#components/analytics/channel-totals.tsx";
import { EngagementChart } from "#components/analytics/engagement-chart.tsx";
import { PostMetricsView } from "#components/analytics/post-metrics.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (
  locale: "en" | "fr",
  view: ReactNode,
  timeZone = "UTC"
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={timeZone}
    >
      {view}
    </NextIntlClientProvider>
  );
};

const channel: Channel = {
  avatarUrl: null,
  displayName: null,
  handle: "@alice@mastodon.test",
  id: "01900000-0000-7000-8000-0000000000c1",
  platform: "mastodon",
  status: { _tag: "active" },
  tokenExpiresAt: null,
};

const summary: AnalyticsSummary = {
  channels: [
    {
      channelId: channel.id,
      impressions: null,
      likes: 1234,
      posts: 3,
      quotes: null,
      replies: 5,
      reposts: 42,
    },
    {
      channelId: "01900000-0000-7000-8000-0000000000c2",
      impressions: null,
      likes: 7,
      posts: 1,
      quotes: 2,
      replies: 0,
      reposts: 1,
    },
  ],
  days: [
    { date: "2026-11-08", likes: 10, quotes: 1, replies: 2, reposts: 3 },
    { date: "2026-11-09", likes: -1, quotes: 0, replies: 0, reposts: 0 },
  ],
  from: "2026-11-08",
  timeZone: "Europe/Paris",
  to: "2026-11-09",
  topPosts: [],
  totals: {
    impressions: null,
    likes: 1241,
    posts: 4,
    quotes: 2,
    replies: 5,
    reposts: 43,
  },
};

describe(ChannelTotals, () => {
  it("names each channel, a disconnected one too", async () => {
    const html = await render(
      "en",
      <ChannelTotals channels={[channel]} summary={summary} />
    );

    expect(html).toContain("@alice@mastodon.test");
    expect(html).toContain("A disconnected channel");
    expect(html).toContain("1,234");
    expect(html).toContain("All channels");
  });

  it("shows a count only where a platform gives it", async () => {
    const html = await render(
      "en",
      <ChannelTotals channels={[channel]} summary={summary} />
    );

    expect(html).toContain("Quotes");
    expect(html).toContain("Not given by the platform");
    // Neither platform tells impressions: no column for them.
    expect(html).not.toContain("Impressions");
  });

  it("is written in French", async () => {
    const html = await render(
      "fr",
      <ChannelTotals channels={[channel]} summary={summary} />
    );

    expect(html).toContain("Publications");
    expect(html).toContain("J’aime");
    expect(html).toContain("Non fourni par la plateforme");
    expect(html).toContain("1 234");
  });
});

describe(EngagementChart, () => {
  it("offers the figures as a table beside the chart", async () => {
    const html = await render(
      "en",
      <EngagementChart days={summary.days} keys={["likes", "reposts"]} />
    );

    expect(html).toContain('aria-label="Show the engagement as"');
    expect(html).toContain(">Chart<");
    expect(html).toContain(">Table<");
    // The chart is hidden from screen readers, who take the table.
    expect(html).toMatch(/data-slot="chart"[^>]*aria-hidden="true"/u);
    expect(html).toContain(
      "Engagement gained each day, from Nov 8, 2026 to Nov 9, 2026."
    );
  });

  it("writes days as the calendar has them, whatever the zone", async () => {
    const html = await render(
      "fr",
      <EngagementChart days={summary.days} keys={["likes"]} />,
      "Pacific/Honolulu"
    );

    expect(html).toContain("du 8 nov. 2026 au 9 nov. 2026");
  });
});

const analytics: PostAnalytics = {
  postId: "01900000-0000-7000-8000-0000000000a1",
  targets: [
    {
      channelId: channel.id,
      collecting: true,
      lastCollectedAt: DateTime.makeUnsafe("2026-11-09T10:07:00.000Z"),
      latest: {
        impressions: null,
        likes: 12,
        quotes: 2,
        replies: 4,
        reposts: 3,
      },
      permalink: "https://mastodon.test/@alice/1",
      publishedAt: DateTime.makeUnsafe("2026-11-09T08:00:00.000Z"),
      snapshots: [],
      targetId: "01900000-0000-7000-8000-0000000000b1",
    },
    {
      channelId: "01900000-0000-7000-8000-0000000000c2",
      collecting: false,
      lastCollectedAt: null,
      latest: null,
      permalink: null,
      publishedAt: DateTime.makeUnsafe("2026-10-01T08:00:00.000Z"),
      snapshots: [],
      targetId: "01900000-0000-7000-8000-0000000000b2",
    },
  ],
};

describe(PostMetricsView, () => {
  it("gives each channel's latest counts", async () => {
    const html = await render(
      "en",
      <PostMetricsView
        analytics={analytics}
        channels={[channel]}
        publishedOn={[channel.id]}
      />
    );

    expect(html).toContain("@alice@mastodon.test");
    expect(html).toContain(">Likes<");
    expect(html).toContain(">12<");
    expect(html).toContain(">Quotes<");
    expect(html).not.toContain(">Impressions<");
  });

  it("says when they were read, in the reader's zone, and when no more", async () => {
    const html = await render(
      "en",
      <PostMetricsView
        analytics={analytics}
        channels={[channel]}
        publishedOn={[channel.id]}
      />,
      "Europe/Paris"
    );

    expect(html).toContain("Read Nov 9, 2026, 11:07 AM");
    expect(html).toContain("Not read yet");
    expect(html).toContain("No longer read: posts are followed for 30 days.");
  });

  it("says when counts come, before the first read", async () => {
    const html = await render(
      "fr",
      <PostMetricsView
        analytics={{ postId: analytics.postId, targets: [] }}
        channels={[channel]}
        publishedOn={[channel.id]}
      />
    );

    expect(html).toContain(
      "Peal relève pour l’instant les chiffres sur Mastodon, Bluesky, TikTok et YouTube, dans l’heure qui suit la parution."
    );
  });

  it("says counts are not available on the platforms Peal reads none on", async () => {
    const linkedin: Channel = {
      ...channel,
      handle: "Alice Example",
      id: "01900000-0000-7000-8000-0000000000c3",
      platform: "linkedin",
    };

    const x: Channel = {
      ...channel,
      handle: "@alice_example",
      id: "01900000-0000-7000-8000-0000000000c4",
      platform: "x",
    };

    const view = (
      <PostMetricsView
        analytics={{ postId: analytics.postId, targets: [] }}
        channels={[channel, linkedin, x]}
        publishedOn={[linkedin.id, x.id]}
      />
    );

    const english = await render("en", view);
    const french = await render("fr", view);

    expect(english).toContain(
      "Counts are not available on LinkedIn and X: Peal reads them on Mastodon, Bluesky, TikTok, and YouTube only, so far."
    );
    expect(english).not.toContain("within the hour");
    expect(french).toContain(
      "Les chiffres ne sont pas disponibles sur LinkedIn et X : Peal ne les relève pour l’instant que sur Mastodon, Bluesky, TikTok et YouTube."
    );
    expect(french).not.toContain("dans l’heure");
  });

  it("promises counts on TikTok and YouTube, which Peal reads", async () => {
    const tiktok: Channel = {
      ...channel,
      handle: "@alice_example",
      id: "01900000-0000-7000-8000-0000000000c5",
      platform: "tiktok",
    };

    const youtube: Channel = {
      ...channel,
      handle: "Alice Example",
      id: "01900000-0000-7000-8000-0000000000c6",
      platform: "youtube",
    };

    const html = await render(
      "en",
      <PostMetricsView
        analytics={{ postId: analytics.postId, targets: [] }}
        channels={[tiktok, youtube]}
        publishedOn={[tiktok.id, youtube.id]}
      />
    );

    expect(html).toContain("within the hour after a post goes live");
    expect(html).not.toContain("Counts are not available");
  });

  it("says so beside the counts of the channels Peal reads", async () => {
    const linkedin: Channel = {
      ...channel,
      handle: "Alice Example",
      id: "01900000-0000-7000-8000-0000000000c3",
      platform: "linkedin",
    };

    const html = await render(
      "en",
      <PostMetricsView
        analytics={analytics}
        channels={[channel, linkedin]}
        publishedOn={[channel.id, linkedin.id]}
      />
    );

    expect(html).toContain(">12<");
    expect(html).toContain("Counts are not available on LinkedIn:");
  });
});
