"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
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
import { useState } from "react";

import {
  analyticsDashboard,
  analyticsSummary,
  exportUrl,
} from "#analytics/api.ts";
import {
  rangeEnding,
  ranges,
  RangeSchema,
  summaryTimeZone,
  todayIn,
} from "#analytics/report.ts";
import type { Range } from "#analytics/report.ts";
import { AccountNumbers } from "#components/analytics/account-numbers.tsx";
import { AnalyticsSummaryView } from "#components/analytics/analytics-summary.tsx";
import { BestTimesCard } from "#components/analytics/best-times.tsx";
import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import { workspaceChannels } from "#posts/api.ts";
import { useMounted } from "#posts/use-mounted.ts";
import { browserTimeZone } from "#posts/zoned-time.ts";

const decodeRange = Schema.decodeUnknownOption(RangeSchema);

const Loading = ({ label }: { readonly label: string }) => (
  <div aria-busy="true" className="flex flex-col gap-4">
    <span className="sr-only">{label}</span>
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
);

interface AnalyticsViewProps {
  readonly initialRange: Range;
  readonly timeZone: string;
  readonly workspaceId: string;
}

const AnalyticsView = ({
  initialRange,
  timeZone,
  workspaceId,
}: AnalyticsViewProps) => {
  const t = useTranslations("Analytics");
  const [range, setRange] = useState<Range>(initialRange);
  const asked = rangeEnding(todayIn(timeZone), range, timeZone);
  const summaryQuery = analyticsSummary(workspaceId, asked);
  const dashboardQuery = analyticsDashboard(workspaceId, asked);
  const channelsQuery = workspaceChannels(workspaceId);
  const summary = useAtomValue(summaryQuery);
  const dashboard = useAtomValue(dashboardQuery);
  const retryDashboard = useAtomRefresh(dashboardQuery);
  const channels = useAtomValue(channelsQuery);
  const retrySummary = useAtomRefresh(summaryQuery);
  const retryChannels = useAtomRefresh(channelsQuery);

  const body = (() => {
    if (
      AsyncResult.isFailure(summary) ||
      AsyncResult.isFailure(dashboard) ||
      AsyncResult.isFailure(channels)
    ) {
      return (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-sm">{t("page.loadFailed")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              retrySummary();
              retryDashboard();
              retryChannels();
            }}
          >
            {t("page.retry")}
          </Button>
        </div>
      );
    }

    if (
      !AsyncResult.isSuccess(summary) ||
      !AsyncResult.isSuccess(dashboard) ||
      !AsyncResult.isSuccess(channels)
    ) {
      return <Loading label={t("page.loading")} />;
    }

    return (
      <InTimeZone timeZone={timeZone}>
        <div className="flex flex-col gap-10">
          <AccountNumbers
            channels={channels.value}
            dashboard={dashboard.value}
            exports={{
              accounts: exportUrl(workspaceId, "accounts", asked),
              posts: exportUrl(workspaceId, "posts", asked),
            }}
          />
          <AnalyticsSummaryView
            channels={channels.value}
            summary={summary.value}
            workspaceId={workspaceId}
          />
          <BestTimesCard
            channels={channels.value}
            timeZone={timeZone}
            workspaceId={workspaceId}
          />
        </div>
      </InTimeZone>
    );
  })();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("page.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("page.description", { zone: timeZone.replaceAll("_", " ") })}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label id="analytics-range-label">{t("page.rangeLabel")}</Label>
        <Select
          value={range}
          onValueChange={(value) => {
            const picked = decodeRange(value);

            if (Option.isSome(picked)) {
              setRange(picked.value);
            }
          }}
        >
          <SelectTrigger aria-labelledby="analytics-range-label">
            <SelectValue>
              {t("page.range", { days: Number(range) })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ranges.map((choice) => (
              <SelectItem key={choice} value={choice}>
                {t("page.range", { days: Number(choice) })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {body}
    </div>
  );
};

interface AnalyticsScreenProps {
  readonly initialRange: Range;
  readonly workspaceId: string;
}

// The analytics render in the browser, where the reader's time zone, and
// so the days of the range, are known: UTC's when the browser cannot tell.
export const AnalyticsScreen = (props: AnalyticsScreenProps) => {
  const t = useTranslations("Analytics");
  const mounted = useMounted();

  if (!mounted) {
    return <Loading label={t("page.loading")} />;
  }

  return (
    <AnalyticsView {...props} timeZone={summaryTimeZone(browserTimeZone())} />
  );
};
