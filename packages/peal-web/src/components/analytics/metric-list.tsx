"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { PostMetrics } from "peal-contract";

type Metric = keyof PostMetrics;

const metrics: readonly Metric[] = [
  "likes",
  "reposts",
  "replies",
  "quotes",
  "impressions",
  "reach",
  "clicks",
  "saves",
];

/**
 * A post's counts, each named: quotes, impressions, reach, clicks and
 * saves only where the platform gives them.
 */
export const MetricList = ({ counts }: { readonly counts: PostMetrics }) => {
  const t = useTranslations("Analytics");
  const format = useFormatter();

  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {metrics.flatMap((metric) => {
        const value = counts[metric];

        return value === null
          ? []
          : [
              <div key={metric} className="flex gap-1">
                <dt className="text-muted-foreground">
                  {t("metric", { metric })}
                </dt>
                <dd className="font-medium tabular-nums">
                  {format.number(value)}
                </dd>
              </div>,
            ];
      })}
    </dl>
  );
};
