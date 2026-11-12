"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTranslations } from "next-intl";
import type {
  CalendarDay,
  PartnerUsageReport,
  PartnerUsageReportDay,
  TenantUsage,
} from "peal-contract";
import { Button } from "peal-ui/components/button";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { Skeleton } from "peal-ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";
import { useId, useState } from "react";
import type { ReactNode } from "react";

import {
  dayDate,
  defaultRange,
  rangeEnding,
  ranges,
  RangeSchema,
  todayIn,
} from "#analytics/report.ts";
import type { Range } from "#analytics/report.ts";
import { UsageHistoryView } from "#components/billing/usage-history.tsx";
import { partnerUsageOf } from "#partner/atoms.ts";

const decodeRange = Schema.decodeUnknownOption(RangeSchema);

const dash = "–";

// The columns of the table of workspaces.
const tenantColumns = 5;

interface Period {
  readonly from: CalendarDay;
  readonly to: CalendarDay;
}

// The last `range` UTC days, today included, as the usage counts them.
const periodOf = (range: Range): Period => {
  const { from, to } = rangeEnding(todayIn("UTC"), range, "UTC");

  return { from, to };
};

/** Each day's figures across the account, as the chart draws them. */
const PartnerDaysTable = ({
  days,
}: {
  readonly days: readonly PartnerUsageReportDay[];
}) => {
  const t = useTranslations("WorkspaceSettings.partner.usageReport");
  const format = useFormatter();

  const count = (value: number | null) =>
    value === null ? dash : format.number(value);

  return (
    <Table>
      <TableCaption>{t("daysCaption")}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t("day")}</TableHead>
          <TableHead scope="col" className="text-right">
            {t("workspaces")}
          </TableHead>
          <TableHead scope="col" className="text-right">
            {t("channels")}
          </TableHead>
          <TableHead scope="col" className="text-right">
            {t("posts")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {days.map((day) => (
          <TableRow key={day.day}>
            <TableHead scope="row">
              {format.dateTime(dayDate(day.day), {
                dateStyle: "medium",
                timeZone: "UTC",
              })}
            </TableHead>
            <TableCell variant="numeric">{count(day.workspaces)}</TableCell>
            <TableCell variant="numeric">{count(day.channels)}</TableCell>
            <TableCell variant="numeric">
              {format.number(day.publishedPosts)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/** A row per workspace: its external id first, as the partner knows it. */
export const TenantUsageRows = ({
  tenants,
}: {
  readonly tenants: readonly TenantUsage[];
}) => {
  const t = useTranslations("WorkspaceSettings.partner.usageReport");
  const format = useFormatter();

  return tenants.map((tenant) => (
    <TableRow key={tenant.workspaceId}>
      <TableCell>{tenant.externalId ?? dash}</TableCell>
      <TableCell>
        {tenant.home ? t("home", { name: tenant.name }) : tenant.name}
      </TableCell>
      <TableCell variant="numeric">{format.number(tenant.channels)}</TableCell>
      <TableCell variant="numeric">
        {format.number(tenant.channelDays)}
      </TableCell>
      <TableCell variant="numeric">
        {format.number(tenant.publishedPosts)}
      </TableCell>
    </TableRow>
  ));
};

/**
 * A partner's usage over a period: what it holds now and its days across
 * every workspace, as a chart and a table, which the first page alone
 * answers, then its workspaces' first page, with `more` after them for
 * the next pages.
 */
export const PartnerUsageView = ({
  more,
  report,
}: {
  readonly more: ReactNode;
  readonly report: PartnerUsageReport;
}) => {
  const t = useTranslations("WorkspaceSettings.partner.usageReport");
  const { current, days, totals } = report;

  return (
    <div className="flex flex-col gap-6">
      {current === null ? null : (
        <p>
          {t("now", {
            channels: current.channels,
            workspaces: current.workspaces,
          })}
        </p>
      )}
      {days === null || totals === null ? null : (
        <UsageHistoryView
          days={days}
          period={report.period}
          table={<PartnerDaysTable days={days} />}
          totals={totals}
        />
      )}
      <Table>
        <TableCaption>{t("tenantsCaption")}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t("externalId")}</TableHead>
            <TableHead scope="col">{t("name")}</TableHead>
            <TableHead scope="col" className="text-right">
              {t("channels")}
            </TableHead>
            <TableHead scope="col" className="text-right">
              {t("channelDays")}
            </TableHead>
            <TableHead scope="col" className="text-right">
              {t("publishedPosts")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TenantUsageRows tenants={report.workspaces.workspaces} />
          {more}
        </TableBody>
      </Table>
      <p className="text-muted-foreground text-sm">{t("deleted")}</p>
    </div>
  );
};

// A row of the table of workspaces that holds one thing.
const WideRow = ({ children }: { readonly children: ReactNode }) => (
  <TableRow>
    <TableCell colSpan={tenantColumns}>{children}</TableCell>
  </TableRow>
);

// The button that asks for the next page of workspaces.
const LoadMore = ({ onMore }: { readonly onMore: () => void }) => {
  const t = useTranslations("WorkspaceSettings.partner.usageReport");

  return (
    <WideRow>
      <Button variant="outline" size="sm" onClick={onMore}>
        {t("loadMore")}
      </Button>
    </WideRow>
  );
};

// A page of workspaces after the first, and, when it is the last asked
// for, the way to the next.
const LaterPage = ({
  before,
  last,
  onMore,
  period,
  workspaceId,
}: {
  readonly before: string;
  readonly last: boolean;
  readonly onMore: (next: string) => void;
  readonly period: Period;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.partner.usageReport");
  const query = partnerUsageOf(workspaceId, { ...period, before });
  const result = useAtomValue(query);
  const retry = useAtomRefresh(query);

  if (AsyncResult.isSuccess(result)) {
    const { next, workspaces } = result.value.workspaces;

    return (
      <>
        <TenantUsageRows tenants={workspaces} />
        {last && next !== null ? (
          <LoadMore
            onMore={() => {
              onMore(next);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <WideRow>
      {AsyncResult.isFailure(result) ? (
        <span className="flex items-center gap-3" role="alert">
          {t("loadFailed")}
          <Button variant="outline" size="sm" onClick={retry}>
            {t("retry")}
          </Button>
        </span>
      ) : (
        <span aria-busy="true">{t("loading")}</span>
      )}
    </WideRow>
  );
};

const FirstPage = ({
  period,
  workspaceId,
}: {
  readonly period: Period;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.partner.usageReport");
  const query = partnerUsageOf(workspaceId, period);
  const result = useAtomValue(query);
  const retry = useAtomRefresh(query);
  // The cursors of the pages asked for after the first, in order.
  const [later, setLater] = useState<readonly string[]>([]);

  const more = (next: string) => {
    setLater((asked) => [...asked, next]);
  };

  if (AsyncResult.isSuccess(result)) {
    const { next } = result.value.workspaces;

    return (
      <PartnerUsageView
        report={result.value}
        more={
          <>
            {later.length === 0 && next !== null ? (
              <LoadMore
                onMore={() => {
                  more(next);
                }}
              />
            ) : null}
            {later.map((before, index) => (
              <LaterPage
                key={before}
                before={before}
                last={index === later.length - 1}
                onMore={more}
                period={period}
                workspaceId={workspaceId}
              />
            ))}
          </>
        }
      />
    );
  }

  return AsyncResult.isFailure(result) ? (
    <div className="flex flex-col items-start gap-3" role="alert">
      <p className="text-sm">{t("loadFailed")}</p>
      <Button variant="outline" size="sm" onClick={retry}>
        {t("retry")}
      </Button>
    </div>
  ) : (
    <div aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-64 w-full" />
    </div>
  );
};

/**
 * A partner's usage per customer, for its home workspace's people with
 * partner:read: the last 7, 30 or 90 UTC days, read by the browser with
 * the member's session, its workspaces a page at a time.
 */
export const UsagePerCustomer = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.partner.usageReport");
  const [range, setRange] = useState<Range>(defaultRange);
  const labelId = useId();
  const period = periodOf(range);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label id={labelId}>{t("period")}</Label>
        <Select
          value={range}
          onValueChange={(value) => {
            const picked = decodeRange(value);

            if (Option.isSome(picked)) {
              setRange(picked.value);
            }
          }}
        >
          <SelectTrigger aria-labelledby={labelId}>
            <SelectValue>{t("range", { days: Number(range) })}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ranges.map((choice) => (
              <SelectItem key={choice} value={choice}>
                {t("range", { days: Number(choice) })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <FirstPage key={range} period={period} workspaceId={workspaceId} />
    </div>
  );
};
