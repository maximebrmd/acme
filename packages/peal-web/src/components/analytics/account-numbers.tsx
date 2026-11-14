"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { AnalyticsDashboard, SocialChannel } from "peal-contract";
import { Button } from "peal-ui/components/button";
import {
  ChartContainer,
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
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { dayDate, daysBetween, trendOf } from "#analytics/report.ts";

/** Where each export downloads from. */
export interface ExportLinks {
  readonly accounts: string;
  readonly posts: string;
}

interface AccountNumbersProps {
  readonly channels: readonly SocialChannel[];
  readonly dashboard: AnalyticsDashboard;
  readonly exports: ExportLinks;
}

const compared = ["posts", "engagement", "impressions", "reach"] as const;

const dayColumns = ["followers", "views", "reach"] as const;

const directionOf = (change: number): "fewer" | "more" | "same" => {
  if (change === 0) {
    return "same";
  }

  return change > 0 ? "more" : "fewer";
};

/**
 * The figures the followers chart draws, and the views and reach the
 * platforms counted each day, as a table.
 */
export const AccountDaysTable = ({
  days,
}: {
  readonly days: AnalyticsDashboard["days"];
}) => {
  const t = useTranslations("Analytics");
  const format = useFormatter();

  return (
    <Table>
      <TableCaption>{t("accounts.tableCaption")}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t("chart.day")}</TableHead>
          {dayColumns.map((metric) => (
            <TableHead key={metric} scope="col" className="text-right">
              {t("metric", { metric })}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {days.map((day) => (
          <TableRow key={day.date}>
            <TableHead scope="row">
              {format.dateTime(dayDate(day.date), {
                dateStyle: "medium",
                timeZone: "UTC",
              })}
            </TableHead>
            {dayColumns.map((metric) => (
              <TableCell key={metric} variant="numeric">
                {day[metric] === null
                  ? t("totals.notGiven")
                  : format.number(day[metric])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/**
 * The range beside the one before it, and the accounts' own numbers: the
 * trend of the posts' totals, followers with what they gained, their chart
 * with the same figures as a table, each channel's, and the exports. A
 * number a platform does not give is said so, never written as zero.
 */
export const AccountNumbers = ({
  channels,
  dashboard,
  exports,
}: AccountNumbersProps) => {
  const t = useTranslations("Analytics");
  const tPosts = useTranslations("Posts");
  const format = useFormatter();
  const days = daysBetween(dashboard.from, dashboard.to);

  const longDay = (day: string) =>
    format.dateTime(dayDate(day), { dateStyle: "medium", timeZone: "UTC" });

  const dayLabel = (day: string | number | undefined) =>
    format.dateTime(dayDate(String(day)), {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const count = (value: number | null) =>
    value === null ? t("totals.notGiven") : format.number(value);

  const trendText = (now: number | null, before: number | null) => {
    // The range before is gone in part on some platform: no change to say.
    if (!dashboard.previousKept) {
      return t("trend.notKept");
    }

    const trend = trendOf(now, before);

    if (trend === null) {
      return t("trend.unknown");
    }

    if (trend.change === 0) {
      return t("trend.same");
    }

    const share =
      trend.share === null
        ? null
        : format.number(trend.share, {
            maximumFractionDigits: 0,
            signDisplay: "always",
            style: "percent",
          });

    return t(trend.change > 0 ? "trend.more" : "trend.fewer", {
      count: format.number(Math.abs(trend.change)),
      share: share ?? "",
      shared: share === null ? "no" : "yes",
    });
  };

  const gainedText = (gained: number | null, range: "current" | "previous") => {
    if (gained === null) {
      return t("trend.unknown");
    }

    return t("accounts.gained", {
      change: directionOf(gained),
      count: format.number(Math.abs(gained)),
      range,
    });
  };

  const read = dashboard.days.some(
    ({ followers, reach, views }) =>
      followers !== null || reach !== null || views !== null
  );

  const config: ChartConfig = {
    followers: {
      color: "var(--chart-2)",
      label: t("metric", { metric: "followers" }),
    },
  };

  const first = dashboard.days[0]?.date;
  const last = dashboard.days.at(-1)?.date;

  return (
    <div className="flex flex-col gap-10">
      <section
        aria-labelledby="analytics-trend"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2 id="analytics-trend" className="text-xl font-semibold">
            {t("trend.title", { days })}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("trend.description", {
              from: longDay(dashboard.previous.from),
              to: longDay(dashboard.previous.to),
            })}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {compared.map((metric) => (
            <div
              key={metric}
              className="flex flex-col gap-1 rounded-lg border p-4"
            >
              <dt className="text-muted-foreground text-sm">
                {t("metric", { metric })}
              </dt>
              <dd className="flex flex-col gap-1">
                <span className="text-2xl font-semibold tabular-nums">
                  {count(dashboard.totals[metric])}
                </span>
                <span className="text-muted-foreground text-sm">
                  {trendText(
                    dashboard.totals[metric],
                    dashboard.previousTotals[metric]
                  )}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        aria-labelledby="analytics-followers"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2 id="analytics-followers" className="text-xl font-semibold">
            {t("accounts.title")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t(read ? "accounts.description" : "accounts.none")}
          </p>
        </div>
        {read ? (
          <>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-lg border p-4">
                <dt className="text-muted-foreground text-sm">
                  {t("metric", { metric: "followers" })}
                </dt>
                <dd className="flex flex-col gap-1">
                  <span className="text-2xl font-semibold tabular-nums">
                    {count(dashboard.followers.current)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {gainedText(dashboard.followers.gained, "current")}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {dashboard.previousKept
                      ? gainedText(
                          dashboard.previousFollowers.gained,
                          "previous"
                        )
                      : t("trend.notKept")}
                  </span>
                </dd>
              </div>
            </dl>
            <Tabs defaultValue="chart">
              <TabsList aria-label={t("accounts.views")}>
                <TabsTrigger value="chart">{t("chart.chart")}</TabsTrigger>
                <TabsTrigger value="table">{t("chart.table")}</TabsTrigger>
              </TabsList>
              <TabsContent value="chart">
                <figure className="flex flex-col gap-2">
                  <ChartContainer
                    aria-hidden="true"
                    config={config}
                    className="aspect-auto h-64 w-full"
                  >
                    <LineChart
                      accessibilityLayer={false}
                      data={[...dashboard.days]}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        axisLine={false}
                        dataKey="date"
                        minTickGap={16}
                        tickFormatter={dayLabel}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        domain={["auto", "auto"]}
                        tickFormatter={(value: number) => format.number(value)}
                        tickLine={false}
                        width={56}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatLabel={dayLabel}
                            formatValue={(value) => format.number(value)}
                          />
                        }
                      />
                      <Line
                        connectNulls={false}
                        dataKey="followers"
                        dot={false}
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        type="monotone"
                      />
                    </LineChart>
                  </ChartContainer>
                  <figcaption className="text-muted-foreground text-sm">
                    {first === undefined || last === undefined
                      ? null
                      : t("accounts.caption", {
                          from: longDay(first),
                          to: longDay(last),
                        })}
                  </figcaption>
                </figure>
              </TabsContent>
              <TabsContent value="table">
                <AccountDaysTable days={dashboard.days} />
              </TabsContent>
            </Tabs>
            <Table>
              <TableCaption>{t("accounts.byChannel")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t("totals.channel")}</TableHead>
                  <TableHead scope="col" className="text-right">
                    {t("metric", { metric: "followers" })}
                  </TableHead>
                  <TableHead scope="col">{t("accounts.change")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.channels.map((numbers) => {
                  const channel = channels.find(
                    ({ id }) => id === numbers.channelId
                  );

                  return (
                    <TableRow key={numbers.channelId}>
                      <TableHead scope="row">
                        {channel === undefined ? (
                          t("accounts.disconnected")
                        ) : (
                          <span className="flex flex-col">
                            <span>{channel.handle}</span>
                            <span className="text-muted-foreground text-xs">
                              {tPosts("platform", {
                                platform: channel.platform,
                              })}
                            </span>
                          </span>
                        )}
                      </TableHead>
                      <TableCell variant="numeric">
                        {count(numbers.followers.current)}
                      </TableCell>
                      <TableCell>
                        {gainedText(numbers.followers.gained, "current")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        ) : null}
      </section>
      <section
        aria-labelledby="analytics-export"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2 id="analytics-export" className="text-xl font-semibold">
            {t("export.title")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("export.description")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            render={
              <a href={exports.posts} download>
                {t("export.posts")}
              </a>
            }
          />
          <Button
            variant="outline"
            render={
              <a href={exports.accounts} download>
                {t("export.accounts")}
              </a>
            }
          />
        </div>
      </section>
    </div>
  );
};
