import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type {
  DashboardTotals,
  WorkspaceAnalytics,
  WorkspaceReport,
} from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ReportTableView } from "#components/overview/report-views.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { reportRowOf } from "#overview/report.ts";

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

const link = (href: string, label: string) => <a href={href}>{label}</a>;

const totals = (
  posts: number,
  impressions: number | null
): DashboardTotals => ({
  clicks: null,
  engagement: posts * 4,
  impressions,
  likes: posts * 3,
  posts,
  quotes: null,
  reach: null,
  replies: 0,
  reposts: posts,
  saves: null,
});

const analytics: WorkspaceAnalytics = {
  followers: { current: 320, gained: -4 },
  previousFollowers: { current: 324, gained: null },
  previousKept: true,
  previousTotals: totals(2, 150),
  totals: totals(5, 400),
};

const workspace = (
  id: string,
  name: string,
  figures: WorkspaceAnalytics | null,
  refused: WorkspaceReport["refused"] = null
): WorkspaceReport => ({
  analytics: figures,
  id,
  name,
  refused,
  role: "owner",
  slug: name.toLowerCase(),
});

describe(reportRowOf, () => {
  it("gives each total its change, and none where no platform gives it", () => {
    const row = reportRowOf(analytics);

    expect(
      row.cells.map(({ trend, value }) => [value, trend?.change ?? null])
    ).toStrictEqual([
      [5, 3],
      [20, 12],
      [15, 9],
      [5, 3],
      [0, 0],
      [null, null],
      [400, 250],
      [null, null],
      [null, null],
      [null, null],
    ]);
    expect(row.followers).toStrictEqual({
      trend: { change: -4, share: null },
      value: 320,
    });
  });

  it("shows no change against a range before that is not all kept", () => {
    const row = reportRowOf({ ...analytics, previousKept: false });

    expect(row.cells.every(({ trend }) => trend === null)).toBeTruthy();
  });
});

describe(ReportTableView, () => {
  it("draws a row a workspace, a dash where a count is not given, and words where the role reads none", async () => {
    const html = await render(
      "en",
      <ReportTableView
        from="2026-10-11"
        to="2026-11-09"
        linkTo={link}
        workspaces={[
          workspace(
            "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e41",
            "Studio",
            analytics
          ),
          workspace("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e42", "Shop", null),
          workspace(
            "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e43",
            "Locked",
            null,
            "twoStepRequired"
          ),
        ]}
      />
    );

    expect(html).toContain(
      '<a href="/app/5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e41/analytics">Studio</a>'
    );
    expect(html).toMatch(/400<\/span><span[^>]*>\+250</u);
    expect(html).toMatch(
      /Not given.*Your role here does not read analytics\..*Requires two-step verification\./u
    );
    expect(html).toContain(
      "Totals of the posts published from 2026-10-11 to 2026-11-09"
    );
  });

  it("speaks French", async () => {
    const html = await render(
      "fr",
      <ReportTableView
        from="2026-10-11"
        to="2026-11-09"
        linkTo={link}
        workspaces={[]}
      />
    );

    expect(html).toContain("Abonnés");
  });
});
