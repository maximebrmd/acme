"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type { ReviewComment, Reviewer } from "peal-contract";
import { Badge } from "peal-ui/components/badge";
import type { ReactNode } from "react";

import { threadsOf } from "#review/threads.ts";
import type { Thread } from "#review/threads.ts";

type Translate = ReturnType<typeof useTranslations<"Review">>;

/** Who commented or decided, as the page names them. */
export const reviewerName = (t: Translate, { kind, name }: Reviewer) => {
  if (kind === "apiKey") {
    return t("reviewer.apiKey");
  }

  if (kind === "visitor") {
    return name ?? t("reviewer.visitor");
  }

  return name ?? t("reviewer.formerMember");
};

interface CommentViewProps {
  /** The channels by id, to say which one a comment is about. */
  readonly channelNames: ReadonlyMap<string, string>;
  readonly comment: ReviewComment;
}

// The words a comment quotes, and whether the text still says them.
const About = ({ channelNames, comment }: CommentViewProps) => {
  const t = useTranslations("Review");
  const { anchor } = comment;

  if (anchor === null) {
    return null;
  }

  const channel = channelNames.get(anchor.channelId) ?? t("thread.aChannel");

  if (anchor.selection === null) {
    return (
      <p className="text-muted-foreground text-xs">
        {t("thread.aboutChannel", { channel })}
      </p>
    );
  }

  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="text-muted-foreground text-xs">
        {t(
          anchor.selection.located === null
            ? "thread.aboutWordsGone"
            : "thread.aboutWords",
          { channel }
        )}
      </figcaption>
      <blockquote
        dir="auto"
        className="border-l-2 pl-3 text-sm whitespace-pre-wrap"
      >
        {anchor.selection.quote}
      </blockquote>
    </figure>
  );
};

// One comment. Its text is what someone typed, possibly outside the
// workspace: it is rendered as text, never as markup.
const CommentView = ({ channelNames, comment }: CommentViewProps) => {
  const t = useTranslations("Review");
  const format = useFormatter();

  return (
    <article className="flex flex-col gap-2">
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{reviewerName(t, comment.author)}</span>
        {comment.author.kind === "visitor" ? (
          <Badge variant="outline">{t("reviewer.visitorBadge")}</Badge>
        ) : null}
        <time
          className="text-muted-foreground text-xs"
          dateTime={DateTime.formatIso(comment.createdAt)}
        >
          {format.dateTime(DateTime.toDate(comment.createdAt), {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </time>
        {comment.resolved === null ? null : (
          <Badge variant="secondary">{t("thread.resolved")}</Badge>
        )}
      </header>
      <About channelNames={channelNames} comment={comment} />
      <p dir="auto" className="text-sm break-words whitespace-pre-wrap">
        {comment.text}
      </p>
    </article>
  );
};

/**
 * One thread: the comment that started it, its answers, indented, then
 * what follows it (`children`: its answer form, its resolve button).
 */
export const ThreadView = ({
  channelNames,
  children,
  thread,
}: {
  readonly channelNames: ReadonlyMap<string, string>;
  readonly children?: ReactNode;
  readonly thread: Thread;
}) => (
  <li className="flex flex-col gap-3 rounded-lg border p-4">
    <CommentView channelNames={channelNames} comment={thread.root} />
    {thread.answers.length === 0 ? null : (
      <ul className="flex flex-col gap-3 border-l pl-4">
        {thread.answers.map((answer) => (
          <li key={answer.id}>
            <CommentView channelNames={channelNames} comment={answer} />
          </li>
        ))}
      </ul>
    )}
    {children}
  </li>
);

/** A post's comments, thread by thread, for a reader who only reads. */
export const CommentThreadsView = ({
  channelNames,
  comments,
}: {
  readonly channelNames: ReadonlyMap<string, string>;
  readonly comments: readonly ReviewComment[];
}) => {
  const t = useTranslations("Review");

  if (comments.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("thread.empty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {threadsOf(comments).map((thread) => (
        <ThreadView
          key={thread.root.id}
          channelNames={channelNames}
          thread={thread}
        />
      ))}
    </ul>
  );
};
