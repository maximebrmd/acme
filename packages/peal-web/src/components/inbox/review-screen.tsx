"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import {
  inboxReviewRetentionDays,
  maxInboxReviewReplyBytes,
} from "peal-contract";
import type {
  InboxReview,
  InboxReviewReply,
  InboxReviewThreadDetail,
} from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { inboxErrorOf } from "#inbox/errors.ts";
import {
  replyToReview,
  reviewLocation,
  reviewsChanged,
  setReviewAnswered,
  withdrawReviewReply,
} from "#inbox/review-atoms.ts";
import { useRefreshWhileVisible } from "#notices/use-refresh-while-visible.ts";

import { useInboxErrorText } from "./inbox-views.tsx";
import { ReviewReplyBoxView, ReviewView } from "./review-views.tsx";

// How often the reviews are read again while the tab is visible, so a
// reply on its way shows how it ended.
const refreshEvery = 30_000;

const bytesOf = (text: string) => new TextEncoder().encode(text.trim()).length;

// What a member who may answer can do about one review.
const ReviewActions = ({
  pending,
  review,
  workspaceId,
}: {
  readonly pending: boolean;
  readonly review: InboxReview;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("InboxReviews");
  const explain = useInboxErrorText();
  const send = useAtomSet(replyToReview, { mode: "promiseExit" });
  const mark = useAtomSet(setReviewAnswered, { mode: "promiseExit" });
  const withdraw = useAtomSet(withdrawReviewReply, { mode: "promiseExit" });
  const [text, setText] = useState("");
  const [attempt, setAttempt] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();
  const [isActing, startActing] = useTransition();

  const params = { reviewId: review.id, workspaceId };
  const reactivityKeys = reviewsChanged(workspaceId, review.threadId);

  const failed = <A, E extends { readonly _tag: string }>(
    exit: Exit.Exit<A, E>
  ) => {
    setError(
      inboxErrorOf(exit).pipe(
        Option.map(explain),
        Option.getOrElse(() => explain({ key: "unknown" }))
      )
    );
  };

  const handleSend = () => {
    setError(null);
    startSending(async () => {
      // The same key until the reply is made: a reply sent again after a
      // lost answer is the one the first request made.
      const exit = await send({
        headers: { "idempotency-key": attempt },
        params,
        payload: { text },
        reactivityKeys,
      });

      if (Exit.isSuccess(exit)) {
        setAttempt(crypto.randomUUID());
        setText("");
        toast.success(t("box.sent"));

        return;
      }

      failed(exit);
    });
  };

  const handleMark = () => {
    setError(null);
    startActing(async () => {
      const exit = await mark({
        params,
        payload: { answered: !review.markedAnswered },
        reactivityKeys,
      });

      if (Exit.isFailure(exit)) {
        failed(exit);
      }
    });
  };

  const handleWithdraw = () => {
    setError(null);
    startActing(async () => {
      const exit = await withdraw({ params, reactivityKeys });

      if (Exit.isSuccess(exit)) {
        toast.success(t("review.withdrawn"));

        return;
      }

      failed(exit);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isActing}
          onClick={handleMark}
        >
          {review.markedAnswered
            ? t("review.markWaiting")
            : t("review.markAnswered")}
        </Button>
        {review.reply === null ? null : (
          <Button
            variant="outline"
            size="sm"
            disabled={isActing}
            onClick={handleWithdraw}
          >
            {t("review.withdraw")}
          </Button>
        )}
      </div>
      <ReviewReplyBoxView
        bytes={bytesOf(text)}
        error={error}
        maximum={maxInboxReviewReplyBytes}
        pending={pending}
        sending={isSending}
        text={text}
        onChange={(changed) => {
          // Another text is another reply, under a key of its own.
          setText(changed);
          setAttempt(crypto.randomUUID());
        }}
        onSend={handleSend}
      />
    </div>
  );
};

// Whether a reply to the review is on its way, or may be out.
const isPending = (replies: readonly InboxReviewReply[], reviewId: string) =>
  replies.some(
    (reply) =>
      reply.reviewId === reviewId &&
      (reply.status === "sending" || reply.status === "unconfirmed")
  );

// The reviews once read.
const LoadedReviews = ({
  detail,
  mayReply,
  workspaceId,
}: {
  readonly detail: InboxReviewThreadDetail;
  readonly mayReply: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("InboxReviews");
  const answers = mayReply && detail.abilities.reply === "available";

  return (
    <div className="flex flex-col gap-4">
      {mayReply ? null : (
        <p className="text-muted-foreground text-sm">{t("thread.readOnly")}</p>
      )}
      {detail.reviews.length === 0 ? (
        <p className="text-muted-foreground">
          {t("thread.empty", { days: inboxReviewRetentionDays })}
        </p>
      ) : (
        <ul className="bg-card divide-y overflow-hidden rounded-md border">
          {detail.reviews.map((review) => (
            <ReviewView
              key={review.id}
              review={review}
              replies={detail.replies.filter(
                ({ reviewId }) => reviewId === review.id
              )}
              actions={
                answers ? (
                  <ReviewActions
                    pending={isPending(detail.replies, review.id)}
                    review={review}
                    workspaceId={workspaceId}
                  />
                ) : null
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * A location's reviews whole: each review, the location's reply, the
 * replies sent from Peal, and, for a member who may answer and where the
 * channel can, what to do about each. Rendered in the browser, where the
 * reader's time zone is known.
 */
export const ReviewScreen = ({
  mayReply,
  threadId,
  workspaceId,
}: {
  readonly mayReply: boolean;
  readonly threadId: string;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("InboxReviews");
  const hydrated = useHydrated();
  const atom = reviewLocation(workspaceId, threadId);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);

  useRefreshWhileVisible(reload, refreshEvery);

  if (!hydrated) {
    return <Skeleton className="h-48" />;
  }

  if (AsyncResult.isInitial(result)) {
    return <Skeleton className="h-48" />;
  }

  if (AsyncResult.isFailure(result)) {
    return (
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
    <LoadedReviews
      detail={result.value}
      mayReply={mayReply}
      workspaceId={workspaceId}
    />
  );
};
