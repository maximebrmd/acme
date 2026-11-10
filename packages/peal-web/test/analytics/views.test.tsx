import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type {
  AnalyticsDashboard,
  AnalyticsSummary,
  Channel,
  DashboardTotals,
  Platform,
  PostAnalytics,
} from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  AccountDaysTable,
  AccountNumbers,
} from "#components/analytics/account-numbers.tsx";
import { ChannelTotals } from "#components/analytics/channel-totals.tsx";
import { EngagementChart } from "#components/analytics/engagement-chart.tsx";
import {
  countedOn,
  PostMetricsView,
} from "#components/analytics/post-metrics.tsx";
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
  connection: null,
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
        clicks: null,
        impressions: null,
        likes: 12,
        quotes: 2,
        reach: null,
        replies: 4,
        reposts: 3,
        saves: null,
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

// A platform as a server's capabilities describe its analytics.
const described = (platform: Platform, perPost: boolean) => ({
  analytics: { accountNumbers: [], perPost, postCounts: [] },
  platform,
});

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
      "Peal relève pour l’instant les chiffres sur Mastodon, Bluesky, TikTok, YouTube, Instagram, Pinterest, les pages LinkedIn, Facebook, Threads et X, dans l’heure qui suit la parution."
    );
  });

  it("says counts are not available on the platforms Peal reads none on", async () => {
    const linkedin: Channel = {
      ...channel,
      handle: "Alice Example",
      id: "01900000-0000-7000-8000-0000000000c3",
      platform: "linkedin",
    };

    // A location: Google gives no count of a post.
    const business: Channel = {
      ...channel,
      handle: "Example Bakery",
      id: "01900000-0000-7000-8000-0000000000c4",
      platform: "googleBusiness",
    };

    const view = (
      <PostMetricsView
        analytics={{ postId: analytics.postId, targets: [] }}
        channels={[channel, linkedin, business]}
        publishedOn={[linkedin.id, business.id]}
      />
    );

    const english = await render("en", view);
    const french = await render("fr", view);

    expect(english).toContain(
      "Counts are not available on LinkedIn profiles and Google Business Profile: Peal reads them on Mastodon, Bluesky, TikTok, YouTube, Instagram, Pinterest, LinkedIn pages, Facebook, Threads, and X only, so far."
    );
    expect(english).not.toContain("within the hour");
    expect(french).toContain(
      "Les chiffres ne sont pas disponibles sur les profils LinkedIn et Google Business Profile : Peal ne les relève pour l’instant que sur Mastodon, Bluesky, TikTok, YouTube, Instagram, Pinterest, les pages LinkedIn, Facebook, Threads et X."
    );
    expect(french).not.toContain("dans l’heure");
  });

  it("follows the server for the platforms it reads: X only where its operator turned it on", async () => {
    const x: Channel = {
      ...channel,
      handle: "@alice_example",
      id: "01900000-0000-7000-8000-0000000000c7",
      platform: "x",
    };

    // This server's capabilities: counts on Mastodon and Bluesky, none on X.
    const html = await render(
      "en",
      <PostMetricsView
        analytics={{ postId: analytics.postId, targets: [] }}
        channels={[channel, x]}
        counted={["mastodon", "bluesky"]}
        publishedOn={[x.id]}
      />
    );

    expect(html).toContain(
      "Counts are not available on X: Peal reads them on Mastodon and Bluesky only, so far."
    );
    expect(html).not.toContain("within the hour");

    // Where the operator turned X reads on, its counts are on their way.
    const reading = await render(
      "en",
      <PostMetricsView
        analytics={{ postId: analytics.postId, targets: [] }}
        channels={[channel, x]}
        counted={["mastodon", "bluesky", "x"]}
        publishedOn={[x.id]}
      />
    );

    expect(reading).toContain(
      "Peal reads counts on Mastodon, Bluesky, and X so far, within the hour after a post goes live."
    );
    expect(reading).not.toContain("not available");
  });

  it("tells the platforms a server counts from its capabilities", () => {
    expect(
      countedOn([
        described("mastodon", true),
        described("x", false),
        described("linkedin", true),
      ])
    ).toStrictEqual(["mastodon", "linkedin"]);
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

  it("promises counts on a LinkedIn page, which Peal reads", async () => {
    const page: Channel = {
      ...channel,
      connection: "linkedinPage",
      handle: "example-bakery",
      id: "01900000-0000-7000-8000-0000000000c7",
      platform: "linkedin",
    };

    const html = await render(
      "en",
      <PostMetricsView
        analytics={{ postId: analytics.postId, targets: [] }}
        channels={[page]}
        publishedOn={[page.id]}
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
    expect(html).toContain("Counts are not available on LinkedIn profiles:");
  });
});

const totalsOf = (likes: number): DashboardTotals => ({
  clicks: null,
  engagement: likes + 2,
  impressions: null,
  likes,
  posts: 3,
  quotes: null,
  reach: null,
  replies: 1,
  reposts: 1,
  saves: null,
});

const numbers = {
  followers: { current: 1250, gained: 30 },
  previousFollowers: { current: 1220, gained: -4 },
  previousKept: true,
  previousTotals: totalsOf(8),
  totals: totalsOf(12),
};

const dashboard: AnalyticsDashboard = {
  ...numbers,
  channels: [
    { ...numbers, channelId: channel.id, platform: "mastodon" },
    {
      ...numbers,
      channelId: "01900000-0000-7000-8000-0000000000c9",
      followers: { current: null, gained: null },
      platform: null,
    },
  ],
  days: [
    {
      date: "2026-11-08",
      followers: null,
      likes: 0,
      quotes: 0,
      reach: null,
      replies: 0,
      reposts: 0,
      views: null,
    },
    {
      date: "2026-11-09",
      followers: 1250,
      likes: 4,
      quotes: 0,
      reach: 300,
      replies: 0,
      reposts: 0,
      views: 420,
    },
  ],
  from: "2026-11-08",
  platforms: [{ ...numbers, platform: "mastodon" }],
  previous: { from: "2026-11-06", to: "2026-11-07" },
  timeZone: "Europe/Paris",
  to: "2026-11-09",
  topPosts: [],
};

const shown = async (shownDashboard: AnalyticsDashboard = dashboard) => {
  const html = await render(
    "en",
    <AccountNumbers
      channels={[channel]}
      dashboard={shownDashboard}
      exports={{
        accounts: "/export?kind=accounts",
        posts: "/export?kind=posts",
      }}
    />
  );

  return html;
};

describe("the accounts' numbers", () => {
  it("shows the trend against the period before", async () => {
    const html = await shown();

    expect(html).toContain("Against the 2 days before");
    // 14 interactions against 10: 4 more, 40%.
    expect(html).toContain("4 more (+40%)");
    // Unknown is written, never as zero.
    expect(html).toContain("Not given by the platform");
    expect(html).toContain('href="/export?kind=posts"');
  });

  it("shows no change against a range before that a platform no longer keeps", async () => {
    const html = await shown({ ...dashboard, previousKept: false });

    expect(html).toContain(
      "No comparison: a platform’s terms keep its figures for less than the range before goes back"
    );
    expect(html).not.toContain("4 more (+40%)");
    expect(html).not.toContain("over the range before");
  });

  it("shows followers with what they gained, in all and by channel", async () => {
    const html = await shown();

    expect(html).toContain(">1,250<");
    expect(html).toContain("30 more over the range");
    expect(html).toContain("4 fewer over the range before");
    expect(html).toContain("@alice@mastodon.test");
    expect(html).toContain("A channel no longer connected");
  });

  it("hides the followers chart from screen readers", async () => {
    const html = await shown();

    expect(html).toContain('aria-label="Show the followers as"');
    expect(html).toMatch(/data-slot="chart"[^>]*aria-hidden="true"/u);
    expect(html).toContain(
      "Followers at the end of each day, from Nov 8, 2026 to Nov 9, 2026."
    );
  });

  it("gives the chart's figures as a table, with views and reach", async () => {
    const table = await render(
      "en",
      <AccountDaysTable days={dashboard.days} />
    );

    expect(table).toContain("Followers, views and reach each day");
    expect(table).toContain("Nov 9, 2026");
    expect(table).toContain(">1,250<");
    expect(table).toContain(">420<");
    // The day nothing was read says so.
    expect(table).toContain("Not given by the platform");
  });

  it("shows nothing of followers where no account was read yet", async () => {
    const html = await render(
      "fr",
      <AccountNumbers
        channels={[channel]}
        dashboard={{
          ...dashboard,
          channels: [],
          days: dashboard.days.map((day) => ({
            ...day,
            followers: null,
            reach: null,
            views: null,
          })),
          followers: { current: null, gained: null },
        }}
        exports={{ accounts: "/a", posts: "/p" }}
      />
    );

    expect(html).toContain(
      "Peal relève les abonnés de chaque canal une fois par jour"
    );
    expect(html).not.toContain("recharts");
  });
});
