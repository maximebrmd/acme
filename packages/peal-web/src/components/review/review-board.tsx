"use client";

import { useTranslations } from "next-intl";
import type { NewComment, Poll, ReviewComment } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { useState, useTransition } from "react";

import { threadsOf } from "#review/threads.ts";
import type { ChosenWords } from "#review/threads.ts";
import { useChosenWords } from "#review/use-chosen-words.ts";

import { ChannelPreviewsView } from "./channel-previews-view.tsx";
import type {
  PreviewedChannel,
  PreviewedMedia,
} from "./channel-previews-view.tsx";
import { CommentForm } from "./comment-form.tsx";
import { ThreadView } from "./comment-threads-view.tsx";

interface ReviewBoardProps {
  /** Whether the reader may comment and answer. */
  readonly canComment: boolean;
  readonly channels: readonly PreviewedChannel[];
  readonly comments: readonly ReviewComment[];
  /** What went wrong with the last request, in words. */
  readonly failure: string | null;
  /**
   * Whether the reader said who they are, where each comment needs it: a
   * visitor's name. Members are known.
   */
  readonly identityComplete?: boolean | undefined;
  readonly media: readonly PreviewedMedia[];
  /** Sends a comment, and says whether it was taken. */
  readonly onComment: (comment: NewComment) => Promise<boolean>;
  /** Resolves or reopens a thread; none where the reader may not. */
  readonly onResolve?:
    | ((commentId: string, resolved: boolean) => Promise<void>)
    | undefined;
  /** The poll the post asks, which an approval covers. */
  readonly poll?: Poll | undefined;
}

// What the answer form and the resolve button of one thread do.
const ThreadActions = ({
  canComment,
  identityComplete,
  onComment,
  onResolve,
  root,
}: Pick<
  ReviewBoardProps,
  "canComment" | "identityComplete" | "onComment" | "onResolve"
> & { readonly root: ReviewComment }) => {
  const t = useTranslations("Review");
  const [answering, setAnswering] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!canComment && onResolve === undefined) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {canComment && !answering ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAnswering(true);
            }}
          >
            {t("thread.answer")}
          </Button>
        ) : null}
        {onResolve === undefined ? null : (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            focusableWhenDisabled
            onClick={() => {
              startTransition(async () => {
                await onResolve(root.id, root.resolved === null);
              });
            }}
          >
            {t(root.resolved === null ? "thread.resolve" : "thread.reopen")}
          </Button>
        )}
      </div>
      {answering ? (
        <CommentForm
          complete={identityComplete ?? true}
          label={t("form.answerLabel")}
          submitLabel={t("form.answer")}
          submittingLabel={t("form.sending")}
          onSubmit={async (text) => {
            const taken = await onComment({ parentId: root.id, text });

            if (taken) {
              setAnswering(false);
            }

            return taken;
          }}
        />
      ) : null}
    </div>
  );
};

const anchorOf = (chosen: ChosenWords | null) =>
  chosen === null
    ? {}
    : {
        anchor: {
          channelId: chosen.channelId,
          selection: { quote: chosen.quote, start: chosen.start },
        },
      };

/**
 * A post under review: how each channel will receive it, then its comments
 * and where to add one. Selecting words of a channel's text makes the next
 * comment about them.
 */
export const ReviewBoard = ({
  canComment,
  channels,
  comments,
  failure,
  identityComplete,
  media,
  onComment,
  onResolve,
  poll,
}: ReviewBoardProps) => {
  const t = useTranslations("Review");
  const [chosen, forget] = useChosenWords();

  const channelNames: ReadonlyMap<string, string> = new Map(
    channels.map(({ channelId, handle }) => [
      channelId,
      handle ?? t("preview.disconnected"),
    ])
  );

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="review-preview-title"
        className="flex flex-col gap-3"
      >
        <h2 id="review-preview-title" className="text-lg font-semibold">
          {t("preview.title")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t(canComment ? "preview.hintSelect" : "preview.hint")}
        </p>
        <ChannelPreviewsView channels={channels} media={media} poll={poll} />
      </section>
      <section
        aria-labelledby="review-comments-title"
        className="flex flex-col gap-4"
      >
        <h2 id="review-comments-title" className="text-lg font-semibold">
          {t("thread.title")}
        </h2>
        {comments.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("thread.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {threadsOf(comments).map((thread) => (
              <ThreadView
                key={thread.root.id}
                channelNames={channelNames}
                thread={thread}
              >
                <ThreadActions
                  canComment={canComment}
                  identityComplete={identityComplete}
                  root={thread.root}
                  onComment={onComment}
                  onResolve={onResolve}
                />
              </ThreadView>
            ))}
          </ul>
        )}
        {failure === null ? null : (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
        {canComment ? (
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            {chosen === null ? null : (
              <output className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs">
                  {t("form.aboutWords", {
                    channel:
                      channelNames.get(chosen.channelId) ??
                      t("thread.aChannel"),
                  })}
                </p>
                <blockquote
                  dir="auto"
                  className="border-l-2 pl-3 text-sm whitespace-pre-wrap"
                >
                  {chosen.quote}
                </blockquote>
                <div>
                  <Button variant="ghost" size="sm" onClick={forget}>
                    {t("form.wholePost")}
                  </Button>
                </div>
              </output>
            )}
            <CommentForm
              complete={identityComplete ?? true}
              label={t("form.commentLabel")}
              submitLabel={t("form.comment")}
              submittingLabel={t("form.sending")}
              onSubmit={async (text) => {
                const taken = await onComment({ ...anchorOf(chosen), text });

                if (taken) {
                  forget();
                }

                return taken;
              }}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
};
