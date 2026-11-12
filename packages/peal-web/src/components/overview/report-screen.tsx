"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { WorkspaceReport } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
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
import { useId, useState } from "react";

import {
  defaultRange,
  ranges,
  RangeSchema,
  summaryTimeZone,
} from "#analytics/report.ts";
import type { Range } from "#analytics/report.ts";
import { Link } from "#i18n/navigation.ts";
import { reportPage } from "#overview/atoms.ts";
import { useMounted } from "#posts/use-mounted.ts";
import { browserTimeZone } from "#posts/zoned-time.ts";

import { ReportTableView } from "./report-views.tsx";

const workspaceLink = (href: string, label: string) => (
  <Link href={href} className="underline-offset-4 hover:underline">
    {label}
  </Link>
);

const isRange = Schema.is(RangeSchema);

const Loading = () => {
  const t = useTranslations("Overview.report");

  return (
    <div className="flex flex-col gap-3" aria-busy>
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-40" />
    </div>
  );
};

interface PagesProps {
  readonly before: readonly WorkspaceReport[];
  readonly cursor: Option.Option<string>;
  readonly days: Range;
  readonly more: number;
  readonly onMore: () => void;
  readonly timeZone: string;
}

// A page of the report, then the pages "Load more" opened, in one table.
const ReportPages = ({
  before,
  cursor,
  days,
  more,
  onMore,
  timeZone,
}: PagesProps) => {
  const t = useTranslations("Overview.report");
  const page = reportPage({ cursor, days, timeZone });
  const result = useAtomValue(page);
  const reload = useAtomRefresh(page);

  return AsyncResult.match(result, {
    onFailure: () => (
      <Alert variant="destructive">
        <AlertDescription>
          <span className="flex flex-wrap items-center justify-between gap-2">
            {t("loadFailed")}
            <Button variant="outline" size="sm" onClick={reload}>
              {t("reload")}
            </Button>
          </span>
        </AlertDescription>
      </Alert>
    ),
    onInitial: () => <Loading />,
    onSuccess: ({ value }) => {
      const workspaces = [...before, ...value.workspaces];
      const next = Option.fromNullOr(value.nextCursor);

      if (Option.isSome(next) && more > 0) {
        return (
          <ReportPages
            before={workspaces}
            cursor={next}
            days={days}
            more={more - 1}
            timeZone={timeZone}
            onMore={onMore}
          />
        );
      }

      if (workspaces.length === 0) {
        return <p className="text-muted-foreground">{t("empty")}</p>;
      }

      return (
        <>
          <ReportTableView
            from={value.from}
            linkTo={workspaceLink}
            to={value.to}
            workspaces={workspaces}
          />
          <p className="text-muted-foreground text-sm">
            {t("previous", value.previous)}
          </p>
          {Option.isSome(next) ? (
            <Button variant="outline" className="self-center" onClick={onMore}>
              {t("loadMore")}
            </Button>
          ) : null}
        </>
      );
    },
  });
};

// The report, in the reader's zone, which only the browser knows.
const ReportView = ({ timeZone }: { readonly timeZone: string }) => {
  const t = useTranslations("Overview.report");
  const rangeId = useId();
  const [days, setDays] = useState<Range>(defaultRange);
  const [more, setMore] = useState(0);

  const handleRange = (value: string | null) => {
    if (isRange(value)) {
      setDays(value);
      setMore(0);
    }
  };

  const handleMore = () => {
    setMore((current) => current + 1);
  };

  const download = `/api/me/report/export?${new URLSearchParams({ days, timeZone }).toString()}`;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">
        {t("description", { zone: timeZone.replaceAll("_", " ") })}
      </p>
      <p className="text-muted-foreground text-sm">{t("notComparable")}</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2 sm:w-xs">
          <Label id={rangeId}>{t("rangeLabel")}</Label>
          <Select value={days} onValueChange={handleRange}>
            <SelectTrigger aria-labelledby={rangeId}>
              <SelectValue>{t("range", { days: Number(days) })}</SelectValue>
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
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <a href={download} download>
              {t("download")}
            </a>
          }
        />
      </div>
      <ReportPages
        key={days}
        before={[]}
        cursor={Option.none()}
        days={days}
        more={more}
        timeZone={timeZone}
        onMore={handleMore}
      />
    </div>
  );
};

/**
 * The report across the person's workspaces. It is read with the
 * visitor's cookies and in their time zone, so it is drawn once the page
 * is in the browser.
 */
export const ReportScreen = () => {
  const mounted = useMounted();

  if (!mounted) {
    return <Loading />;
  }

  return <ReportView timeZone={summaryTimeZone(browserTimeZone())} />;
};
