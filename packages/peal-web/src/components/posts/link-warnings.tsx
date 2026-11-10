"use client";

import { useTranslations } from "next-intl";

import { suspiciousLinks } from "#posts/link-check.ts";

/**
 * What in the post's texts looks like a link and would not work as one,
 * said as the person types. It is advice: nothing waits for it.
 */
export const LinkWarnings = ({
  texts,
}: {
  /** The post's text, and the texts it has instead on some channels. */
  readonly texts: readonly string[];
}) => {
  const t = useTranslations("Posts.Links");
  const pieces = [...new Set(texts.flatMap(suspiciousLinks))];

  return (
    <output aria-live="polite" className="text-muted-foreground text-xs">
      {pieces.length === 0 ? null : (
        <ul className="flex flex-col gap-1">
          {pieces.map((piece) => (
            <li key={piece} className="break-all">
              {t("suspicious", { link: piece })}
            </li>
          ))}
        </ul>
      )}
    </output>
  );
};
