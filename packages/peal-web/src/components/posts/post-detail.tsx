"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { DateTime, Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type {
  Channel,
  Permission,
  Post,
  PostTarget,
  PublicationAttempt,
  TargetConfirmation,
} from "peal-contract";
import { postFormatOf } from "peal-contract/post-text";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "peal-ui/components/alert-dialog";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "peal-ui/components/dialog";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { cn } from "peal-ui/lib/utils";
import { useCallback, useId, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { channelName as nameOfChannel } from "#channels/channel-name.ts";
import { BoostDialog } from "#components/ads/boost-dialog.tsx";
import { PostPaid } from "#components/ads/post-paid.tsx";
import { LivePostActions } from "#components/posts/live/live-post-actions.tsx";
import { PostOrigins } from "#components/posts/post-origins.tsx";
import { PostTagsField } from "#components/posts/post-tags-field.tsx";
import { PostQueueLine } from "#components/posts/queue-choice.tsx";
import { useRefreshWhileVisible } from "#notices/use-refresh-while-visible.ts";
import {
  confirmTarget,
  postAttempts,
  postsKeys,
  repostTarget,
  workspacePost,
} from "#posts/api.ts";
import { failureOf } from "#posts/outcome.ts";
import { isWebAddress } from "#posts/permalink.ts";

type Translate = ReturnType<typeof useTranslations<"PostDetail">>;

/** What the member asks for one channel of the post. */
export type TargetRequest =
  | { readonly _tag: "repost"; readonly targetId: string }
  | {
      readonly _tag: "confirm";
      readonly confirmation: TargetConfirmation;
      readonly targetId: string;
    };

interface TargetViewProps {
  readonly attempts: readonly PublicationAttempt[] | undefined;
  /** Whether the member may repost and confirm (post:schedule). */
  readonly canAct: boolean;
  readonly channel: Channel | undefined;
  /** Whether a request for this channel runs. */
  readonly busy: boolean;
  /** What else the member may do on the channel, such as boosting. */
  readonly extra?: ReactNode;
  readonly onRequest: (request: TargetRequest) => void;
  readonly target: PostTarget;
}

const at = (instant: DateTime.Utc) => DateTime.toDate(instant);

// What happened on the channel, in a sentence.
const statusText = (
  t: Translate,
  reasonOf: (reason: string) => string,
  target: PostTarget,
  platform: string
): string => {
  const { status } = target;

  if (status === "published") {
    return target.publishedAt === null
      ? ""
      : t("publishedAt", { at: at(target.publishedAt) });
  }

  if (status === "failed") {
    return t("failed", { reason: reasonOf(target.failureReason ?? "") });
  }

  if (status === "unconfirmed") {
    return t("unconfirmed", {
      platform,
      reason: t("unconfirmedReason", {
        reason: target.unconfirmedReason ?? "",
      }),
    });
  }

  if (status === "cancelled") {
    return t("cancelled");
  }

  return status === "pending" ? t("pending") : t("sending");
};

const Attempts = ({
  attempts,
}: {
  readonly attempts: readonly PublicationAttempt[];
}) => {
  const t = useTranslations("PostDetail");

  if (attempts.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noAttempts")}</p>;
  }

  return (
    <ol className="flex flex-col gap-1 text-sm">
      {attempts.map((attempt) => (
        <li key={`${attempt.round}-${attempt.part}-${attempt.attempt}`}>
          {attempt.part > 0
            ? t("attemptPart", { position: attempt.part + 1 })
            : null}
          {t("attempt", {
            at: at(attempt.startedAt),
            attempt: attempt.attempt,
            result: t("result", { result: attempt.result }),
            round: attempt.round,
          })}
          {attempt.retryAt === null ? null : (
            <span className="text-muted-foreground">
              {" "}
              {t("retryAt", { at: at(attempt.retryAt) })}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
};

// Where a post of several parts is on a channel: each part, live or not
// sent, with its address when the platform gave one. Parts go out in order,
// so those not live are the ones after the last that is.
const TargetParts = ({
  platform,
  repostable,
  target,
}: {
  readonly platform: string;
  readonly repostable: boolean;
  readonly target: PostTarget;
}) => {
  const t = useTranslations("PostDetail");
  const { count, live } = target.parts;

  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-sm font-medium">{t("partsTitle")}</h4>
      <p className="text-sm">{t("partsLive", { count, live: live.length })}</p>
      <ol className="flex flex-col gap-1 text-sm">
        {Array.from({ length: count }, (_, index) => {
          const position = index + 1;
          const part = live.find((found) => found.index === index);

          if (part === undefined) {
            return (
              <li key={position} className="text-muted-foreground">
                {t("partNotSent", { position })}
              </li>
            );
          }

          return (
            <li key={position}>
              {part.permalink === null ? (
                t("partLive", { position })
              ) : (
                <a
                  href={part.permalink}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-4"
                >
                  {t("partLink", { platform, position })}
                </a>
              )}
            </li>
          );
        })}
      </ol>
      {repostable && live.length > 0 ? (
        <p className="text-muted-foreground text-sm">{t("partsRest")}</p>
      ) : null}
      {target.failureReason === "partsNotSent" ? (
        <p className="text-muted-foreground text-sm">
          {t("partsStopped", { platform })}
        </p>
      ) : null}
      {target.status === "published" ? (
        <p className="text-muted-foreground text-sm">{t("partsCounts")}</p>
      ) : null}
    </div>
  );
};

// Sends the post again on the channel, once the member confirms.
const Repost = ({
  busy,
  channelName,
  onRepost,
  platform,
  unconfirmed,
}: {
  readonly busy: boolean;
  readonly channelName: string;
  readonly onRepost: () => void;
  readonly platform: string;
  readonly unconfirmed: boolean;
}) => {
  const t = useTranslations("PostDetail");
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant={unconfirmed ? "outline" : "default"} size="sm" />
        }
        disabled={busy}
      >
        {busy ? t("reposting") : t("repost")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("repostTitle", { channel: channelName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {unconfirmed
              ? t("repostUnconfirmed", { platform })
              : t("repostDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              onRepost();
            }}
          >
            {t("repost")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Asks what the member found on the platform, with the post's address if
// they have it.
const Check = ({
  busy,
  channelName,
  onConfirm,
  platform,
}: {
  readonly busy: boolean;
  readonly channelName: string;
  readonly onConfirm: (confirmation: TargetConfirmation) => void;
  readonly platform: string;
}) => {
  const t = useTranslations("PostDetail");
  const tComposer = useTranslations("Posts.Composer");
  const [address, setAddress] = useState("");
  const inputId = useId();
  const hintId = useId();
  const trimmed = address.trim();
  const valid = trimmed === "" || isWebAddress(trimmed);

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />} disabled={busy}>
        {busy ? t("saving") : t("check")}
      </DialogTrigger>
      <DialogContent closeLabel={tComposer("closeDialog")}>
        <DialogHeader>
          <DialogTitle>{t("checkTitle", { platform })}</DialogTitle>
          <DialogDescription>
            {t("checkDescription", { channel: channelName })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={inputId}>{t("permalinkLabel")}</Label>
          <Input
            id={inputId}
            type="url"
            inputMode="url"
            value={address}
            aria-describedby={hintId}
            aria-invalid={!valid}
            onChange={(event) => {
              setAddress(event.target.value);
            }}
          />
          <p id={hintId} className="text-muted-foreground text-xs">
            {valid ? t("permalinkHint", { platform }) : t("permalinkInvalid")}
          </p>
        </div>
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" />}
            onClick={() => {
              onConfirm({ _tag: "notPublished" });
            }}
          >
            {t("notThere")}
          </DialogClose>
          <DialogClose
            render={<Button disabled={!valid} />}
            onClick={() => {
              onConfirm({
                _tag: "published",
                permalink: trimmed === "" ? null : trimmed,
              });
            }}
          >
            {t("foundIt")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// The format the target's options chose: a story, a reel, or none for a
// feed post.
const formatOf = (target: PostTarget) =>
  target.options === null
    ? undefined
    : postFormatOf(target.options.platform, target.options);

/** A story's or a reel's badge; nothing for a feed post. */
const FormatBadge = ({ target }: { readonly target: PostTarget }) => {
  const t = useTranslations("Posts.Formats");
  const format = formatOf(target);

  return format === "story" || format === "reel" ? (
    <Badge variant="secondary">{t(format)}</Badge>
  ) : null;
};

/**
 * The link to a target's post, kept struck through once Peal removed it.
 * A story has no lasting page: none.
 */
const TargetLink = ({
  platform,
  target,
}: {
  readonly platform: string;
  readonly target: PostTarget;
}) => {
  const t = useTranslations("PostDetail");

  return target.permalink === null || formatOf(target) === "story" ? null : (
    <a
      href={target.permalink}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "text-sm underline underline-offset-4",
        // Kept as a record: the post is no longer there.
        target.removedAt === null ? null : "line-through"
      )}
    >
      {t("viewPost", { platform })}
    </a>
  );
};

/** What a published target says of how it went out, each when it holds. */
const PublishedNotes = ({ target }: { readonly target: PostTarget }) => {
  const t = useTranslations("PostDetail");
  const tFormats = useTranslations("Posts.Formats");

  return (
    <>
      {formatOf(target) === "story" && target.status === "published" ? (
        <p className="text-muted-foreground text-sm">
          {tFormats("storiesExpire")}
        </p>
      ) : null}
      {target.keptPrivate === true ? (
        <Alert>
          <AlertDescription>{t("keptPrivate")}</AlertDescription>
        </Alert>
      ) : null}
      {target.thumbnailNotSet === true ? (
        <Alert>
          <AlertDescription>{t("thumbnailNotSet")}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
};

/** How the post went on one channel: its status, why, its attempts. */
export const TargetView = ({
  attempts,
  busy,
  canAct,
  channel,
  extra,
  onRequest,
  target,
}: TargetViewProps) => {
  const t = useTranslations("PostDetail");
  const tPosts = useTranslations("Posts");
  const tNotices = useTranslations("Notices");
  const tLive = useTranslations("Posts.Live");

  const platform =
    channel === undefined
      ? tPosts("disconnectedChannel")
      : tPosts("platform", { platform: channel.platform });

  const channelName =
    channel === undefined
      ? tPosts("disconnectedChannel")
      : tPosts("Composer.channelDetail", {
          handle: nameOfChannel(channel),
          platform,
        });

  const reasonOf = (reason: string) => tNotices("reason", { reason });

  // A thread Peal has no post to send the rest under takes no repost.
  const repostable =
    target.status === "unconfirmed" ||
    (target.status === "failed" && target.failureReason !== "partsNotSent");

  const acts = canAct && repostable;
  const hasExtra = extra !== undefined && extra !== null;

  return (
    <li>
      <Card size="sm">
        <CardHeader>
          <CardTitle>
            <h3 className="font-medium">{channelName}</h3>
          </CardTitle>
          <CardDescription>
            {statusText(t, reasonOf, target, platform)}
          </CardDescription>
          <CardAction>
            <span className="flex flex-wrap gap-1">
              <FormatBadge target={target} />
              <Badge
                variant={target.status === "failed" ? "destructive" : "outline"}
              >
                {tPosts("targetStatus", { status: target.status })}
              </Badge>
            </span>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <PublishedNotes target={target} />
            {target.round > 1 ? (
              <p className="text-muted-foreground text-sm">
                {t("rounds", { count: target.round })}
              </p>
            ) : null}
            {target.parts.count > 1 ? (
              <TargetParts
                platform={platform}
                repostable={repostable}
                target={target}
              />
            ) : null}
            <h4 className="text-sm font-medium">{t("attemptsTitle")}</h4>
            {attempts === undefined ? null : <Attempts attempts={attempts} />}
            {target.removedAt === null ? null : (
              <p className="text-sm">
                {tLive("removed", { at: at(target.removedAt), platform })}
              </p>
            )}
            <TargetLink platform={platform} target={target} />
          </div>
        </CardContent>
        {acts || hasExtra ? (
          <CardFooter>
            <div className="flex flex-wrap gap-2">
              {acts && target.status === "unconfirmed" ? (
                <Check
                  busy={busy}
                  channelName={channelName}
                  platform={platform}
                  onConfirm={(confirmation) => {
                    onRequest({
                      _tag: "confirm",
                      confirmation,
                      targetId: target.id,
                    });
                  }}
                />
              ) : null}
              {acts ? (
                <Repost
                  busy={busy}
                  channelName={channelName}
                  platform={platform}
                  unconfirmed={target.status === "unconfirmed"}
                  onRepost={() => {
                    onRequest({ _tag: "repost", targetId: target.id });
                  }}
                />
              ) : null}
              {extra}
            </div>
          </CardFooter>
        ) : null}
      </Card>
    </li>
  );
};

interface PostDetailViewProps {
  /** Every attempt of the post, once loaded. */
  readonly attempts: readonly PublicationAttempt[] | undefined;
  /**
   * What else the member may do on a channel the post is on, such as
   * boosting it there; null where there is nothing.
   */
  readonly actionsFor?: (
    target: PostTarget,
    channel: Channel | undefined
  ) => ReactNode;
  /** The channel whose request runs, if any. */
  readonly busy: string | null;
  readonly canAct: boolean;
  readonly channels: readonly Channel[];
  readonly onRequest: (request: TargetRequest) => void;
  /** The post's boosts and paid numbers, for members who read ads. */
  readonly paid?: ReactNode;
  readonly post: Post;
  /** What a member may do with the whole post, such as copying it. */
  readonly actions?: ReactNode;
  /** The queue that placed the post, named, if one did. */
  readonly queue?: ReactNode;
  /** The post's tags, with what changes them for a member who may. */
  readonly tags?: ReactNode;
  /** The signed-in user, named in how the post came to be. */
  readonly viewerId: string | null;
}

/**
 * A post that went out, or was cancelled: what it says, when, and how it
 * went on each channel, with its attempts and why one failed or is to
 * check.
 */
export const PostDetailView = ({
  actions,
  actionsFor,
  attempts,
  busy,
  canAct,
  channels,
  onRequest,
  paid,
  post,
  queue,
  tags,
  viewerId,
}: PostDetailViewProps) => {
  const t = useTranslations("PostDetail");
  const tPosts = useTranslations("Posts");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title", { status: post.status })}
          </h1>
        </CardTitle>
        <CardDescription>
          {post.schedule === null
            ? t("description")
            : t("scheduledFor", { at: at(post.schedule.at) })}
        </CardDescription>
        <div className="flex gap-2">
          <Badge variant="outline">
            {tPosts("status", { status: post.status })}
          </Badge>
          {post.outcome === null ? null : (
            <Badge variant="secondary">
              {tPosts("outcome", { outcome: post.outcome })}
            </Badge>
          )}
        </div>
        <PostOrigins post={post} viewerId={viewerId} />
        {queue}
        {actions === undefined ? null : <CardAction>{actions}</CardAction>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <section aria-labelledby="post-text" className="flex flex-col gap-2">
            <h2 id="post-text" className="text-sm font-medium">
              {t("text")}
            </h2>
            <p className="text-sm whitespace-pre-wrap">
              {post.content.text.trim() === ""
                ? t("noText")
                : post.content.text}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("media", { count: post.content.media.length })}
            </p>
            {(post.content.followUps ?? []).length === 0 ? null : (
              <ol className="flex flex-col gap-2">
                {(post.content.followUps ?? []).map((part, index) => (
                  <li
                    // Parts have no id: their place names them.
                    key={`part-${String(index + 2)}`}
                    className="flex flex-col gap-1 border-l-2 pl-3"
                  >
                    <p className="text-sm font-medium">
                      {t("partText", { position: index + 2 })}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {part.text.trim() === "" ? t("noText") : part.text}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t("media", { count: part.media.length })}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
          {tags}
          <section
            aria-labelledby="post-channels"
            className="flex flex-col gap-3"
          >
            <h2 id="post-channels" className="text-sm font-medium">
              {t("channelsTitle")}
            </h2>
            {post.status === "publishing" ? (
              <output className="text-muted-foreground text-sm">
                {t("going")}
              </output>
            ) : null}
            <ul className="flex flex-col gap-3">
              {post.targets.map((target) => {
                const channel = channels.find(
                  ({ id }) => id === target.channelId
                );

                return (
                  <TargetView
                    key={target.id}
                    attempts={attempts?.filter(
                      ({ targetId }) => targetId === target.id
                    )}
                    busy={busy === target.id}
                    canAct={canAct}
                    channel={channel}
                    extra={actionsFor?.(target, channel)}
                    target={target}
                    onRequest={onRequest}
                  />
                );
              })}
            </ul>
          </section>
          {paid}
        </div>
      </CardContent>
    </Card>
  );
};

// How a request failed, in words.
const failureText = (t: Translate, tag: string | undefined) => {
  if (tag === "Forbidden") {
    return t("errors.forbidden");
  }

  if (tag === "PostNotFound") {
    return t("errors.notFound");
  }

  return tag === "PostStatusConflict" || tag === "TargetStatusConflict"
    ? t("errors.conflict")
    : t("errors.generic");
};

// While the post goes out, how often the page asks how it is going.
const refreshEvery = 5000;

// The post is read again once its tags changed: nothing to keep here.
const noChange = () => {
  // The posts queries refresh.
};

/**
 * The detail of a post that went out, with what members with post:schedule
 * can do about each channel: repost it, or say what they found when Peal
 * could not tell. It updates while the post is publishing.
 */
export const PostDetail = ({
  actions,
  adsLink,
  channels,
  permissions,
  post,
  userId,
  workspaceId,
}: {
  /** What a member may do with the whole post, such as copying it. */
  readonly actions?: ReactNode;
  /**
   * A link to the workspace's ads page, which the boost dialog shows when
   * no ad account may spend yet.
   */
  readonly adsLink: ReactNode;
  readonly channels: readonly Channel[];
  readonly permissions: readonly Permission[];
  readonly post: Post;
  /** The signed-in user. */
  readonly userId: string;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("PostDetail");
  const tPosts = useTranslations("Posts");
  const attemptsQuery = postAttempts(workspaceId, post.id);
  const attempts = useAtomValue(attemptsQuery);
  const refreshAttempts = useAtomRefresh(attemptsQuery);
  const refreshPost = useAtomRefresh(workspacePost(workspaceId, post.id));
  const repost = useAtomSet(repostTarget, { mode: "promiseExit" });
  const confirm = useAtomSet(confirmTarget, { mode: "promiseExit" });
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const publishing = post.status === "publishing";

  const refresh = useCallback(() => {
    if (publishing) {
      refreshPost();
      refreshAttempts();
    }
  }, [publishing, refreshAttempts, refreshPost]);

  useRefreshWhileVisible(refresh, refreshEvery);

  const channelNamed = (channelId: string | undefined) => {
    const channel = channels.find(({ id }) => id === channelId);

    return channel === undefined
      ? tPosts("disconnectedChannel")
      : tPosts("Composer.channelDetail", {
          handle: nameOfChannel(channel),
          platform: tPosts("platform", { platform: channel.platform }),
        });
  };

  const channelOf = (targetId: string) =>
    channelNamed(post.targets.find(({ id }) => id === targetId)?.channelId);

  const maySpend =
    permissions.includes("ads:read") && permissions.includes("ads:spend");

  // Peal boosts posts published on Facebook Pages and Instagram, for
  // members who may spend on ads; the dialog shows only on a server that
  // offers spending.
  const boostFor = (target: PostTarget, channel: Channel | undefined) =>
    maySpend &&
    target.status === "published" &&
    channel !== undefined &&
    (channel.platform === "facebook" || channel.platform === "instagram") ? (
      <BoostDialog
        adsLink={adsLink}
        channel={channelNamed(channel.id)}
        channelId={channel.id}
        postId={post.id}
        postText={post.content.text}
        workspaceId={workspaceId}
      />
    ) : null;

  // Unpublishing, for members who may publish, on every channel the post
  // is live on: the action, or why the platform does not let Peal.
  const unpublishFor = (target: PostTarget, channel: Channel | undefined) =>
    permissions.includes("post:publish") && target.status === "published" ? (
      <LivePostActions
        channel={channel}
        channelName={channelNamed(channel?.id)}
        postId={post.id}
        target={target}
        workspaceId={workspaceId}
      />
    ) : null;

  const actionsOn = (target: PostTarget, channel: Channel | undefined) => {
    const boost = boostFor(target, channel);
    const unpublishing = unpublishFor(target, channel);

    return boost === null && unpublishing === null ? null : (
      <>
        {boost}
        {unpublishing}
      </>
    );
  };

  const published = post.targets.some(({ status }) => status === "published");

  const handleRequest = (request: TargetRequest) => {
    setBusy(request.targetId);
    startTransition(async () => {
      const params = {
        postId: post.id,
        targetId: request.targetId,
        workspaceId,
      };

      const exit =
        request._tag === "repost"
          ? await repost({ params, reactivityKeys: postsKeys })
          : await confirm({
              params,
              payload: request.confirmation,
              reactivityKeys: postsKeys,
            });

      setBusy(null);

      if (Exit.isFailure(exit)) {
        const failure = failureOf(exit).pipe(
          Option.map(({ _tag }) => _tag),
          Option.getOrUndefined
        );

        toast.error(failureText(t, failure));

        return;
      }

      const channel = channelOf(request.targetId);

      if (request._tag === "repost") {
        toast.success(t("reposted", { channel }));
      } else {
        toast.success(
          request.confirmation._tag === "published"
            ? t("confirmed", { channel })
            : t("notPublished", { channel })
        );
      }
    });
  };

  return (
    <PostDetailView
      actions={actions}
      attempts={AsyncResult.isSuccess(attempts) ? attempts.value : undefined}
      busy={busy}
      canAct={permissions.includes("post:schedule")}
      channels={channels}
      paid={
        published && permissions.includes("ads:read") ? (
          <PostPaid
            channelName={channelNamed}
            postId={post.id}
            workspaceId={workspaceId}
            rights={{
              manage: permissions.includes("ads:manage"),
              spend: permissions.includes("ads:spend"),
            }}
          />
        ) : null
      }
      post={post}
      queue={<PostQueueLine queueId={post.queueId} workspaceId={workspaceId} />}
      tags={
        <PostTagsField
          disabled={false}
          permissions={permissions}
          savedOn={post.id}
          tagIds={post.tagIds}
          workspaceId={workspaceId}
          onChange={noChange}
        />
      }
      viewerId={userId}
      actionsFor={actionsOn}
      onRequest={handleRequest}
    />
  );
};
