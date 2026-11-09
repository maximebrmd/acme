"use client";

import type { Post } from "acme-contract";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/** What a draft is called in the list: the start of its text. */
export const useDraftTitle = (post: Post): string => {
  const t = useTranslations("Drafts");
  const text = post.content.text.trim();

  return text === "" ? t("noText") : text;
};

/**
 * One draft: its title (`children`, which links it to the composer), then
 * how many channels it goes to and what it shows.
 */
export const DraftItemView = ({
  children,
  post,
}: {
  readonly children: ReactNode;
  readonly post: Post;
}) => {
  const t = useTranslations("Drafts");

  return (
    <li className="flex flex-col gap-1 rounded-lg border p-4">
      {children}
      <p className="text-muted-foreground text-xs">
        {t("channels", { count: post.targets.length })} ·{" "}
        {t("media", { count: post.content.media.length })}
      </p>
    </li>
  );
};
