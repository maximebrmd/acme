"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { NewComment, Permission, Post } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "peal-ui/components/dialog";
import { Separator } from "peal-ui/components/separator";
import { Skeleton } from "peal-ui/components/skeleton";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { postsKeys } from "#posts/api.ts";
import { failureOf } from "#posts/outcome.ts";
import {
  addComment,
  approvePost,
  postReview,
  requestPostChanges,
  resolveThread,
  reviewKeys,
} from "#review/api.ts";
import { failureText } from "#review/failure-text.ts";
import type { ReviewFailure } from "#review/failure-text.ts";

import { ApprovalHistoryView } from "./approval-history-view.tsx";
import { CommentForm } from "./comment-form.tsx";
import { ReviewBoard } from "./review-board.tsx";
import { ReviewLinksPanel } from "./review-links-panel.tsx";

interface PostReviewSectionProps {
  readonly permissions: readonly Permission[];
  readonly post: Post;
  readonly workspaceId: string;
}

const unexpected: ReviewFailure = { _tag: "Unexpected" };

/**
 * A post's review, in the app: the approval it waits for and who may
 * decide, the post as its channels will receive it, which is what the
 * decision is for, what was decided before, its comments, and the links that show it
 * to people without an account.
 */
export const PostReviewSection = ({
  permissions,
  post,
  workspaceId,
}: PostReviewSectionProps) => {
  const t = useTranslations("Review");
  const query = postReview(workspaceId, post.id);
  const review = useAtomValue(query);
  const reload = useAtomRefresh(query);
  const comment = useAtomSet(addComment, { mode: "promiseExit" });
  const resolve = useAtomSet(resolveThread, { mode: "promiseExit" });
  const approve = useAtomSet(approvePost, { mode: "promiseExit" });
  const sendBack = useAtomSet(requestPostChanges, { mode: "promiseExit" });
  const [failure, setFailure] = useState<ReviewFailure | null>(null);
  const [isPending, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);
  const can = (permission: Permission) => permissions.includes(permission);
  const params = { postId: post.id, workspaceId };
  const waiting = post.status === "awaitingApproval";
  const mayDecide = waiting && can("post:approve");

  const settled = <A, E extends ReviewFailure>(exit: Exit.Exit<A, E>) => {
    const failed = Exit.isSuccess(exit)
      ? null
      : Option.getOrElse(failureOf(exit), () => unexpected);

    setFailure(failed);

    // A decision is for what this review showed: when the post says
    // something else now, the review shows it before anything is decided.
    if (failed?._tag === "ApprovalChanged") {
      reload();
    }

    return Exit.isSuccess(exit);
  };

  // The approval that waits, as this review shows it with the post it is
  // for: a decision names it, so it is for what was read here.
  const pending = AsyncResult.isSuccess(review)
    ? review.value.approvals.find(({ status }) => status === "pending")
    : undefined;

  const shown = {
    approvalId: pending?.id ?? "",
    subjectHash: pending?.subjectHash ?? "",
  };

  const onComment = async (payload: NewComment) =>
    settled(await comment({ params, payload, reactivityKeys: reviewKeys }));

  const onResolve = async (commentId: string, resolved: boolean) => {
    settled(
      await resolve({
        params: { ...params, commentId },
        payload: { resolved },
        reactivityKeys: reviewKeys,
      })
    );
  };

  const decide = () => {
    startTransition(async () => {
      const exit = await approve({
        params,
        payload: shown,
        reactivityKeys: [...reviewKeys, ...postsKeys],
      });

      if (settled(exit) && Exit.isSuccess(exit)) {
        toast.success(
          t(exit.value.late ? "decide.approvedLate" : "decide.approved")
        );
      }
    });
  };

  // Deciding waits for the review: it shows the post the decision is for.
  const canDecide = mayDecide && pending !== undefined;
  const mayWrite = can("post:create") || can("post:approve");

  const body = (() => {
    if (AsyncResult.isInitial(review)) {
      return (
        <div className="flex flex-col gap-3" aria-busy>
          <span className="sr-only">{t("loading")}</span>
          <Skeleton className="h-16" />
        </div>
      );
    }

    if (AsyncResult.isFailure(review)) {
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
      <>
        <ApprovalHistoryView approvals={review.value.approvals} />
        <ReviewBoard
          canComment={mayWrite}
          channels={review.value.channels}
          comments={review.value.comments}
          failure={failure === null ? null : failureText(t, failure)}
          media={review.value.media}
          onComment={onComment}
          onResolve={mayWrite ? onResolve : undefined}
        />
      </>
    );
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {waiting ? (
            <Alert>
              <AlertDescription>
                <span className="flex flex-col gap-3">
                  {t(mayDecide ? "decide.waitingForYou" : "decide.waiting")}
                  {canDecide ? (
                    <span className="flex flex-wrap gap-2">
                      <Button
                        disabled={isPending}
                        focusableWhenDisabled
                        onClick={decide}
                      >
                        {isPending
                          ? t("decide.approving")
                          : t("decide.approve")}
                      </Button>
                      <Dialog open={asking} onOpenChange={setAsking}>
                        <DialogTrigger render={<Button variant="outline" />}>
                          {t("decide.requestChanges")}
                        </DialogTrigger>
                        <DialogContent closeLabel={t("close")}>
                          <DialogHeader>
                            <DialogTitle>
                              {t("decide.changesTitle")}
                            </DialogTitle>
                            <DialogDescription>
                              {t("decide.changesDescription")}
                            </DialogDescription>
                          </DialogHeader>
                          <CommentForm
                            label={t("decide.changesLabel")}
                            submitLabel={t("decide.sendBack")}
                            submittingLabel={t("form.sending")}
                            onSubmit={async (text) => {
                              const taken = settled(
                                await sendBack({
                                  params,
                                  payload: { ...shown, comment: text },
                                  reactivityKeys: [...reviewKeys, ...postsKeys],
                                })
                              );

                              if (taken) {
                                setAsking(false);
                                toast.success(t("decide.sentBack"));
                              }

                              return taken;
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </span>
                  ) : null}
                </span>
              </AlertDescription>
            </Alert>
          ) : null}
          {body}
          <Separator />
          <ReviewLinksPanel
            canManage={can("post:approve")}
            postId={post.id}
            workspaceId={workspaceId}
          />
        </div>
      </CardContent>
    </Card>
  );
};
