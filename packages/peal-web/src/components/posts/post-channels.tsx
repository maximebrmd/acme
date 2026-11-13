"use client";

import { useAtomSet } from "@effect/atom-react";
import { Exit } from "effect";
import { useTranslations } from "next-intl";
import type { Channel, Post } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { useState } from "react";
import { toast } from "sonner";

import { postsKeys, removePostTarget } from "#posts/api.ts";
import { capabilitiesOf } from "#posts/composer-capabilities.ts";
import type { ComposerSubject } from "#posts/composer-capabilities.ts";

interface PostChannelsViewProps {
  /** The target being taken off, while the request runs. */
  readonly busy: string | null;
  /** The member may take a channel off this post. */
  readonly canRemove: boolean;
  readonly channels: readonly Channel[];
  readonly onRemove: (targetId: string) => void;
  readonly post: Post;
}

/**
 * The channels a post that waits for its time goes to, each with a button
 * that takes it off the post, which then goes out on the others; the last
 * one stays, as the post would go out nowhere: it is cancelled instead.
 * Those taken off are listed too.
 */
export const PostChannelsView = ({
  busy,
  canRemove,
  channels,
  onRemove,
  post,
}: PostChannelsViewProps) => {
  const t = useTranslations("Posts.Channels");
  const pending = post.targets.filter(({ status }) => status === "pending");
  const last = pending.length <= 1;

  const handleOf = (channelId: string) =>
    channels.find(({ id }) => id === channelId)?.handle ?? t("gone");

  return (
    <section
      aria-labelledby="post-channels-title"
      className="flex flex-col gap-3"
    >
      <h2 id="post-channels-title" className="text-sm font-medium">
        {t("title")}
      </h2>
      <p className="text-muted-foreground text-sm">{t("hint")}</p>
      <ul className="divide-border flex flex-col divide-y rounded-lg border">
        {post.targets.map((target) => (
          <li
            key={target.id}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
          >
            <span className="text-sm">{handleOf(target.channelId)}</span>
            {target.status === "pending" && canRemove && !last ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== null}
                aria-label={t("removeLabel", {
                  handle: handleOf(target.channelId),
                })}
                onClick={() => {
                  onRemove(target.id);
                }}
              >
                {busy === target.id ? t("removing") : t("remove")}
              </Button>
            ) : null}
            {target.status === "pending" ? null : (
              <span className="text-muted-foreground text-xs">
                {target.dropped === true ? t("removed") : t("notGoing")}
              </span>
            )}
          </li>
        ))}
      </ul>
      {canRemove && last ? (
        <p className="text-muted-foreground text-xs">{t("lastOne")}</p>
      ) : null}
    </section>
  );
};

/**
 * `PostChannelsView` for a post that waits for its time, taking a channel
 * off through `posts.removeTarget`; the post's page reads the post again.
 */
export const PostChannels = ({
  channels,
  post,
  workspaceId,
  ...subject
}: Omit<ComposerSubject, "post" | "saved"> & {
  readonly channels: readonly Channel[];
  readonly post: Post;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Posts.Channels");
  const remove = useAtomSet(removePostTarget, { mode: "promiseExit" });
  const [busy, setBusy] = useState<string | null>(null);
  const { canCancel } = capabilitiesOf({ ...subject, post, saved: true });

  if (post.status !== "scheduled" && post.status !== "awaitingApproval") {
    return null;
  }

  const handleRemove = async (targetId: string) => {
    setBusy(targetId);

    const exit = await remove({
      params: { postId: post.id, targetId, workspaceId },
      reactivityKeys: postsKeys,
    });

    setBusy(null);

    if (Exit.isSuccess(exit)) {
      toast.success(
        exit.value.status === "awaitingApproval" && post.status === "scheduled"
          ? t("removedWaits")
          : t("removedDone")
      );

      return;
    }

    toast.error(t("failed"));
  };

  return (
    <PostChannelsView
      busy={busy}
      canRemove={canCancel}
      channels={channels}
      post={post}
      onRemove={(targetId) => {
        void handleRemove(targetId);
      }}
    />
  );
};
