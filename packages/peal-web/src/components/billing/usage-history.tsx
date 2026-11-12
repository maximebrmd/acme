"use client";

import { useFormatter, useTranslations } from "next-intl";
import { usageRetentionDays } from "peal-contract";
import type {
  UsagePeriod,
  UsageTotals as UsageTotalsReport,
  WorkspaceUsageReport,
} from "peal-contract";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "peal-ui/components/chart";
import type { ChartConfig } from "peal-ui/components/chart";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "peal-ui/components/tabs";
import type { ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import { dayDate } from "#analytics/report.ts";
import { useSize } from "#billing/size.ts";

const colors = {
  channels: "var(--chart-2)",
  publishedPosts: "var(--chart-1)",
} as const;

const dash = "–";

/** A day as the chart draws it: posts as a bar, channels as a line. */
export interface ChartedDay {
  /** Counted only for a workspace's own days. */
  readonly assistantRequests?: number | null;
  readonly channels: number | null;
  readonly day: string;
  readonly publishedPosts: number;
}

interface UsageHistoryViewProps {
  readonly days: readonly ChartedDay[];
  readonly period: UsagePeriod;
  /** Whether a partner's plan holds the channels. */
  readonly shared?: boolean;
  /** The same figures as the chart, behind the Table tab. */
  readonly table: ReactNode;
  readonly totals: UsageTotalsReport;
}

const UsageTotals = ({ totals }: { readonly totals: UsageTotalsReport }) => {
  const t = useTranslations("Billing.usage.history");
  const format = useFormatter();

  const month = (day: string) =>
    format.dateTime(dayDate(day), {
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    });

  return (
    <ul className="flex flex-col gap-1 text-sm">
      <li>
        <span className="font-medium">
          {t("published", { count: totals.publishedPosts })}
        </span>
        {totals.byPlatform.length === 0
          ? null
          : ` (${totals.byPlatform
              .map(({ platform, posts }) =>
                t("onPlatform", { count: posts, platform })
              )
              .join(", ")})`}
      </li>
      <li>
        {t("channelDays", {
          count: totals.channelDays,
          days: totals.daysCounted,
        })}
      </li>
      {totals.meteredPosts.map((metered) => (
        <li key={`${metered.platform}-${metered.month}`}>
          {t("metered", {
            count: metered.posts,
            month: month(metered.month),
            platform: metered.platform,
            withLinks: metered.postsWithLinks,
          })}
        </li>
      ))}
    </ul>
  );
};

/** Each day's figures, as the chart draws them, with what it leaves out. */
export const UsageDaysTable = ({
  days,
}: {
  readonly days: WorkspaceUsageReport["days"];
}) => {
  const t = useTranslations("Billing.usage.history");
  const format = useFormatter();
  const size = useSize();

  const longDay = (day: string) =>
    format.dateTime(dayDate(day), { dateStyle: "medium", timeZone: "UTC" });

  const count = (value: number | null) =>
    value === null ? dash : format.number(value);

  return (
    <Table>
      <TableCaption>{t("tableCaption")}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t("day")}</TableHead>
          <TableHead scope="col" className="text-right">
            {t("posts")}
          </TableHead>
          <TableHead scope="col" className="text-right">
            {t("channels")}
          </TableHead>
          <TableHead scope="col" className="text-right">
            {t("members")}
          </TableHead>
          <TableHead scope="col" className="text-right">
            {t("media")}
          </TableHead>
          <TableHead scope="col" className="text-right">
            {t("assistant")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {days.map((day) => (
          <TableRow key={day.day}>
            <TableHead scope="row">{longDay(day.day)}</TableHead>
            <TableCell variant="numeric">
              {format.number(day.publishedPosts)}
            </TableCell>
            <TableCell variant="numeric">{count(day.channels)}</TableCell>
            <TableCell variant="numeric">{count(day.members)}</TableCell>
            <TableCell variant="numeric">
              {day.mediaStorage === null ? dash : size(day.mediaStorage)}
            </TableCell>
            <TableCell variant="numeric">
              {count(day.assistantRequests)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/**
 * Usage day by day (UTC): the period's totals, then each day's posts
 * published, as bars, and channels connected, as a line, with the same
 * figures as a table for anyone who does not read charts: the chart is
 * hidden from screen readers, whose users take the table. A day without a
 * count has a dash, never a zero. A workspace's (`WorkspaceUsageHistory`)
 * or a partner's across its workspaces.
 */
export const UsageHistoryView = ({
  days,
  period,
  shared = false,
  table,
  totals,
}: UsageHistoryViewProps) => {
  const t = useTranslations("Billing.usage.history");
  const format = useFormatter();

  const dayLabel = (day: string | number | undefined) =>
    format.dateTime(dayDate(String(day)), {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  // Days are on the calendar, in no zone: written as they are, in UTC.
  const longDay = (day: string) =>
    format.dateTime(dayDate(day), { dateStyle: "medium", timeZone: "UTC" });

  const config: ChartConfig = {
    channels: { color: colors.channels, label: t("channels") },
    publishedPosts: { color: colors.publishedPosts, label: t("posts") },
  };

  const counted =
    totals.publishedPosts > 0 ||
    totals.daysCounted > 0 ||
    days.some(({ assistantRequests }) => (assistantRequests ?? 0) > 0);

  return (
    <div className="flex flex-col gap-4">
      {shared ? (
        <p className="text-muted-foreground text-sm">{t("shared")}</p>
      ) : null}
      {counted ? null : (
        <p className="text-muted-foreground text-sm">{t("nothing")}</p>
      )}
      <UsageTotals totals={totals} />
      <Tabs defaultValue="chart">
        <TabsList aria-label={t("views")}>
          <TabsTrigger value="chart">{t("chart")}</TabsTrigger>
          <TabsTrigger value="table">{t("table")}</TabsTrigger>
        </TabsList>
        <TabsContent value="chart">
          <figure className="flex flex-col gap-2">
            <ChartContainer
              aria-hidden="true"
              config={config}
              className="aspect-auto h-64 w-full"
            >
              <ComposedChart accessibilityLayer={false} data={[...days]}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="day"
                  minTickGap={16}
                  tickFormatter={dayLabel}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickFormatter={(value: number) => format.number(value)}
                  tickLine={false}
                  width={40}
                  yAxisId="posts"
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  orientation="right"
                  tickFormatter={(value: number) => format.number(value)}
                  tickLine={false}
                  width={40}
                  yAxisId="channels"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatLabel={dayLabel}
                      formatValue={(value) => format.number(value)}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="publishedPosts"
                  fill={colors.publishedPosts}
                  yAxisId="posts"
                />
                <Line
                  connectNulls={false}
                  dataKey="channels"
                  dot={false}
                  stroke={colors.channels}
                  type="stepAfter"
                  yAxisId="channels"
                />
              </ComposedChart>
            </ChartContainer>
            <figcaption className="text-muted-foreground text-sm">
              {t("caption", {
                from: longDay(period.from),
                to: longDay(period.to),
              })}
            </figcaption>
          </figure>
        </TabsContent>
        <TabsContent value="table">{table}</TabsContent>
      </Tabs>
      <p className="text-muted-foreground text-xs">
        {t("note", { days: usageRetentionDays })}
      </p>
    </div>
  );
};

/** A workspace's usage day by day, as its billing page shows it. */
export const WorkspaceUsageHistory = ({
  report,
}: {
  readonly report: WorkspaceUsageReport;
}) => (
  <UsageHistoryView
    days={report.days}
    period={report.period}
    shared={report.sharedWith !== null}
    table={<UsageDaysTable days={report.days} />}
    totals={report.totals}
  />
);
