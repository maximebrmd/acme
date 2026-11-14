"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { inboxReviewRetentionDays, isSocialChannel } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { useId } from "react";

import { channelsOf } from "#channels/channels-api.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { Link } from "#i18n/navigation.ts";
import { reviewLocations } from "#inbox/review-atoms.ts";
import { useRefreshWhileVisible } from "#notices/use-refresh-while-visible.ts";

import { ReviewThreadRowView } from "./review-views.tsx";

// How often the list is read again while its tab is visible: reviews come
// slowly, and Peal reads them hourly.
const refreshEvery = 300_000;

const appLink = (href: string, label: string) => (
  <Link href={href} className="underline-offset-4 hover:underline">
    {label}
  </Link>
);

/**
 * The workspace's locations with reviews, those with a review waiting
 * first, beside the comments. Nothing shows while the workspace has none,
 * as on a server whose inbox does not read Google Business Profile.
 */
export const ReviewsList = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const t = useTranslations("InboxReviews");
  const hydrated = useHydrated();
  const page = reviewLocations(workspaceId);
  const result = useAtomValue(page);
  const reload = useAtomRefresh(page);
  const channels = useAtomValue(channelsOf(workspaceId));
  const titleId = useId();

  useRefreshWhileVisible(reload, refreshEvery);

  if (!hydrated) {
    return null;
  }

  const known = AsyncResult.isSuccess(channels)
    ? channels.value.filter(isSocialChannel)
    : [];

  return AsyncResult.match(result, {
    onFailure: () => (
      <Alert variant="destructive">
        <AlertDescription>
          <span className="flex flex-wrap items-center justify-between gap-2">
            {t("loadFailed")}
            <Button variant="outline" size="sm" onClick={reload}>
              {t("retry")}
            </Button>
          </span>
        </AlertDescription>
      </Alert>
    ),
    onInitial: () => null,
    onSuccess: ({ value }) =>
      value.items.length === 0 ? null : (
        <section aria-labelledby={titleId} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-lg font-semibold">
              {t("title")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("description", { days: inboxReviewRetentionDays })}
            </p>
          </div>
          <ul className="bg-card divide-y overflow-hidden rounded-md border">
            {value.items.map((thread) => (
              <ReviewThreadRowView
                key={thread.id}
                channel={known.find(({ id }) => id === thread.channelId)}
                link={appLink}
                thread={thread}
                workspaceId={workspaceId}
              />
            ))}
          </ul>
        </section>
      ),
  });
};
