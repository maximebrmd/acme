"use client";

import { useFormatter, useTranslations } from "next-intl";

import type { AiLabels } from "#components/posts/use-ai-labels.ts";

/**
 * Says the post shows media made by AI, and on which platforms Peal turned
 * the AI label on, which the member may turn off in the channel's options.
 */
export const AiLabelsNotice = ({ labels }: { readonly labels: AiLabels }) => {
  const t = useTranslations("PostMedia");
  const tPosts = useTranslations("Posts");
  const format = useFormatter();

  if (!labels.madeByAi) {
    return null;
  }

  return (
    <p className="text-muted-foreground text-sm">
      {labels.platforms.length === 0
        ? t("aiMediaNoLabel")
        : t("aiLabelsPreset", {
            platforms: format.list(
              labels.platforms.map((platform) =>
                tPosts("platform", { platform })
              ),
              { type: "conjunction" }
            ),
          })}
    </p>
  );
};
