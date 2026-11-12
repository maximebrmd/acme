"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { DateTime, Exit, Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { LivePostRefusalSchema } from "peal-contract";
import type {
  Channel,
  LivePostChange,
  PostContent,
  PostTarget,
} from "peal-contract";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { platformCapabilities } from "#analytics/api.ts";
import {
  LivePostEditView,
  useEditFailureText,
} from "#components/posts/live/live-post-edit-views.tsx";
import type { EditFailure } from "#components/posts/live/live-post-edit-views.tsx";
import {
  LivePostView,
  useUnpublishFailureText,
} from "#components/posts/live/live-post-views.tsx";
import type { UnpublishFailure } from "#components/posts/live/live-post-views.tsx";
import { useRefreshWhileVisible } from "#notices/use-refresh-while-visible.ts";
import {
  editTarget,
  postChanges,
  postsKeys,
  unpublishTarget,
  workspacePost,
} from "#posts/api.ts";
import {
  editStateOf,
  endedSince,
  isRemoving,
  liveStateOf,
  partTextOn,
} from "#posts/live-post.ts";
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

// Why an edit did not go: a text the platform would refuse, or else as an
// unpublish's.
const editFailureFrom = (
  failure: Option.Option<{ readonly _tag: string; readonly reason?: unknown }>
): EditFailure =>
  Option.exists(failure, ({ _tag }) => _tag === "PostContentInvalid")
    ? "invalid"
    : failureFrom(failure);

/**
 * Unpublishing and editing a published post on one channel, for a member
 * with post:publish: each action, unpublishing behind its confirmation,
 * then how the change goes, read again while it runs.
 */
export const LivePostActions = ({
  channel,
  channelName,
  content,
  postId,
  target,
  workspaceId,
}: {
  readonly channel: Channel | undefined;
  readonly channelName: string;
  /** What the post says, whose text on the channel an edit starts from. */
  readonly content: PostContent;
  readonly postId: string;
  readonly target: PostTarget;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Posts.Live");
  const tPosts = useTranslations("Posts");
  const failureText = useUnpublishFailureText();
  const editFailureText = useEditFailureText();
  const changesQuery = postChanges(workspaceId, postId);
  const changes = useAtomValue(changesQuery);
  const refreshChanges = useAtomRefresh(changesQuery);
  const refreshPost = useAtomRefresh(workspacePost(workspaceId, postId));
  const capabilities = useAtomValue(platformCapabilities(workspaceId));
  const unpublish = useAtomSet(unpublishTarget, { mode: "promiseExit" });
  const edit = useAtomSet(editTarget, { mode: "promiseExit" });
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const listed = AsyncResult.isSuccess(changes)
    ? changes.value.items
    : noChanges;

  const removing = isRemoving(listed);

  // Once a change ends, the post says something new (an edit's text, the
  // channel removed): read it again, so an editor opens on the new text.
  const loaded = AsyncResult.isSuccess(changes);
  const lastListed = useRef(Option.none<readonly LivePostChange[]>());

  useEffect(() => {
    if (!loaded) {
      return;
    }

    if (endedSince(lastListed.current, listed, target.id)) {
      refreshPost();
    }

    lastListed.current = Option.some(listed);
  }, [listed, loaded, refreshPost, target.id]);

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

  const onSave = (part: number, text: string) => {
    setBusy(true);
    startTransition(async () => {
      const exit = await edit({
        params: { postId, targetId: target.id, workspaceId },
        payload: { part, text },
        query: {},
        reactivityKeys: postsKeys,
      });

      setBusy(false);
      refreshChanges();

      if (Exit.isFailure(exit)) {
        toast.error(editFailureText(editFailureFrom(failureOf(exit))));

        return;
      }

      toast.success(t("editRequested", { channel: channelName }));
    });
  };

  const texts = Array.from({ length: target.parts.count }, (_none, part) =>
    partTextOn(content, part, target.channelId)
  );

  return (
    <div className="flex flex-col gap-2">
      {channel === undefined ? null : (
        <LivePostEditView
          busy={busy}
          channelName={channelName}
          editedAt={
            target.editedAt === null ? null : DateTime.toDate(target.editedAt)
          }
          options={target.options ?? undefined}
          platform={platform}
          platformId={channel.platform}
          state={editStateOf(target, listed, ability)}
          texts={texts}
          onSave={onSave}
        />
      )}
      <LivePostView
        busy={busy}
        channelName={channelName}
        platform={platform}
        state={liveStateOf(target, listed, ability)}
        onUnpublish={onUnpublish}
      />
    </div>
  );
};
