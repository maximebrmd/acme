"use client";

import type { EngagementDay } from "acme-contract";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "acme-ui/components/chart";
import type { ChartConfig } from "acme-ui/components/chart";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "acme-ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "acme-ui/components/tabs";
import { useFormatter, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { dayDate } from "#analytics/report.ts";
import type { EngagementKey } from "#analytics/report.ts";

/** Each count's color, from the theme's chart palette. */
export const engagementColors: Readonly<Record<EngagementKey, string>> = {
  likes: "var(--chart-2)",
  quotes: "var(--chart-1)",
  replies: "var(--chart-4)",
  reposts: "var(--chart-3)",
};

interface EngagementChartProps {
  readonly days: readonly EngagementDay[];
  /** The counts shown: quotes only where a platform counts them. */
  readonly keys: readonly EngagementKey[];
}

/**
 * What the posts gained each day, as stacked bars, with the same figures
 * as a table for anyone who does not read charts: the chart is hidden from
 * screen readers, whose users take the table.
 */
export const EngagementChart = ({ days, keys }: EngagementChartProps) => {
  const t = useTranslations("Analytics");
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

  const config: ChartConfig = Object.fromEntries(
    keys.map((key) => [
      key,
      { color: engagementColors[key], label: t("metric", { metric: key }) },
    ])
  );

  const first = days[0]?.date;
  const last = days.at(-1)?.date;

  return (
    <Tabs defaultValue="chart">
      <TabsList aria-label={t("chart.views")}>
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
            <BarChart accessibilityLayer={false} data={[...days]}>
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
                tickFormatter={(value: number) => format.number(value)}
                tickLine={false}
                width={40}
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
              {keys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={engagementColors[key]}
                  stackId="engagement"
                />
              ))}
            </BarChart>
          </ChartContainer>
          <figcaption className="text-muted-foreground text-sm">
            {first === undefined || last === undefined
              ? null
              : t("chart.caption", {
                  from: longDay(first),
                  to: longDay(last),
                })}
          </figcaption>
        </figure>
      </TabsContent>
      <TabsContent value="table">
        <Table>
          <TableCaption>{t("chart.tableCaption")}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("chart.day")}</TableHead>
              {keys.map((key) => (
                <TableHead key={key} scope="col" className="text-right">
                  {t("metric", { metric: key })}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => (
              <TableRow key={day.date}>
                <TableHead scope="row">{longDay(day.date)}</TableHead>
                {keys.map((key) => (
                  <TableCell key={key} variant="numeric">
                    {format.number(day[key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  );
};
