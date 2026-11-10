"use client";

import { useTranslations } from "next-intl";

/**
 * Tells, in a status region that is always on the page, that scheduling
 * stopped once the default signatures were added: the post is saved as a
 * draft, and the person checks it before choosing the action again.
 */
export const SignaturePause = ({
  shown,
  willWait,
}: {
  readonly shown: boolean;
  /** Whether what this member schedules waits for an approval. */
  readonly willWait: boolean;
}) => {
  const t = useTranslations("Signatures");
  const tComposer = useTranslations("Posts.Composer");

  return (
    <output className="text-sm font-medium empty:hidden">
      {shown
        ? t("addedCheck", {
            action: tComposer(willWait ? "askApproval" : "schedule"),
          })
        : null}
    </output>
  );
};
