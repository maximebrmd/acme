"use client";

import type { AnalyticsSummary, Channel, MetricTotals } from "peal-contract";
import { useFormatter, useTranslations } from "next-intl";

import { isEmpty, shownKeys } from "#analytics/report.ts";
import { ChannelTotals } from "#components/analytics/channel-totals.tsx";
import { EngagementChart } from "#components/analytics/engagement-chart.tsx";
import { TopPosts } from "#components/analytics/top-posts.tsx";

const headline: readonly (keyof MetricTotals)[] = [
  "posts",
  "likes",
  "reposts",
  "replies",
  "quotes",
];

interface AnalyticsSummaryViewProps {
  readonly channels: readonly Channel[];
  readonly summary: AnalyticsSummary;
  readonly workspaceId: string;
}

/**
 * A summary of the range: its totals, by channel, what its posts gained
 * each day, and those that did best. Dates are written in the zone of the
 * page's provider, the reader's.
 */
export const AnalyticsSummaryView = ({
  channels,
  summary,
  workspaceId,
}: AnalyticsSummaryViewProps) => {
  const t = useTranslations("Analytics");
  const format = useFormatter();

  const notes = (
    <div className="text-muted-foreground flex flex-col gap-1 text-sm">
      <p>{t("page.collection")}</p>
      {summary.totals.impressions === null ? (
        <p>{t("page.noImpressions")}</p>
      ) : null}
    </div>
  );

  if (isEmpty(summary)) {
    return (
      <div className="flex flex-col gap-4">
        <p>{t("page.empty")}</p>
        {notes}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <section
        aria-labelledby="analytics-totals"
        className="flex flex-col gap-4"
      >
        <h2 id="analytics-totals" className="text-xl font-semibold">
          {t("totals.title")}
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {headline.flatMap((metric) => {
            const value = summary.totals[metric];

            return value === null
              ? []
              : [
                  <div
                    key={metric}
                    className="flex flex-col gap-1 rounded-lg border p-4"
                  >
                    <dt className="text-muted-foreground text-sm">
                      {t("metric", { metric })}
                    </dt>
                    <dd className="text-2xl font-semibold tabular-nums">
                      {format.number(value)}
                    </dd>
                  </div>,
                ];
          })}
        </dl>
        <ChannelTotals channels={channels} summary={summary} />
      </section>
      <section
        aria-labelledby="analytics-engagement"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2 id="analytics-engagement" className="text-xl font-semibold">
            {t("chart.title")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("chart.description")}
          </p>
        </div>
        <EngagementChart days={summary.days} keys={shownKeys(summary)} />
      </section>
      <section aria-labelledby="analytics-top" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="analytics-top" className="text-xl font-semibold">
            {t("top.title")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("top.description")}
          </p>
        </div>
        <TopPosts
          channels={channels}
          posts={summary.topPosts}
          workspaceId={workspaceId}
        />
      </section>
      {notes}
    </div>
  );
};
