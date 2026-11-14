"use client";

import { useTranslations } from "next-intl";
import type { MediaUsage } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import type { ReactNode } from "react";

/**
 * What deleting the media would do to the posts and articles that show
 * it: refused while scheduled posts show it, each with its link from
 * `postLinks`, in order, or scheduled articles; drafts lose it, and
 * articles keep its id, which their sending then refuses.
 */
export const MediaUsageNotice = ({
  postLinks,
  usage,
}: {
  readonly postLinks: readonly ReactNode[];
  readonly usage: MediaUsage;
}) => {
  const t = useTranslations("Media.library");

  if (usage.scheduledArticles.length > 0 && usage.scheduled.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {t("inUseArticles", { count: usage.scheduledArticles.length })}
        </AlertDescription>
      </Alert>
    );
  }

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

  if (usage.drafts.length === 0 && usage.draftArticles.length === 0) {
    return null;
  }

  return (
    <Alert>
      <AlertDescription>
        {usage.drafts.length > 0
          ? t("draftsLose", { count: usage.drafts.length })
          : null}{" "}
        {usage.draftArticles.length > 0
          ? t("draftArticlesKeep", { count: usage.draftArticles.length })
          : null}
      </AlertDescription>
    </Alert>
  );
};
