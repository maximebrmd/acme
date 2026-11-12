"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { Channel } from "peal-contract";
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

import { bestTimes } from "#analytics/api.ts";
import { channelName } from "#channels/channel-name.ts";

import { BestTimesView } from "./best-times-view.tsx";

const periods = ["30", "90", "180"] as const;

type Period = (typeof periods)[number];

const days = { "180": 180, "30": 30, "90": 90 } as const;

const isPeriod = (value: string | null): value is Period =>
  periods.some((period) => period === value);

const Found = ({
  channelId,
  period,
  timeZone,
  workspaceId,
}: {
  readonly channelId: string;
  readonly period: Period;
  readonly timeZone: string;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Analytics.bestTimes");
  const query = bestTimes(workspaceId, channelId, days[period], timeZone);
  const result = useAtomValue(query);
  const retry = useAtomRefresh(query);

  return AsyncResult.match(result, {
    onFailure: () => (
      <div className="flex flex-col items-start gap-3" role="alert">
        <p className="text-sm">{t("loadFailed")}</p>
        <Button variant="outline" size="sm" onClick={retry}>
          {t("retry")}
        </Button>
      </div>
    ),
    onInitial: () => (
      <div aria-busy="true">
        <span className="sr-only">{t("loading")}</span>
        <Skeleton className="h-40 w-full" />
      </div>
    ),
    onSuccess: ({ value }) => <BestTimesView found={value} />,
  });
};

/**
 * When one of the workspace's channels did best, which the member picks:
 * the past of that channel alone, as counts of different platforms are
 * never compared.
 */
export const BestTimesCard = ({
  channels,
  timeZone,
  workspaceId,
}: {
  readonly channels: readonly Channel[];
  readonly timeZone: string;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Analytics.bestTimes");
  const channelLabel = useId();
  const periodLabel = useId();
  const [first] = channels;
  const [chosen, setChosen] = useState(first?.id ?? "");
  const [period, setPeriod] = useState<Period>("90");
  const channel = channels.find(({ id }) => id === chosen);

  if (first === undefined) {
    return null;
  }

  const handleChannel = (value: string | null) => {
    if (value !== null) {
      setChosen(value);
    }
  };

  const handlePeriod = (value: string | null) => {
    if (isPeriod(value)) {
      setPeriod(value);
    }
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="best-times">
      <div className="flex flex-col gap-1">
        <h2 id="best-times" className="text-xl font-semibold">
          {t("title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-2 sm:w-xs">
          <Label id={channelLabel}>{t("channel")}</Label>
          <Select value={chosen} onValueChange={handleChannel}>
            <SelectTrigger aria-labelledby={channelLabel}>
              <SelectValue>
                {channel === undefined ? chosen : channelName(channel)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {channels.map((each) => (
                <SelectItem key={each.id} value={each.id}>
                  {channelName(each)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 sm:w-48">
          <Label id={periodLabel}>{t("daysLabel")}</Label>
          <Select value={period} onValueChange={handlePeriod}>
            <SelectTrigger aria-labelledby={periodLabel}>
              <SelectValue>{t("days", { days: days[period] })}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {periods.map((each) => (
                <SelectItem key={each} value={each}>
                  {t("days", { days: days[each] })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Found
        key={`${chosen}:${period}`}
        channelId={chosen}
        period={period}
        timeZone={timeZone}
        workspaceId={workspaceId}
      />
    </section>
  );
};
