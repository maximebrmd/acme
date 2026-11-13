"use client";

import { useTranslations } from "next-intl";

/**
 * What a search of the library found, said in a status region (`output`), so a
 * screen reader hears it as the list changes: how many files the first
 * page shows, and whether more follow, or that none matches. Nothing
 * while the whole library is listed.
 */
export const SearchStatus = ({
  count,
  more,
  narrowed,
}: {
  readonly count: number;
  readonly more: boolean;
  readonly narrowed: boolean;
}) => {
  const t = useTranslations("Media.library");

  if (!narrowed) {
    return <output className="sr-only" />;
  }

  return (
    <output className="sr-only">
      {count === 0
        ? t("noMatch")
        : t("resultsShown", { count, more: String(more) })}
    </output>
  );
};
