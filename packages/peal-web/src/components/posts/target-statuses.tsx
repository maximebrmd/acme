"use client";

import type { Channel, Post } from "peal-contract";
import { Badge } from "peal-ui/components/badge";
import { useTranslations } from "next-intl";

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
            <span>{channel?.handle ?? t("disconnectedChannel")}</span>
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
