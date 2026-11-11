"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { LivePostRefusalSchema } from "peal-contract";
import type { Channel, LivePostChange, PostTarget } from "peal-contract";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import { platformCapabilities } from "#analytics/api.ts";
import {
  LivePostView,
  useUnpublishFailureText,
} from "#components/posts/live/live-post-views.tsx";
import type { UnpublishFailure } from "#components/posts/live/live-post-views.tsx";
import { useRefreshWhileVisible } from "#notices/use-refresh-while-visible.ts";
import { postChanges, postsKeys, unpublishTarget } from "#posts/api.ts";
import { isRemoving, liveStateOf } from "#posts/live-post.ts";
import { failureOf } from "#posts/outcome.ts";

// While a removal runs, how often the page asks how it is going.
const refreshEvery = 5000;

const isRefusal = Schema.is(LivePostRefusalSchema);

const noChanges: readonly LivePostChange[] = [];

// Why the request did not go, from the server's refusal.
const failureFrom = (
  failure: Option.Option<{ readonly _tag: string; readonly reason?: unknown }>
): UnpublishFailure =>
  Option.match(failure, {
    onNone: () => "other",
    onSome: ({ _tag, reason }) => {
      if (_tag === "Forbidden") {
        return "forbidden";
      }

      return _tag === "LivePostNotChangeable" && isRefusal(reason)
        ? reason
        : "other";
    },
  });

/**
 * Unpublishing a published post on one channel, for a member with
 * post:publish: the action and its confirmation, then how the removal
 * goes, read again while it runs.
 */
export const LivePostActions = ({
  channel,
  channelName,
  postId,
  target,
  workspaceId,
}: {
  readonly channel: Channel | undefined;
  readonly channelName: string;
  readonly postId: string;
  readonly target: PostTarget;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Posts.Live");
  const tPosts = useTranslations("Posts");
  const failureText = useUnpublishFailureText();
  const changesQuery = postChanges(workspaceId, postId);
  const changes = useAtomValue(changesQuery);
  const refreshChanges = useAtomRefresh(changesQuery);
  const capabilities = useAtomValue(platformCapabilities(workspaceId));
  const unpublish = useAtomSet(unpublishTarget, { mode: "promiseExit" });
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const listed = AsyncResult.isSuccess(changes)
    ? changes.value.items
    : noChanges;

  const removing = isRemoving(listed);

  const refresh = useCallback(() => {
    if (removing) {
      refreshChanges();
    }
  }, [refreshChanges, removing]);

  useRefreshWhileVisible(refresh, refreshEvery);

  const ability = AsyncResult.isSuccess(capabilities)
    ? Option.fromUndefinedOr(
        capabilities.value.find(
          ({ platform }) => platform === channel?.platform
        )
      ).pipe(Option.map(({ livePost }) => livePost))
    : Option.none();

  const platform =
    channel === undefined
      ? tPosts("disconnectedChannel")
      : tPosts("platform", { platform: channel.platform });

  const onUnpublish = () => {
    setBusy(true);
    startTransition(async () => {
      const exit = await unpublish({
        params: { postId, targetId: target.id, workspaceId },
        query: {},
        reactivityKeys: postsKeys,
      });

      setBusy(false);
      refreshChanges();

      if (Exit.isFailure(exit)) {
        toast.error(failureText(failureFrom(failureOf(exit))));

        return;
      }

      toast.success(t("requested", { channel: channelName }));
    });
  };

  return (
    <LivePostView
      busy={busy}
      channelName={channelName}
      platform={platform}
      state={liveStateOf(target, listed, ability)}
      onUnpublish={onUnpublish}
    />
  );
};
