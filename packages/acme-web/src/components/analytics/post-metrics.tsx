"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { Channel, Post, PostAnalytics } from "acme-contract";
import { Button } from "acme-ui/components/button";
import { Skeleton } from "acme-ui/components/skeleton";
import { DateTime } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTranslations } from "next-intl";

import { postAnalytics } from "#analytics/api.ts";
import { MetricList } from "#components/analytics/metric-list.tsx";
import { ReadingsChart } from "#components/analytics/readings-chart.tsx";
import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import { browserTimeZone } from "#posts/zoned-time.ts";

interface PostMetricsViewProps {
  readonly analytics: PostAnalytics;
  readonly channels: readonly Channel[];
}

/**
 * What a post's channels counted: each one's latest counts, when they were
 * read, and how they went over time. Before the first read, says when the
 * counts come.
 */
export const PostMetricsView = ({
  analytics,
  channels,
}: PostMetricsViewProps) => {
  const t = useTranslations("Analytics");
  const tPosts = useTranslations("Posts");
  const format = useFormatter();

  if (analytics.targets.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("post.notYet")}</p>;
  }

  return (
    <ul className="flex flex-col gap-6">
      {analytics.targets.map((target) => {
        const handle =
          channels.find(({ id }) => id === target.channelId)?.handle ??
          tPosts("disconnectedChannel");

        return (
          <li key={target.targetId} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{handle}</span>
              <span className="text-muted-foreground">
                {target.lastCollectedAt === null
                  ? t("post.notRead")
                  : t("post.readAt", {
                      at: format.dateTime(
                        DateTime.toDate(target.lastCollectedAt),
                        { dateStyle: "medium", timeStyle: "short" }
                      ),
                    })}
              </span>
            </div>
            {target.latest === null ? (
              <p className="text-muted-foreground text-sm">
                {t("post.notYet")}
              </p>
            ) : (
              <MetricList counts={target.latest} />
            )}
            {target.snapshots.length > 1 ? (
              <ReadingsChart handle={handle} snapshots={target.snapshots} />
            ) : null}
            {target.collecting ? null : (
              <p className="text-muted-foreground text-sm">
                {t("post.stopped")}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
};

interface PostMetricsProps {
  readonly channels: readonly Channel[];
  readonly post: Post;
  readonly workspaceId: string;
}

/**
 * The post's analytics, on its page, once it went live on a channel. It
 * renders in the browser, in the reader's time zone.
 */
export const PostMetrics = ({
  channels,
  post,
  workspaceId,
}: PostMetricsProps) => {
  const t = useTranslations("Analytics");
  const query = postAnalytics(workspaceId, post.id);
  const result = useAtomValue(query);
  const retry = useAtomRefresh(query);

  const body = (() => {
    if (AsyncResult.isFailure(result)) {
      return (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-sm">{t("post.loadFailed")}</p>
          <Button variant="outline" size="sm" onClick={retry}>
            {t("page.retry")}
          </Button>
        </div>
      );
    }

    if (!AsyncResult.isSuccess(result)) {
      return (
        <div aria-busy="true">
          <span className="sr-only">{t("post.loading")}</span>
          <Skeleton className="h-16 w-full" />
        </div>
      );
    }

    return (
      <InTimeZone timeZone={browserTimeZone()}>
        <PostMetricsView analytics={result.value} channels={channels} />
      </InTimeZone>
    );
  })();

  return (
    <section
      aria-labelledby="post-metrics-title"
      className="flex flex-col gap-3"
    >
      <h2 id="post-metrics-title" className="text-sm font-medium">
        {t("post.title")}
      </h2>
      {body}
    </section>
  );
};
