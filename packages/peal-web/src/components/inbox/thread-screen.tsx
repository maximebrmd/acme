"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Cause, Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type {
  Channel,
  InboxComment,
  InboxModerationAction,
  InboxReply,
  InboxThreadDetail,
  Platform,
} from "peal-contract";
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
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";
import { useId, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { channelsOf } from "#channels/channels-api.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { Link } from "#i18n/navigation.ts";
import {
  confirmInboxReply,
  inboxChanged,
  inboxThread,
  moderateComment,
  replyToComment,
  setCommentAnswered,
  withdrawInboxReply,
} from "#inbox/atoms.ts";
import { inboxErrorOf } from "#inbox/errors.ts";
import { replyFit } from "#inbox/reply-text.ts";
import {
  anySending,
  nestComments,
  pendingReplyTo,
  repliesTo,
  withSentReplies,
} from "#inbox/thread-tree.ts";
import { useRefreshWhileVisible } from "#notices/use-refresh-while-visible.ts";

import {
  CommentView,
  handleOf,
  ReplyAbilityNotice,
  ReplyBoxView,
  ReplyView,
  ThreadSummaryView,
  useInboxErrorText,
} from "./inbox-views.tsx";

// How often the thread is read again while a reply is on its way, so the
// page shows how the journal says it ended, and otherwise.
const whileSending = 3000;

const whileIdle = 60_000;

const appLink = (href: string, label: string) => (
  <Link href={href} className="underline underline-offset-4">
    {label}
  </Link>
);

/** What the page knows of the thread a comment or a reply belongs to. */
interface ThreadContext {
  readonly detail: InboxThreadDetail;
  /** Whether the reader holds engagement:reply. */
  readonly mayReply: boolean;
  readonly workspaceId: string;
}

// What a member may ask about a comment, besides answering it.
type CommentRequest =
  | { readonly _tag: "answered"; readonly answered: boolean }
  | { readonly _tag: "moderate"; readonly action: InboxModerationAction };

// What the catalogue says once a request about a comment is done.
const doneBy = (request: CommentRequest): string => {
  if (request._tag === "moderate") {
    return request.action;
  }

  return request.answered ? "answered" : "waiting";
};

// The buttons under a comment: whether it still waits for an answer, and
// what its channel's account may do about it on the platform.
const CommentActions = ({
  comment,
  context,
}: {
  readonly comment: InboxComment;
  readonly context: ThreadContext;
}) => {
  const t = useTranslations("Inbox.action");
  const explain = useInboxErrorText();
  const setAnswered = useAtomSet(setCommentAnswered, { mode: "promiseExit" });
  const moderate = useAtomSet(moderateComment, { mode: "promiseExit" });
  const [isBusy, startRequest] = useTransition();
  const { abilities } = context.detail;

  const ask = (request: CommentRequest) => {
    startRequest(async () => {
      const call = {
        params: { commentId: comment.id, workspaceId: context.workspaceId },
        reactivityKeys: inboxChanged(context.workspaceId, comment.threadId),
      };

      const exit =
        request._tag === "answered"
          ? await setAnswered({
              ...call,
              payload: { answered: request.answered },
            })
          : await moderate({ ...call, payload: { action: request.action } });

      Option.match(inboxErrorOf(exit), {
        onNone: () => {
          toast.success(t("done", { action: doneBy(request) }));
        },
        onSome: (error) => {
          toast.error(explain(error));
        },
      });
    });
  };

  const button = (label: string, request: CommentRequest) => (
    <Button
      variant="outline"
      size="sm"
      disabled={isBusy}
      focusableWhenDisabled
      onClick={() => {
        ask(request);
      }}
    >
      {label}
    </Button>
  );

  return (
    <>
      {comment.state === "new"
        ? button(t("markAnswered"), { _tag: "answered", answered: true })
        : null}
      {comment.state === "answered"
        ? button(t("markWaiting"), { _tag: "answered", answered: false })
        : null}
      {abilities.like === "available"
        ? button(comment.liked ? t("unlike") : t("like"), {
            _tag: "moderate",
            action: comment.liked ? "unlike" : "like",
          })
        : null}
      {abilities.hide === "available"
        ? button(comment.state === "hidden" ? t("show") : t("hide"), {
            _tag: "moderate",
            action: comment.state === "hidden" ? "unhide" : "hide",
          })
        : null}
      {abilities.delete === "available" ? (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                disabled={isBusy}
                focusableWhenDisabled
              />
            }
          >
            {t("delete")}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  ask({ _tag: "moderate", action: "delete" });
                }}
              >
                {t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
};

// What a member may do about a reply: say what they found for one whose
// outcome is unknown, or take a sent one back from the platform.
const ReplyActions = ({
  context,
  reply,
}: {
  readonly context: ThreadContext;
  readonly reply: InboxReply;
}) => {
  const t = useTranslations("Inbox.reply");
  const tAction = useTranslations("Inbox.action");
  const explain = useInboxErrorText();
  const confirm = useAtomSet(confirmInboxReply, { mode: "promiseExit" });
  const withdraw = useAtomSet(withdrawInboxReply, { mode: "promiseExit" });
  const [isBusy, startRequest] = useTransition();

  const call = {
    params: { replyId: reply.id, workspaceId: context.workspaceId },
    reactivityKeys: inboxChanged(context.workspaceId, reply.threadId),
  };

  const handleConfirm = (sent: boolean) => {
    startRequest(async () => {
      const exit = await confirm({ ...call, payload: { sent } });

      Option.match(inboxErrorOf(exit), {
        onNone: () => {
          toast.success(t("confirmed", { sent: sent ? "true" : "false" }));
        },
        onSome: (error) => {
          toast.error(explain(error));
        },
      });
    });
  };

  const handleWithdraw = () => {
    startRequest(async () => {
      const exit = await withdraw(call);

      Option.match(inboxErrorOf(exit), {
        onNone: () => {
          toast.success(t("withdrawn"));
        },
        onSome: (error) => {
          toast.error(explain(error));
        },
      });
    });
  };

  if (reply.status === "unconfirmed") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          disabled={isBusy}
          focusableWhenDisabled
          onClick={() => {
            handleConfirm(true);
          }}
        >
          {t("confirmSent")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isBusy}
          focusableWhenDisabled
          onClick={() => {
            handleConfirm(false);
          }}
        >
          {t("confirmNotSent")}
        </Button>
      </>
    );
  }

  return reply.status === "sent" &&
    reply.permalink !== null &&
    context.detail.abilities.withdraw === "available" ? (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            disabled={isBusy}
            focusableWhenDisabled
          />
        }
      >
        {isBusy ? t("withdrawing") : t("withdraw")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("withdrawTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("withdrawDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tAction("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleWithdraw}>
            {t("withdraw")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : null;
};

// The box that answers one comment. What it sends shows at once, as the
// server answered it: on its way.
const ReplyBox = ({
  comment,
  context,
  onSent,
  pending,
  platform,
}: {
  readonly comment: InboxComment;
  readonly context: ThreadContext;
  readonly onSent: (reply: InboxReply) => void;
  readonly pending: "sending" | "unconfirmed" | null;
  readonly platform: Platform;
}) => {
  const t = useTranslations("Inbox");
  const explain = useInboxErrorText();
  const send = useAtomSet(replyToComment, { mode: "promiseExit" });
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();
  const fit = replyFit(platform, comment.author?.handle ?? null, text);

  const handleSend = () => {
    setError(null);
    startSending(async () => {
      const exit = await send({
        headers: {},
        params: { commentId: comment.id, workspaceId: context.workspaceId },
        payload: { text },
        reactivityKeys: inboxChanged(context.workspaceId, comment.threadId),
      });

      if (Exit.isSuccess(exit)) {
        onSent(exit.value);
        setText("");
        toast.success(t("box.sent"));

        return;
      }

      setError(
        inboxErrorOf(exit).pipe(
          Option.map(explain),
          Option.getOrElse(() => explain({ key: "unknown" }))
        )
      );
    });
  };

  return (
    <ReplyBoxView
      author={
        comment.author === null
          ? t("comment.unknownAuthor")
          : handleOf(comment.author)
      }
      error={error}
      fit={fit}
      pending={pending}
      sending={isSending}
      text={text}
      onChange={setText}
      onSend={handleSend}
    />
  );
};

// One comment with everything under it but the comments that answer it,
// which `children` are.
const CommentItem = ({
  children,
  comment,
  context,
  onSent,
  replies,
}: {
  readonly children?: ReactNode;
  readonly comment: InboxComment;
  readonly context: ThreadContext;
  readonly onSent: (reply: InboxReply) => void;
  /** Every reply of the thread, those just sent included. */
  readonly replies: readonly InboxReply[];
}) => {
  const { detail, mayReply } = context;
  const own = repliesTo(replies, comment.id);
  const present = comment.state !== "deleted";

  const pending = pendingReplyTo(replies, comment.id).pipe(
    Option.map(({ status }) =>
      status === "sending" ? ("sending" as const) : ("unconfirmed" as const)
    ),
    Option.getOrNull
  );

  return (
    <CommentView
      comment={comment}
      {...(mayReply && present
        ? { actions: <CommentActions comment={comment} context={context} /> }
        : {})}
      {...(own.length > 0
        ? {
            replies: own.map((reply) => (
              <ReplyView
                key={reply.id}
                reply={reply}
                {...(mayReply
                  ? {
                      actions: <ReplyActions context={context} reply={reply} />,
                    }
                  : {})}
              />
            )),
          }
        : {})}
      {...(mayReply &&
      present &&
      detail.platform !== null &&
      detail.abilities.reply === "available"
        ? {
            replyBox: (
              <ReplyBox
                comment={comment}
                context={context}
                pending={pending}
                platform={detail.platform}
                onSent={onSent}
              />
            ),
          }
        : {})}
    >
      {children}
    </CommentView>
  );
};

const LoadedThread = ({
  channels,
  detail,
  mayReply,
  onRefresh,
  workspaceId,
}: {
  readonly channels: readonly Channel[];
  readonly detail: InboxThreadDetail;
  readonly mayReply: boolean;
  readonly onRefresh: () => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Inbox");
  const listId = useId();
  // The replies this page sent, until the thread lists them itself.
  const [sent, setSent] = useState<readonly InboxReply[]>([]);
  const replies = withSentReplies(detail.replies, sent);
  const context: ThreadContext = { detail, mayReply, workspaceId };

  useRefreshWhileVisible(
    onRefresh,
    anySending(replies) ? whileSending : whileIdle
  );

  const handleSent = (reply: InboxReply) => {
    setSent((before) => [...before, reply]);
  };

  return (
    <div className="flex flex-col gap-6">
      <ThreadSummaryView
        channel={channels.find(({ id }) => id === detail.thread.channelId)}
        link={appLink}
        thread={detail.thread}
        workspaceId={workspaceId}
      />
      {mayReply ? (
        <ReplyAbilityNotice
          channels={appLink(
            `/app/${workspaceId}/channels`,
            t("abilities.channels")
          )}
          disconnected={detail.platform === null}
          standing={detail.abilities.reply}
        />
      ) : (
        <p className="text-muted-foreground text-sm">{t("readOnly")}</p>
      )}
      <section aria-labelledby={listId} className="flex flex-col gap-4">
        <h2 id={listId} className="text-xl font-semibold">
          {t("thread.listTitle")}
        </h2>
        {detail.comments.length === 0 ? (
          <p className="text-muted-foreground">{t("thread.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {nestComments(detail.comments).map(({ answers, comment }) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                context={context}
                replies={replies}
                onSent={handleSent}
              >
                {answers.length === 0
                  ? undefined
                  : answers.map((answer) => (
                      <CommentItem
                        key={answer.id}
                        comment={answer}
                        context={context}
                        replies={replies}
                        onSent={handleSent}
                      />
                    ))}
              </CommentItem>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

/**
 * One thread of the inbox: the comments under a post, the replies sent from
 * Peal, and what the reader may do about each. While a reply is on its way
 * the thread is read again every few seconds, so what shows is always what
 * the server recorded. It renders in the browser, where the reader's time
 * zone is known.
 */
export const ThreadScreen = ({
  mayReply,
  threadId,
  workspaceId,
}: {
  /** Whether the reader holds engagement:reply. */
  readonly mayReply: boolean;
  readonly threadId: string;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Inbox");
  const hydrated = useHydrated();
  const query = inboxThread(workspaceId, threadId);
  const result = useAtomValue(query);
  const reload = useAtomRefresh(query);
  const channels = useAtomValue(channelsOf(workspaceId));

  if (!hydrated || AsyncResult.isInitial(result)) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <span className="sr-only">{t("loading")}</span>
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (AsyncResult.isFailure(result)) {
    const missing = Cause.findErrorOption(result.cause).pipe(
      Option.exists(({ _tag }) => _tag === "InboxThreadNotFound")
    );

    return missing ? (
      <p className="text-muted-foreground">{t("thread.notFound")}</p>
    ) : (
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
    );
  }

  return (
    <LoadedThread
      channels={AsyncResult.isSuccess(channels) ? channels.value : []}
      detail={result.value}
      mayReply={mayReply}
      workspaceId={workspaceId}
      onRefresh={reload}
    />
  );
};
