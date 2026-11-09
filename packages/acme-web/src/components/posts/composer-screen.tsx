"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { Channel, Permission } from "acme-contract";
import { Button } from "acme-ui/components/button";
import { Skeleton } from "acme-ui/components/skeleton";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";

import { Composer } from "#components/posts/composer.tsx";
import { Link } from "#i18n/navigation.ts";
import { workspaceChannels, workspacePost } from "#posts/api.ts";
import { useMounted } from "#posts/use-mounted.ts";

interface ComposerScreenProps {
  readonly permissions: readonly Permission[];
  /** None for a new post. */
  readonly postId: string | undefined;
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
    return (
      <Composer
        key={result.value.id}
        channels={channels}
        permissions={permissions}
        post={result.value}
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

// The composer, once the workspace's channels and the post are loaded. It
// renders in the browser only, where the user's time zone is known.
export const ComposerScreen = ({
  permissions,
  postId,
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
        workspaceId={workspaceId}
      />
    ) : (
      <ExistingPost
        channels={channels.value}
        permissions={permissions}
        postId={postId}
        workspaceId={workspaceId}
      />
    );
  })();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/app/${workspaceId}/calendar`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        {t("backToCalendar")}
      </Link>
      {body}
    </div>
  );
};
