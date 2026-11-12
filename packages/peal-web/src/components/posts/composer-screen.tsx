"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { DateTime } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { Channel, Permission } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";
import { useCallback } from "react";

import { Composer } from "#components/posts/composer.tsx";
import { DuplicatePost } from "#components/posts/duplicate-post.tsx";
import { PostDetail } from "#components/posts/post-detail.tsx";
import { PostLinks } from "#components/posts/post-links.tsx";
import { PostRepeat } from "#components/recycling/post-repeat.tsx";
import { PostReviewSection } from "#components/review/post-review-section.tsx";
import { Link } from "#i18n/navigation.ts";
import { useRefreshWhileVisible } from "#notices/use-refresh-while-visible.ts";
import { workspaceChannels, workspacePost } from "#posts/api.ts";
import { isDue } from "#posts/publish-now.ts";
import { useMounted } from "#posts/use-mounted.ts";
import { reviewSettings } from "#review/api.ts";

interface ComposerScreenProps {
  readonly permissions: readonly Permission[];
  /** None for a new post. */
  readonly postId: string | undefined;
  /**
   * Where a new post's schedule starts, as the calendar's `?at=` wrote it;
   * the composer ignores a value that names no time to come.
   */
  readonly startAt?: string | undefined;
  /** The signed-in user. */
  readonly userId: string;
  readonly workspaceId: string;
}

const Loading = ({ label }: { readonly label: string }) => (
  <div className="flex flex-col gap-4" aria-busy="true">
    <span className="sr-only">{label}</span>
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);

const Failed = ({
  label,
  onRetry,
}: {
  readonly label: string;
  readonly onRetry: () => void;
}) => {
  const t = useTranslations("Posts.Composer");

  return (
    <div className="flex flex-col items-start gap-3" role="alert">
      <p className="text-sm">{label}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
};

// The workspace's approval policy, or none while it is not known: the
// composer then asks for no approval the server would not take, and
// offers nothing that only holds where posts never wait.
const useApprovalPolicy = (workspaceId: string) => {
  const settings = useAtomValue(reviewSettings(workspaceId));

  return AsyncResult.isSuccess(settings)
    ? settings.value.approvalPolicy
    : undefined;
};

// While a scheduled post is due, how often its page asks whether it went
// out: PostDetail takes over once it is publishing.
const refreshWhileDue = 5000;

const ExistingPost = ({
  channels,
  permissions,
  postId,
  userId,
  workspaceId,
}: ComposerScreenProps & {
  readonly channels: readonly Channel[];
  readonly postId: string;
}) => {
  const t = useTranslations("Posts.Composer");
  const query = workspacePost(workspaceId, postId);
  const result = useAtomValue(query);
  const retry = useAtomRefresh(query);
  const approvalPolicy = useApprovalPolicy(workspaceId);
  const tAds = useTranslations("Ads.boost");

  const refreshDue = useCallback(() => {
    if (
      AsyncResult.isSuccess(result) &&
      isDue(result.value, DateTime.nowUnsafe())
    ) {
      retry();
    }
  }, [result, retry]);

  useRefreshWhileVisible(refreshDue, refreshWhileDue);

  if (AsyncResult.isSuccess(result)) {
    const post = result.value;

    // Once it went out, or was cancelled, the page tells how it went.
    return post.status === "draft" ||
      post.status === "awaitingApproval" ||
      post.status === "scheduled" ? (
      <div className="flex flex-col gap-6">
        <Composer
          key={post.id}
          approvalPolicy={approvalPolicy}
          channels={channels}
          permissions={permissions}
          post={post}
          userId={userId}
          workspaceId={workspaceId}
        />
        <PostRepeat
          permissions={permissions}
          post={post}
          workspaceId={workspaceId}
        />
        <PostReviewSection
          permissions={permissions}
          post={post}
          workspaceId={workspaceId}
        />
      </div>
    ) : (
      <div className="flex flex-col gap-6">
        <PostDetail
          actions={
            <DuplicatePost
              permissions={permissions}
              postId={post.id}
              workspaceId={workspaceId}
            />
          }
          adsLink={
            <Button
              variant="outline"
              render={<Link href={`/app/${workspaceId}/ads`} />}
              nativeButton={false}
            >
              {tAds("toAds")}
            </Button>
          }
          channels={channels}
          permissions={permissions}
          post={post}
          userId={userId}
          workspaceId={workspaceId}
        />
        {post.shortenLinks && permissions.includes("analytics:read") ? (
          <PostLinks
            channels={channels}
            postId={post.id}
            workspaceId={workspaceId}
          />
        ) : null}
        <PostRepeat
          permissions={permissions}
          post={post}
          workspaceId={workspaceId}
        />
        <PostReviewSection
          permissions={permissions}
          post={post}
          workspaceId={workspaceId}
        />
      </div>
    );
  }

  return AsyncResult.isFailure(result) ? (
    <Failed label={t("loadFailed")} onRetry={retry} />
  ) : (
    <Loading label={t("loading")} />
  );
};

// The composer, once the workspace's channels and the post are loaded, or
// for a post that went out, how it went. It renders in the browser only,
// where the user's time zone is known.
export const ComposerScreen = ({
  permissions,
  postId,
  startAt,
  userId,
  workspaceId,
}: ComposerScreenProps) => {
  const t = useTranslations("Posts.Composer");
  const mounted = useMounted();
  const query = workspaceChannels(workspaceId);
  const channels = useAtomValue(query);
  const retry = useAtomRefresh(query);
  const approvalPolicy = useApprovalPolicy(workspaceId);

  const body = (() => {
    if (!mounted || AsyncResult.isInitial(channels)) {
      return <Loading label={t("channelsLoading")} />;
    }

    if (AsyncResult.isFailure(channels)) {
      return <Failed label={t("channelsFailed")} onRetry={retry} />;
    }

    return postId === undefined ? (
      <Composer
        approvalPolicy={approvalPolicy}
        channels={channels.value}
        permissions={permissions}
        post={undefined}
        startAt={startAt}
        userId={userId}
        workspaceId={workspaceId}
      />
    ) : (
      <ExistingPost
        channels={channels.value}
        permissions={permissions}
        postId={postId}
        userId={userId}
        workspaceId={workspaceId}
      />
    );
  })();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <Link
          href={`/app/${workspaceId}/calendar`}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          {t("backToCalendar")}
        </Link>
        <Link
          href={`/app/${workspaceId}/drafts`}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          {t("backToDrafts")}
        </Link>
      </div>
      {body}
    </div>
  );
};
