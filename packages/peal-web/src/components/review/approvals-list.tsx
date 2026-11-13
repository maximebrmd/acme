"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { Link } from "#i18n/navigation.ts";
import { pendingApprovals, reviewSettings } from "#review/api.ts";

import { ApprovalItemView } from "./approvals-list-view.tsx";

/**
 * The "Needs approval" view: the workspace's policy, in a sentence, then
 * the posts that wait. It renders in the browser, where the reader's time
 * zone is known.
 */
export const ApprovalsList = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Review");
  const hydrated = useHydrated();
  const query = pendingApprovals(workspaceId);
  const result = useAtomValue(query);
  const reload = useAtomRefresh(query);
  const settings = useAtomValue(reviewSettings(workspaceId));

  if (!hydrated || AsyncResult.isInitial(result)) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <span className="sr-only">{t("approvals.loading")}</span>
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (AsyncResult.isFailure(result)) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <span className="flex flex-wrap items-center justify-between gap-2">
            {t("approvals.loadFailed")}
            <Button variant="outline" size="sm" onClick={reload}>
              {t("retry")}
            </Button>
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {AsyncResult.isSuccess(settings) ? (
        <p className="text-muted-foreground text-sm">
          {t("approvals.policy", { policy: settings.value.approvalPolicy })}
        </p>
      ) : null}
      {result.value.length === 0 ? (
        <p className="text-muted-foreground">{t("approvals.empty")}</p>
      ) : (
        <ul className="bg-card divide-y overflow-hidden rounded-md border">
          {result.value.map((approval) => (
            <ApprovalItemView key={approval.id} approval={approval}>
              <Link
                href={`/app/${workspaceId}/posts/${approval.postId}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {t("approvals.open")}
              </Link>
            </ApprovalItemView>
          ))}
        </ul>
      )}
    </div>
  );
};
