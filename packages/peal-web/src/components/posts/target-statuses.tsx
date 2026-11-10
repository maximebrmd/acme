"use client";

import { useTranslations } from "next-intl";
import type { Channel, Post } from "peal-contract";
import { Badge } from "peal-ui/components/badge";

import { channelName } from "#channels/channel-name.ts";

interface TargetStatusesProps {
  readonly channels: readonly Channel[];
  readonly post: Post;
}

// Where the post is on each of its channels.
export const TargetStatuses = ({ channels, post }: TargetStatusesProps) => {
  const t = useTranslations("Posts");

  return (
    <ul className="flex flex-col gap-2">
      {post.targets.map((target) => {
        const channel = channels.find(({ id }) => id === target.channelId);

        return (
          <li
            key={target.id}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span>
              {channel === undefined
                ? t("disconnectedChannel")
                : channelName(channel)}
            </span>
            <Badge
              variant={target.status === "failed" ? "destructive" : "outline"}
            >
              {t("targetStatus", { status: target.status })}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
};
