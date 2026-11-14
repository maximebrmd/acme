"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type {
  Channel,
  InboxReview,
  InboxReviewReply,
  InboxReviewThread,
} from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Label } from "peal-ui/components/label";
import { Textarea } from "peal-ui/components/textarea";
import { useId } from "react";
import type { ChangeEvent, ReactNode, SubmitEvent } from "react";

import type { InboxLink } from "./inbox-views.tsx";
import { useChannelName } from "./inbox-views.tsx";

// The views of the inbox's reviews: a location's row, a review, its
// replies and the reply box, whatever fetched them. Their state lives in
// reviews-list.tsx and review-screen.tsx. What people wrote on Google is
// shown as text, never as markup: React escapes it.

const useInstant = () => {
  const format = useFormatter();

  return (at: DateTime.Utc) =>
    format.dateTime(DateTime.toDate(at), {
      dateStyle: "medium",
      timeStyle: "short",
    });
};

/** A location's row in the inbox: its counts, and Google's figures. */
export const ReviewThreadRowView = ({
  channel,
  link,
  thread,
  workspaceId,
}: {
  /** The location's channel, unless it was disconnected since. */
  readonly channel: Channel | undefined;
  readonly link: InboxLink;
  readonly thread: InboxReviewThread;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("InboxReviews.row");
  const format = useFormatter();
  const channelName = useChannelName();
  const instant = useInstant();

  const average =
    thread.averageRating === null
      ? "none"
      : format.number(thread.averageRating, { maximumFractionDigits: 1 });

  const total =
    thread.totalReviewCount === null
      ? "none"
      : format.number(thread.totalReviewCount);

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          {link(
            `/app/${workspaceId}/inbox/reviews/${thread.id}`,
            t("location", { channel: channelName(channel) })
          )}
        </span>
        <Badge variant={thread.unanswered > 0 ? "default" : "outline"}>
          {t("counts", {
            reviews: thread.reviews,
            unanswered: thread.unanswered,
          })}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">
        {t("figures", { average, total })}
      </p>
      {thread.lastReviewAt === null ? null : (
        <p className="text-muted-foreground text-sm">
          {t("lastReview", { at: instant(thread.lastReviewAt) })}
        </p>
      )}
    </li>
  );
};

/** A reply sent from Peal to a review, and how it ended. */
export const ReviewReplyView = ({
  reply,
}: {
  readonly reply: InboxReviewReply;
}) => {
  const t = useTranslations("InboxReviews.review");

  return (
    <p className="text-muted-foreground text-sm">
      {t("reply", { status: reply.status })}
    </p>
  );
};

/**
 * One review: its stars, who wrote it (as they show themselves), its
 * text, how many photos it holds (never the photos), the location's
 * reply, and what a member may do about it.
 */
export const ReviewView = ({
  actions,
  replies,
  review,
}: {
  /** What the member may do, already wired; none when they only read. */
  readonly actions: ReactNode;
  readonly replies: readonly InboxReviewReply[];
  readonly review: InboxReview;
}) => {
  const t = useTranslations("InboxReviews.review");
  const instant = useInstant();

  return (
    <li className="flex flex-col gap-3 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          {review.reviewerName ?? t("anonymous")}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {t("stars", { rating: review.rating })}
          </Badge>
          <Badge variant={review.state === "new" ? "default" : "outline"}>
            {t("state", { state: review.state })}
          </Badge>
        </span>
      </div>
      <p className="text-muted-foreground text-xs">
        {DateTime.toEpochMillis(review.updatedAt) ===
        DateTime.toEpochMillis(review.writtenAt)
          ? t("written", { at: instant(review.writtenAt) })
          : t("changed", { at: instant(review.updatedAt) })}
        {review.photos > 0 ? ` · ${t("photos", { count: review.photos })}` : ""}
      </p>
      <p dir="auto" className="text-sm whitespace-pre-line">
        {review.text === "" ? t("noText") : review.text}
      </p>
      {review.reply === null ? null : (
        <div className="bg-muted flex flex-col gap-1 rounded-md px-3 py-2">
          <span className="text-xs font-medium">
            {t("ownerReply")}
            {review.reply.moderation === null
              ? ""
              : ` · ${t("moderation", { moderation: review.reply.moderation })}`}
          </span>
          <p dir="auto" className="text-sm whitespace-pre-line">
            {review.reply.text}
          </p>
        </div>
      )}
      {replies.map((reply) => (
        <ReviewReplyView key={reply.id} reply={reply} />
      ))}
      {actions}
    </li>
  );
};

/** The box a member answers a review in, counted in Google's bytes. */
export const ReviewReplyBoxView = ({
  bytes,
  error,
  maximum,
  onChange,
  onSend,
  pending,
  sending,
  text,
}: {
  /** How long the text is, in UTF-8 bytes. */
  readonly bytes: number;
  /** Why the last send failed, already written. */
  readonly error: string | null;
  readonly maximum: number;
  readonly onChange: (text: string) => void;
  readonly onSend: () => void;
  /** Whether a reply to the review is on its way. */
  readonly pending: boolean;
  readonly sending: boolean;
  readonly text: string;
}) => {
  const t = useTranslations("InboxReviews.box");
  const id = useId();
  const hintId = useId();
  const countId = useId();
  const tooLong = bytes > maximum;
  const empty = text.trim() === "";

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSend();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor={id}>{t("label")}</Label>
      <Textarea
        dir="auto"
        id={id}
        value={text}
        disabled={pending || sending}
        aria-invalid={tooLong}
        aria-describedby={`${hintId} ${countId}`}
        onChange={handleChange}
      />
      <span id={hintId} className="text-muted-foreground text-xs">
        {t("public")}
      </span>
      {error === null ? null : (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {pending ? <output className="text-sm">{t("pending")}</output> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          id={countId}
          aria-live="polite"
          className={
            tooLong
              ? "text-destructive text-sm"
              : "text-muted-foreground text-sm"
          }
        >
          {t("count", { length: bytes, maximum })}
        </span>
        <Button
          type="submit"
          size="sm"
          disabled={pending || sending || empty || tooLong}
          focusableWhenDisabled
        >
          {sending ? t("sending") : t("send")}
        </Button>
      </div>
    </form>
  );
};
