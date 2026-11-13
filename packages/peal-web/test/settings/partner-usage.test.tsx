import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { PartnerUsageReport, TenantUsage } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  PartnerUsageView,
  TenantUsageRows,
} from "#components/settings/partner-usage.tsx";
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

const tenant = (
  workspaceId: string,
  name: string,
  externalId: string | null,
  home = false
): TenantUsage => ({
  assistantRequests: 0,
  byPlatform: [{ platform: "mastodon", posts: 3 }],
  channelDays: 8,
  channels: 4,
  daysCounted: 2,
  externalId,
  home,
  mediaStorage: null,
  meteredPosts: [],
  name,
  publishedPosts: 3,
  workspaceId,
});

// A partner with a home workspace and one customer on the first page, and
// more to load.
const report: PartnerUsageReport = {
  allowances: null,
  current: { channels: 9, workspaces: 2 },
  days: [
    {
      byPlatform: [{ platform: "mastodon", posts: 6 }],
      channels: 9,
      day: "2026-11-10",
      publishedPosts: 6,
      workspaces: 2,
    },
    {
      byPlatform: [],
      channels: null,
      day: "2026-11-11",
      publishedPosts: 0,
      workspaces: null,
    },
  ],
  period: { from: "2026-11-10", to: "2026-11-11" },
  plan: null,
  totals: {
    billableAccountDays: null,
    byPlatform: [{ platform: "mastodon", posts: 6 }],
    channelDays: 9,
    daysCounted: 1,
    meteredPosts: [],
    publishedPosts: 6,
  },
  workspaces: {
    next: "next-page",
    total: 2,
    workspaces: [
      tenant("home-id", "Synthetic home", null, true),
      tenant("customer-id", "Synthetic customer", "customer-7"),
    ],
  },
};

const more = <button type="button">More</button>;

describe(PartnerUsageView, () => {
  it("adds up the period, and what the account holds now", async () => {
    const html = await render(
      "en",
      <PartnerUsageView report={report} more={more} />
    );

    expect(html).toContain("6 posts published");
    expect(html).toContain("2 workspaces, 9 channels connected now");
    expect(html).toContain("Customers deleted since are not listed.");
  });

  it("lists each workspace with its external id, then the way to more", async () => {
    const html = await render(
      "en",
      <PartnerUsageView report={report} more={more} />
    );

    expect(html).toMatch(
      />External id<.*>Name<.*>Channels<.*>Channel-days<.*>Published posts</u
    );
    expect(html).toMatch(/customer-7<\/td><td[^>]*>Synthetic customer/u);
    expect(html).toContain("Synthetic home (this workspace)");
    expect(html).toContain(">More<");
  });

  it("speaks French", async () => {
    const html = await render(
      "fr",
      <PartnerUsageView report={report} more={null} />
    );

    expect(html).toContain(">Identifiant externe<");
    expect(html).toContain(">Jours-canal<");
    expect(html).toContain(">Posts publiés<");
    expect(html).toContain("Les clients supprimés depuis ne sont pas listés.");
  });

  it("leaves out the account as a whole when a page does not carry it", async () => {
    const html = await render(
      "en",
      <PartnerUsageView
        report={{ ...report, current: null, days: null, totals: null }}
        more={null}
      />
    );

    expect(html).not.toContain("posts published");
    expect(html).toContain("Synthetic customer");
  });
});

describe(TenantUsageRows, () => {
  it("writes a dash for a workspace without an external id", async () => {
    const html = await render(
      "en",
      <table>
        <tbody>
          <TenantUsageRows tenants={[tenant("customer-id", "Unnamed", null)]} />
        </tbody>
      </table>
    );

    expect(html).toMatch(/<td[^>]*>–<\/td><td[^>]*>Unnamed/u);
  });
});
