"use client";

import { Match } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type { Platform } from "peal-contract";

import type { AiLabels } from "#components/posts/use-ai-labels.ts";

/**
 * Says the post shows media made by AI, on which platforms its AI label is
 * on and on which it is not, and when a label Peal turned on outlived the
 * media that called for it.
 */
export const AiLabelsNotice = ({ labels }: { readonly labels: AiLabels }) => {
  const t = useTranslations("PostMedia");
  const tPosts = useTranslations("Posts");
  const format = useFormatter();

  const named = (platforms: readonly Platform[]) =>
    format.list(
      platforms.map((platform) => tPosts("platform", { platform })),
      { type: "conjunction" }
    );

  const lines = Match.valueTags(labels.notice, {
    leftOn: ({ platforms }) => [
      t("aiLabelsLeftOn", { platforms: named(platforms) }),
    ],
    madeByAi: ({ off, on }) =>
      on.length === 0 && off.length === 0
        ? [t("aiMediaNoLabel")]
        : [
            ...(on.length === 0
              ? []
              : [
                  labels.writable
                    ? t("aiLabelsPreset", { platforms: named(on) })
                    : t("aiLabelsOn", { platforms: named(on) }),
                ]),
            ...(off.length === 0
              ? []
              : [t("aiLabelsOff", { platforms: named(off) })]),
          ],
    none: (): readonly string[] => [],
  });

  return lines.length === 0 ? null : (
    <div className="text-muted-foreground flex flex-col gap-1 text-sm">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
};
