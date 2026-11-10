"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { DateTime } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTranslations } from "next-intl";
import { countedPlatforms } from "peal-contract";
import type { Channel, Platform, Post, PostAnalytics } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";

import { postAnalytics } from "#analytics/api.ts";
import { channelName } from "#channels/channel-name.ts";
import { MetricList } from "#components/analytics/metric-list.tsx";
import { ReadingsChart } from "#components/analytics/readings-chart.tsx";
import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import { browserTimeZone } from "#posts/zoned-time.ts";

interface PostMetricsViewProps {
  readonly analytics: PostAnalytics;
  readonly channels: readonly Channel[];
  /** The channels the post went live on. */
  readonly publishedOn: readonly string[];
}

const isCountedPlatform = (platform: Platform) =>
  countedPlatforms.some((counted) => counted === platform);

// On LinkedIn, Peal reads the counts of company pages only.
const isCounted = ({ connection, platform }: Channel) =>
  isCountedPlatform(platform) &&
  (platform !== "linkedin" || connection === "linkedinPage");

/**
 * What a post's channels counted: each one's latest counts, when they were
 * read, and how they went over time. Before the first read, says when the
 * counts come, and for the platforms Peal reads no counts on, that it has
 * none.
 */
export const PostMetricsView = ({
  analytics,
  channels,
  publishedOn,
}: PostMetricsViewProps) => {
  const t = useTranslations("Analytics");
  const tPosts = useTranslations("Posts");
  const format = useFormatter();

  // The channels the post went live on, where they are still known.
  const publishedChannels = publishedOn.map((channelId) =>
    channels.find(({ id }) => id === channelId)
  );

  const uncounted = [
    ...new Set(
      publishedChannels.flatMap((channel) =>
        channel === undefined || isCounted(channel) ? [] : [channel.platform]
      )
    ),
  ];

  // The platforms Peal reads counts on, as the reader's language lists them.
  const counted = format.list(
    countedPlatforms.map((platform) =>
      t("post.countedName", {
        name: tPosts("platform", { platform }),
        platform,
      })
    ),
    { type: "conjunction" }
  );

  const note =
    uncounted.length === 0 ? null : (
      <p className="text-muted-foreground text-sm">
        {t("post.uncounted", {
          counted,
          platforms: format.list(
            uncounted.map((platform) =>
              t("post.uncountedName", {
                name: tPosts("platform", { platform }),
                platform,
              })
            ),
            { type: "conjunction" }
          ),
        })}
      </p>
    );

  if (analytics.targets.length === 0) {
    // Counts may still come from a channel Peal reads, or one since
    // disconnected, which it can no longer tell.
    const mayCome = publishedChannels.some(
      (channel) => channel === undefined || isCounted(channel)
    );

    return (
      <div className="flex flex-col gap-2">
        {mayCome || note === null ? (
          <p className="text-muted-foreground text-sm">
            {t("post.notYet", { counted })}
          </p>
        ) : null}
        {note}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-6">
        {analytics.targets.map((target) => {
          const channel = channels.find(({ id }) => id === target.channelId);

          const handle =
            channel === undefined
              ? tPosts("disconnectedChannel")
              : channelName(channel);

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
                  {t("post.notYet", { counted })}
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
      {note}
    </div>
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
        <PostMetricsView
          analytics={result.value}
          channels={channels}
          publishedOn={post.targets.flatMap(({ channelId, status }) =>
            status === "published" ? [channelId] : []
          )}
        />
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
