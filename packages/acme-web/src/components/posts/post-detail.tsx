"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type {
  Channel,
  Permission,
  Post,
  PostTarget,
  PublicationAttempt,
  TargetConfirmation,
} from "acme-contract";
import { Alert, AlertDescription } from "acme-ui/components/alert";
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
} from "acme-ui/components/alert-dialog";
import { Badge } from "acme-ui/components/badge";
import { Button } from "acme-ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "acme-ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "acme-ui/components/dialog";
import { Input } from "acme-ui/components/input";
import { Label } from "acme-ui/components/label";
import { DateTime, Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { useCallback, useId, useState, useTransition } from "react";
import { toast } from "sonner";

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
        <li key={`${attempt.round}-${attempt.attempt}`}>
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

/** How the post went on one channel: its status, why, its attempts. */
export const TargetView = ({
  attempts,
  busy,
  canAct,
  channel,
  onRequest,
  target,
}: TargetViewProps) => {
  const t = useTranslations("PostDetail");
  const tPosts = useTranslations("Posts");
  const tNotices = useTranslations("Notices");

  const platform =
    channel === undefined
      ? tPosts("disconnectedChannel")
      : tPosts("platform", { platform: channel.platform });

  const channelName =
    channel === undefined
      ? tPosts("disconnectedChannel")
      : tPosts("Composer.channelDetail", {
          handle: channel.handle,
          platform,
        });

  const reasonOf = (reason: string) => tNotices("reason", { reason });

  const repostable =
    target.status === "failed" || target.status === "unconfirmed";

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
            <Badge
              variant={target.status === "failed" ? "destructive" : "outline"}
            >
              {tPosts("targetStatus", { status: target.status })}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {target.keptPrivate === true ? (
              <Alert>
                <AlertDescription>{t("keptPrivate")}</AlertDescription>
              </Alert>
            ) : null}
            {target.round > 1 ? (
              <p className="text-muted-foreground text-sm">
                {t("rounds", { count: target.round })}
              </p>
            ) : null}
            <h4 className="text-sm font-medium">{t("attemptsTitle")}</h4>
            {attempts === undefined ? null : <Attempts attempts={attempts} />}
            {target.permalink === null ? null : (
              <a
                href={target.permalink}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm underline underline-offset-4"
              >
                {t("viewPost", { platform })}
              </a>
            )}
          </div>
        </CardContent>
        {canAct && repostable ? (
          <CardFooter>
            <div className="flex flex-wrap gap-2">
              {target.status === "unconfirmed" ? (
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
              <Repost
                busy={busy}
                channelName={channelName}
                platform={platform}
                unconfirmed={target.status === "unconfirmed"}
                onRepost={() => {
                  onRequest({ _tag: "repost", targetId: target.id });
                }}
              />
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
  /** The channel whose request runs, if any. */
  readonly busy: string | null;
  readonly canAct: boolean;
  readonly channels: readonly Channel[];
  readonly onRequest: (request: TargetRequest) => void;
  readonly post: Post;
}

/**
 * A post that went out, or was cancelled: what it says, when, and how it
 * went on each channel, with its attempts and why one failed or is to
 * check.
 */
export const PostDetailView = ({
  attempts,
  busy,
  canAct,
  channels,
  onRequest,
  post,
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
          </section>
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
              {post.targets.map((target) => (
                <TargetView
                  key={target.id}
                  attempts={attempts?.filter(
                    ({ targetId }) => targetId === target.id
                  )}
                  busy={busy === target.id}
                  canAct={canAct}
                  channel={channels.find(({ id }) => id === target.channelId)}
                  target={target}
                  onRequest={onRequest}
                />
              ))}
            </ul>
          </section>
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

/**
 * The detail of a post that went out, with what members with post:schedule
 * can do about each channel: repost it, or say what they found when Acme
 * could not tell. It updates while the post is publishing.
 */
export const PostDetail = ({
  channels,
  permissions,
  post,
  workspaceId,
}: {
  readonly channels: readonly Channel[];
  readonly permissions: readonly Permission[];
  readonly post: Post;
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

  const channelOf = (targetId: string) => {
    const target = post.targets.find(({ id }) => id === targetId);
    const channel = channels.find(({ id }) => id === target?.channelId);

    return channel === undefined
      ? tPosts("disconnectedChannel")
      : tPosts("Composer.channelDetail", {
          handle: channel.handle,
          platform: tPosts("platform", { platform: channel.platform }),
        });
  };

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
      attempts={AsyncResult.isSuccess(attempts) ? attempts.value : undefined}
      busy={busy}
      canAct={permissions.includes("post:schedule")}
      channels={channels}
      post={post}
      onRequest={handleRequest}
    />
  );
};
