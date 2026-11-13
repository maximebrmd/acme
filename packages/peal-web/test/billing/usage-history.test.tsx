import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import { usageRetentionDays } from "peal-contract";
import type { WorkspaceUsageReport } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  UsageDaysTable,
  UsageHistoryView,
  WorkspaceUsageHistory,
} from "#components/billing/usage-history.tsx";
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

const midnight = DateTime.makeUnsafe("2026-11-12T00:00:00Z");

// Three days: two with posts and a snapshot, the last without either.
const report: WorkspaceUsageReport = {
  allowances: null,
  current: {
    assistantRequests: { resetsAt: midnight, used: 0 },
    channels: 3,
    mediaStorage: 0,
    members: 1,
    scheduledPosts: { resetsAt: midnight, used: 0 },
  },
  days: [
    {
      assistantImages: 0,
      assistantRequests: 2,
      billableAccounts: null,
      byPlatform: [
        { platform: "bluesky", posts: 1 },
        { platform: "x", posts: 2 },
      ],
      channels: 2,
      day: "2026-11-09",
      mediaStorage: 1_500_000_000,
      members: 1,
      outboundMessages: 0,
      publishedPosts: 3,
    },
    {
      assistantImages: 0,
      assistantRequests: 0,
      billableAccounts: null,
      byPlatform: [{ platform: "x", posts: 1 }],
      channels: 3,
      day: "2026-11-10",
      mediaStorage: 1_500_000_000,
      members: 1,
      outboundMessages: 0,
      publishedPosts: 1,
    },
    {
      assistantImages: 0,
      assistantRequests: null,
      billableAccounts: null,
      byPlatform: [],
      channels: null,
      day: "2026-11-11",
      mediaStorage: null,
      members: null,
      outboundMessages: 0,
      publishedPosts: 0,
    },
  ],
  period: { from: "2026-11-09", to: "2026-11-11" },
  plan: null,
  sharedWith: null,
  totals: {
    assistantImages: 0,
    billableAccountDays: null,
    byPlatform: [
      { platform: "bluesky", posts: 1 },
      { platform: "x", posts: 3 },
    ],
    channelDays: 5,
    daysCounted: 2,
    managedAds: 0,
    outboundMessages: 0,
    meteredPosts: [
      { month: "2026-11-01", platform: "x", posts: 3, postsWithLinks: 1 },
    ],
    publishedPosts: 4,
  },
};

const empty: WorkspaceUsageReport = {
  ...report,
  days: report.days.map((day) => ({
    ...day,
    assistantImages: 0,
    assistantRequests: null,
    billableAccounts: null,
    byPlatform: [],
    channels: null,
    mediaStorage: null,
    members: null,
    outboundMessages: 0,
    publishedPosts: 0,
  })),
  totals: {
    assistantImages: 0,
    billableAccountDays: null,
    byPlatform: [],
    channelDays: 0,
    daysCounted: 0,
    managedAds: 0,
    outboundMessages: 0,
    meteredPosts: [],
    publishedPosts: 0,
  },
};

describe(WorkspaceUsageHistory, () => {
  it("adds up the period", async () => {
    const html = await render("en", <WorkspaceUsageHistory report={report} />);

    expect(html).toContain("4 posts published");
    expect(html).toContain(
      `Counts only, kept ${String(usageRetentionDays)} days`
    );
    expect(html).toContain("5 channel-days, over 2 days counted");
    expect(html).toContain("3 posts on X in November 2026, 1 with a link");
    expect(html).not.toContain("partner");
  });

  it("offers the days as a table beside the chart", async () => {
    const html = await render("en", <WorkspaceUsageHistory report={report} />);

    expect(html).toContain(">Chart<");
    expect(html).toContain(">Table<");
    // The chart is hidden from screen readers, who take the table.
    expect(html).toMatch(/data-slot="chart"[^>]*aria-hidden="true"/u);
    expect(html).toContain(
      "Posts published and channels connected each UTC day, from Nov 9, 2026 to Nov 11, 2026."
    );
  });

  it("says so when nothing was counted, and when a partner's plan holds the channels", async () => {
    const html = await render(
      "fr",
      <WorkspaceUsageHistory
        report={{
          ...empty,
          sharedWith: { partnerWorkspaceId: "home-workspace" },
        }}
      />,
      "Pacific/Honolulu"
    );

    expect(html).toContain("Rien n’a encore été compté sur cette période.");
    expect(html).toContain(
      "Les canaux de cet espace de travail comptent dans l’offre de l’espace de travail de son partenaire."
    );
    expect(html).toContain("0 publication mise en ligne");
    // Days are on the calendar, whatever the reader's zone.
    expect(html).toContain("du 9 nov. 2026 au 11 nov. 2026");
  });
});

describe(UsageHistoryView, () => {
  it("draws any days and totals, the table it is given behind its tab", async () => {
    const html = await render(
      "en",
      <UsageHistoryView
        days={report.days.map(({ channels, day, publishedPosts }) => ({
          channels,
          day,
          publishedPosts,
        }))}
        period={report.period}
        table={<p>A table of its own</p>}
        totals={report.totals}
      />
    );

    expect(html).toContain("4 posts published");
    expect(html).toContain(">Table<");
    // Not the workspace's table of days: the one given, behind its tab.
    expect(html).not.toContain("Usage each UTC day");
  });
});

describe(UsageDaysTable, () => {
  it("gives each day's figures, a dash for a day without a snapshot", async () => {
    const html = await render("en", <UsageDaysTable days={report.days} />);

    expect(html).toContain("Usage each UTC day");
    expect(html).toMatch(
      /Nov 9, 2026<\/th><td[^>]*>3<\/td><td[^>]*>2<\/td><td[^>]*>1<\/td><td[^>]*>1\.5 GB<\/td><td[^>]*>2<\/td>/u
    );
    // Never a zero for what was not taken.
    expect(html).toMatch(
      /Nov 11, 2026<\/th><td[^>]*>0<\/td><td[^>]*>–<\/td><td[^>]*>–<\/td><td[^>]*>–<\/td><td[^>]*>–<\/td>/u
    );
  });
});
