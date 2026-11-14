"use client";

import { useTranslations } from "next-intl";
import type { Poll } from "peal-contract";

/**
 * A poll a post asks, as it reads: its choices in order, how long it
 * stays open, and whether readers pick several. An approval covers it.
 */
export const PollView = ({ poll }: { readonly poll: Poll }) => {
  const t = useTranslations("Posts.Poll");

  return (
    <section aria-label={t("legend")} className="flex flex-col gap-1">
      <p className="text-sm font-medium">{t("legend")}</p>
      <ol className="list-decimal pl-5 text-sm">
        {poll.choices.map((choice, index) => (
          // Choices have no id: their place names them.
          <li key={`choice-${String(index + 1)}`} dir="auto">
            {choice}
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground text-xs">
        {t("shown", {
          duration: t("durationValue", { minutes: poll.durationMinutes }),
          multiple: poll.multipleChoice === true ? "yes" : "no",
        })}
      </p>
    </section>
  );
};
