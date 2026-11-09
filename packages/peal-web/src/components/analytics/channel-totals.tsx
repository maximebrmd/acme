"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { AnalyticsSummary, Channel, MetricTotals } from "peal-contract";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";

type Column = keyof MetricTotals;

const allColumns: readonly Column[] = [
  "posts",
  "likes",
  "reposts",
  "replies",
  "quotes",
  "impressions",
];

// The counts a row shows, in order: quotes and impressions only where a
// platform of the range gives them.
const columnsOf = (summary: AnalyticsSummary): readonly Column[] =>
  allColumns.filter((column) => summary.totals[column] !== null);

interface ChannelTotalsProps {
  /** The workspace's channels, to name those of the summary. */
  readonly channels: readonly Channel[];
  readonly summary: AnalyticsSummary;
}

/** The range's posts by channel, with their latest counts added up. */
export const ChannelTotals = ({ channels, summary }: ChannelTotalsProps) => {
  const t = useTranslations("Analytics");
  const tPosts = useTranslations("Posts");
  const format = useFormatter();
  const columns = columnsOf(summary);

  const cell = (totals: MetricTotals, column: Column) => {
    const value = totals[column];

    return value === null ? (
      <span>
        <span aria-hidden="true">—</span>
        <span className="sr-only">{t("totals.notGiven")}</span>
      </span>
    ) : (
      format.number(value)
    );
  };

  return (
    <Table>
      <TableCaption>{t("totals.caption")}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t("totals.channel")}</TableHead>
          {columns.map((column) => (
            <TableHead key={column} scope="col" className="text-right">
              {t("metric", { metric: column })}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {summary.channels.map((totals) => {
          const channel = channels.find(({ id }) => id === totals.channelId);

          return (
            <TableRow key={totals.channelId}>
              <TableHead scope="row">
                {channel === undefined ? (
                  tPosts("disconnectedChannel")
                ) : (
                  <span className="flex flex-col">
                    <span>{channel.handle}</span>
                    <span className="text-muted-foreground text-xs">
                      {tPosts("platform", { platform: channel.platform })}
                    </span>
                  </span>
                )}
              </TableHead>
              {columns.map((column) => (
                <TableCell key={column} variant="numeric">
                  {cell(totals, column)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
      {summary.channels.length > 1 ? (
        <TableFooter>
          <TableRow>
            <TableHead scope="row">{t("totals.all")}</TableHead>
            {columns.map((column) => (
              <TableCell key={column} variant="numeric">
                {cell(summary.totals, column)}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      ) : null}
    </Table>
  );
};
