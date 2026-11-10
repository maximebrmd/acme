"use client";

import { useTranslations } from "next-intl";
import type { Post, Tag } from "peal-contract";
import type { ReactNode } from "react";

import { TagList } from "#components/tags/tag-views.tsx";

/** What a draft is called in the list: the start of its text. */
export const useDraftTitle = (post: Post): string => {
  const t = useTranslations("Drafts");
  const text = post.content.text.trim();

  return text === "" ? t("noText") : text;
};

const noTags: readonly Tag[] = [];

/**
 * One draft: its title (`children`, which links it to the composer), then
 * how many channels it goes to and what it shows, and its tags.
 */
export const DraftItemView = ({
  children,
  post,
  tags = noTags,
}: {
  readonly children: ReactNode;
  readonly post: Post;
  /** The post's tags, among the workspace's. */
  readonly tags?: readonly Tag[];
}) => {
  const t = useTranslations("Drafts");

  return (
    <li className="flex flex-col gap-1 rounded-lg border p-4">
      {children}
      <p className="text-muted-foreground text-xs">
        {t("channels", { count: post.targets.length })} ·{" "}
        {t("media", { count: post.content.media.length })}
      </p>
      <TagList label={t("tags")} tags={tags} />
    </li>
  );
};
