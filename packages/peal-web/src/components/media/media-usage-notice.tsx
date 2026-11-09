"use client";

import { useTranslations } from "next-intl";
import type { MediaUsage } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import type { ReactNode } from "react";

/**
 * What deleting the media would do to the posts that show it: refused while
 * scheduled posts show it, each with its link from `postLinks`, in order;
 * drafts lose it.
 */
export const MediaUsageNotice = ({
  postLinks,
  usage,
}: {
  readonly postLinks: readonly ReactNode[];
  readonly usage: MediaUsage;
}) => {
  const t = useTranslations("Media.library");

  if (usage.scheduled.length > 0) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <div className="flex flex-col gap-2">
            <p>{t("inUse", { count: usage.scheduled.length })}</p>
            <ul className="flex flex-col gap-1">
              {usage.scheduled.map((postId, index) => (
                <li key={postId}>{postLinks[index]}</li>
              ))}
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return usage.drafts.length > 0 ? (
    <Alert>
      <AlertDescription>
        {t("draftsLose", { count: usage.drafts.length })}
      </AlertDescription>
    </Alert>
  ) : null;
};
