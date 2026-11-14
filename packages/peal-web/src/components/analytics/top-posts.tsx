"use client";

import { useAtomValue } from "@effect/atom-react";
import { DateTime, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTranslations } from "next-intl";
import type { SocialChannel, TopPost } from "peal-contract";

import { channelName } from "#channels/channel-name.ts";
import { MetricList } from "#components/analytics/metric-list.tsx";
import { Link } from "#i18n/navigation.ts";
import { workspacePost } from "#posts/api.ts";

// The first line of the post, once it is loaded; nothing if it cannot be.
const PostExcerpt = ({
  postId,
  workspaceId,
}: {
  readonly postId: string;
  readonly workspaceId: string;
}) => {
  const result = useAtomValue(workspacePost(workspaceId, postId));

  const text = AsyncResult.value(result).pipe(
    Option.map((post) => post.content.text.split("\n")[0]?.trim() ?? ""),
    Option.filter((line) => line !== "")
  );

  return Option.match(text, {
    onNone: () => null,
    onSome: (line) => <p className="line-clamp-2 text-sm">{line}</p>,
  });
};

interface TopPostsProps {
  readonly channels: readonly SocialChannel[];
  readonly posts: readonly TopPost[];
  readonly workspaceId: string;
}

/** The range's posts people did the most with, first the most. */
export const TopPosts = ({ channels, posts, workspaceId }: TopPostsProps) => {
  const t = useTranslations("Analytics");
  const tPosts = useTranslations("Posts");
  const format = useFormatter();

  if (posts.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("top.empty")}</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {posts.map((post) => {
        const channel = channels.find(({ id }) => id === post.channelId);

        return (
          <li
            key={post.targetId}
            className="flex flex-col gap-2 rounded-lg border p-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">
                {channel === undefined
                  ? tPosts("disconnectedChannel")
                  : channelName(channel)}
              </span>
              <span className="text-muted-foreground">
                {t("top.publishedAt", {
                  at: format.dateTime(DateTime.toDate(post.publishedAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })}
              </span>
            </div>
            <PostExcerpt postId={post.postId} workspaceId={workspaceId} />
            <p className="text-sm font-medium">
              {t("top.engagement", { count: post.engagement })}
            </p>
            <MetricList counts={post.metrics} />
            <div className="flex flex-wrap gap-4 text-sm">
              <Link
                href={`/app/${workspaceId}/posts/${post.postId}`}
                className="underline-offset-4 hover:underline"
              >
                {t("top.open")}
              </Link>
              {post.permalink === null ? null : (
                <a
                  href={post.permalink}
                  rel="noreferrer"
                  target="_blank"
                  className="underline-offset-4 hover:underline"
                >
                  {t("top.view", {
                    platform: channel?.platform ?? "other",
                  })}
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
