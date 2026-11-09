"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { Channel, Permission } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";

import { Composer } from "#components/posts/composer.tsx";
import { PostDetail } from "#components/posts/post-detail.tsx";
import { Link } from "#i18n/navigation.ts";
import { workspaceChannels, workspacePost } from "#posts/api.ts";
import { useMounted } from "#posts/use-mounted.ts";

interface ComposerScreenProps {
  readonly permissions: readonly Permission[];
  /** None for a new post. */
  readonly postId: string | undefined;
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

  if (AsyncResult.isSuccess(result)) {
    const post = result.value;

    // Once it went out, or was cancelled, the page tells how it went.
    return post.status === "draft" || post.status === "scheduled" ? (
      <Composer
        key={post.id}
        channels={channels}
        permissions={permissions}
        post={post}
        userId={userId}
        workspaceId={workspaceId}
      />
    ) : (
      <PostDetail
        channels={channels}
        permissions={permissions}
        post={post}
        workspaceId={workspaceId}
      />
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
  userId,
  workspaceId,
}: ComposerScreenProps) => {
  const t = useTranslations("Posts.Composer");
  const mounted = useMounted();
  const query = workspaceChannels(workspaceId);
  const channels = useAtomValue(query);
  const retry = useAtomRefresh(query);

  const body = (() => {
    if (!mounted || AsyncResult.isInitial(channels)) {
      return <Loading label={t("channelsLoading")} />;
    }

    if (AsyncResult.isFailure(channels)) {
      return <Failed label={t("channelsFailed")} onRetry={retry} />;
    }

    return postId === undefined ? (
      <Composer
        channels={channels.value}
        permissions={permissions}
        post={undefined}
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
