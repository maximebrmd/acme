import { useTranslations } from "next-intl";
import type { WorkspaceReport } from "peal-contract";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";

import { reportMetrics, reportRowOf } from "#overview/report.ts";
import type { ReportCell } from "#overview/report.ts";

import type { LinkTo } from "./overview-views.tsx";

// A figure, and its change against the days before when there is one; a
// dash, read as "not given", where there is none.
const Figure = ({ cell }: { readonly cell: ReportCell }) => {
  const t = useTranslations("Overview.report");

  if (cell.value === null) {
    return (
      <>
        <span aria-hidden>–</span>
        <span className="sr-only">{t("noFigure")}</span>
      </>
    );
  }

  return (
    <span className="flex flex-col tabular-nums">
      <span>{cell.value}</span>
      {cell.trend === null ? null : (
        <span className="text-muted-foreground text-xs">
          {t("change", { change: cell.trend.change })}
        </span>
      )}
    </span>
  );
};

/**
 * The report across workspaces as a table: a row a workspace, its totals
 * with their change, its followers, a dash where a count is not given,
 * and a line where the person may not read its analytics. A table, never
 * a chart: counts of different platforms are not alike.
 */
export const ReportTableView = ({
  from,
  linkTo,
  to,
  workspaces,
}: {
  readonly from: string;
  readonly linkTo: LinkTo;
  readonly to: string;
  readonly workspaces: readonly WorkspaceReport[];
}) => {
  const t = useTranslations("Overview.report");
  const metric = useTranslations("Analytics");

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableCaption>{t("caption", { from, to })}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>{t("workspace")}</TableHead>
            {reportMetrics.map((name) => (
              <TableHead key={name} className="text-end">
                {metric("metric", { metric: name })}
              </TableHead>
            ))}
            <TableHead className="text-end">{t("followers")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workspaces.map((workspace) => {
            const name = linkTo(
              `/app/${workspace.id}/analytics`,
              workspace.name
            );

            if (workspace.analytics === null) {
              return (
                <TableRow key={workspace.id}>
                  <TableHead scope="row">{workspace.name}</TableHead>
                  <TableCell colSpan={reportMetrics.length + 1}>
                    <span className="text-muted-foreground">
                      {workspace.refused === null ? t("notRead") : t("refused")}
                    </span>
                  </TableCell>
                </TableRow>
              );
            }

            const row = reportRowOf(workspace.analytics);

            return (
              <TableRow key={workspace.id}>
                <TableHead scope="row">{name}</TableHead>
                {row.cells.map((cell, index) => (
                  <TableCell key={reportMetrics[index]} variant="numeric">
                    <Figure cell={cell} />
                  </TableCell>
                ))}
                <TableCell variant="numeric">
                  <Figure cell={row.followers} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
