"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
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
  rangeEnding,
  ranges,
  RangeSchema,
  todayIn,
} from "#analytics/report.ts";
import type { Range } from "#analytics/report.ts";
import { usageOf } from "#billing/api.ts";
import { WorkspaceUsageHistory } from "#components/billing/usage-history.tsx";

const decodeRange = Schema.decodeUnknownOption(RangeSchema);

// The last `range` UTC days, today included, as the usage counts them.
const periodOf = (range: Range) => {
  const { from, to } = rangeEnding(todayIn("UTC"), range, "UTC");

  return { from, to };
};

const Loaded = ({
  range,
  workspaceId,
}: {
  readonly range: Range;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Billing.usage.history");
  const query = usageOf(workspaceId, periodOf(range));
  const report = useAtomValue(query);
  const retry = useAtomRefresh(query);

  if (AsyncResult.isSuccess(report)) {
    return <WorkspaceUsageHistory report={report.value} />;
  }

  return AsyncResult.isFailure(report) ? (
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
 * The billing page's usage by day: the last 7, 30 or 90 UTC days, read by
 * the browser with the member's session. It renders after hydration, as
 * the billing page does, since today is the browser's.
 */
export const UsageHistoryScreen = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Billing.usage.history");
  const [range, setRange] = useState<Range>(defaultRange);
  const labelId = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label id={labelId}>{t("rangeLabel")}</Label>
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
          <Loaded range={range} workspaceId={workspaceId} />
        </div>
      </CardContent>
    </Card>
  );
};
