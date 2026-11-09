"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { MetricsSnapshot } from "peal-contract";
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
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { readingRows } from "#analytics/report.ts";
import type { EngagementKey } from "#analytics/report.ts";
import { engagementColors } from "#components/analytics/engagement-chart.tsx";

interface ReadingsChartProps {
  /** Names the channel, for the table's caption. */
  readonly handle: string;
  readonly snapshots: readonly MetricsSnapshot[];
}

/**
 * A post's counts on one channel each time they were read, as lines, with
 * the same figures as a table: the chart is hidden from screen readers,
 * whose users take the table. Times are in the page's provider zone.
 */
export const ReadingsChart = ({ handle, snapshots }: ReadingsChartProps) => {
  const t = useTranslations("Analytics");
  const format = useFormatter();
  const rows = readingRows(snapshots);

  const keys: readonly EngagementKey[] = snapshots.some(
    ({ metrics }) => metrics.quotes !== null
  )
    ? ["likes", "reposts", "replies", "quotes"]
    : ["likes", "reposts", "replies"];

  const config: ChartConfig = Object.fromEntries(
    keys.map((key) => [
      key,
      { color: engagementColors[key], label: t("metric", { metric: key }) },
    ])
  );

  const when = (at: string | number | undefined) =>
    format.dateTime(new Date(Number(at)), {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <Tabs defaultValue="chart">
      <TabsList aria-label={t("chart.views")}>
        <TabsTrigger value="chart">{t("chart.chart")}</TabsTrigger>
        <TabsTrigger value="table">{t("chart.table")}</TabsTrigger>
      </TabsList>
      <TabsContent value="chart">
        <ChartContainer
          aria-hidden="true"
          config={config}
          className="aspect-auto h-48 w-full"
        >
          <LineChart accessibilityLayer={false} data={[...rows]}>
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="at"
              domain={["dataMin", "dataMax"]}
              minTickGap={24}
              scale="time"
              tickFormatter={(at: number) =>
                format.dateTime(new Date(at), {
                  day: "numeric",
                  month: "short",
                })
              }
              tickLine={false}
              type="number"
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
                  formatLabel={when}
                  formatValue={(value) => format.number(value)}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {keys.map((key) => (
              <Line
                key={key}
                dataKey={key}
                dot={false}
                stroke={engagementColors[key]}
                strokeWidth={2}
                type="monotone"
              />
            ))}
          </LineChart>
        </ChartContainer>
      </TabsContent>
      <TabsContent value="table">
        <Table>
          <TableCaption>{t("post.tableCaption", { handle })}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("post.readAtColumn")}</TableHead>
              {keys.map((key) => (
                <TableHead key={key} scope="col" className="text-right">
                  {t("metric", { metric: key })}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.at}>
                <TableHead scope="row">{when(row.at)}</TableHead>
                {keys.map((key) => (
                  <TableCell key={key} variant="numeric">
                    {format.number(row[key])}
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
