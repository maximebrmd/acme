"use client";

import { DateTime, Option } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import {
  inboxOptionalPlatforms,
  inboxRetentionDays,
  inboxStandardPlatforms,
  inboxWindowDays,
} from "peal-contract";
import type {
  Channel,
  InboxAbilityStanding,
  InboxAuthor,
  InboxComment,
  InboxReply,
  InboxThread,
  Platform,
} from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Label } from "peal-ui/components/label";
import { Textarea } from "peal-ui/components/textarea";
import { useId } from "react";
import type { ChangeEvent, ReactNode, SubmitEvent } from "react";

import type { InboxError } from "#inbox/errors.ts";
import type { ReplyFit } from "#inbox/reply-text.ts";
import { webAddressOf } from "#inbox/web-address.ts";

// The inbox's views: what a thread's row, a comment, a reply and the reply
// box look like, whatever fetched them. Their state lives in
// threads-list.tsx and thread-screen.tsx. What people wrote on a platform is
// shown as text, never as markup: React escapes it, and nothing here reads
// it as HTML or Markdown.

/** Writes a link of the app, which the page makes with its own navigation. */
export type InboxLink = (href: string, label: string) => ReactNode;

/** Writes why an inbox action failed, in the reader's language. */
export const useInboxErrorText = () => {
  const t = useTranslations("Inbox.errors");

  return (error: InboxError): string => {
    if (error.key === "actionFailed") {
      return t("actionFailed", { reason: error.reason });
    }

    if (error.key === "replyTooLong") {
      return t("replyTooLong", {
        length: error.length,
        maximum: error.maximum,
      });
    }

    if (error.key === "statusConflict") {
      return t("statusConflict", { status: error.status });
    }

    if (error.key === "unavailable") {
      return t("unavailable", { standing: error.standing });
    }

    return t(error.key);
  };
};

/** Names a channel as the composer does, or says it was disconnected. */
export const useChannelName = () => {
  const t = useTranslations("Posts");

  return (channel: Channel | undefined): string =>
    channel === undefined
      ? t("disconnectedChannel")
      : t("Composer.channelDetail", {
          handle: channel.handle,
          platform: t("platform", { platform: channel.platform }),
        });
};

const useInstant = () => {
  const format = useFormatter();

  return (at: DateTime.Utc) =>
    format.dateTime(DateTime.toDate(at), {
      dateStyle: "medium",
      timeStyle: "short",
    });
};

// A link to a platform's page, in a new tab, when its address is one a
// link may open.
const PlatformLink = ({
  address,
  children,
}: {
  readonly address: string | null;
  readonly children: ReactNode;
}) =>
  Option.match(webAddressOf(address), {
    onNone: () => null,
    onSome: (href) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="text-sm underline underline-offset-4"
      >
        {children}
      </a>
    ),
  });

/** What Peal collects, where and for how long. */
export const CollectionNote = () => {
  const t = useTranslations("Inbox");
  const tPosts = useTranslations("Posts");
  const format = useFormatter();

  return (
    <p className="text-muted-foreground text-sm">
      {t("collected", {
        optionalPlatforms: format.list(
          inboxOptionalPlatforms.map((platform) =>
            tPosts("platform", { platform })
          ),
          { type: "conjunction" }
        ),
        platforms: format.list(
          inboxStandardPlatforms.map((platform) =>
            tPosts("platform", { platform })
          ),
          { type: "conjunction" }
        ),
        retentionDays: inboxRetentionDays,
        windowDays: inboxWindowDays,
      })}
    </p>
  );
};

/**
 * What the list shows when it has no thread: that none matches the
 * filters, or that no comment was read yet, and what Peal collects.
 */
export const InboxEmptyView = ({
  filtered,
}: {
  readonly filtered: boolean;
}) => {
  const t = useTranslations("Inbox.list");

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-6">
      <p>{filtered ? t("emptyFiltered") : t("empty")}</p>
      <CollectionNote />
    </div>
  );
};

/**
 * One thread of the list: the comments under one post on one channel, how
 * many wait for an answer, and where to read them.
 */
export const ThreadRowView = ({
  channel,
  link,
  thread,
  workspaceId,
}: {
  /** The thread's channel, unless it was disconnected since. */
  readonly channel: Channel | undefined;
  readonly link: InboxLink;
  readonly thread: InboxThread;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Inbox.row");
  const channelName = useChannelName();
  const instant = useInstant();

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          {link(
            `/app/${workspaceId}/inbox/${thread.id}`,
            t("thread", { channel: channelName(channel) })
          )}
        </span>
        <Badge variant={thread.unanswered > 0 ? "default" : "outline"}>
          {t("counts", {
            comments: thread.comments,
            unanswered: thread.unanswered,
          })}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">
        {thread.lastCommentAt === null
          ? t("noComment")
          : t("lastComment", { at: instant(thread.lastCommentAt) })}
      </p>
      {thread.collectionEnded === null ? null : (
        <p className="text-muted-foreground text-sm">
          {t("ended", { reason: thread.collectionEnded })}
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {link(`/app/${workspaceId}/posts/${thread.postId}`, t("openPost"))}
        <PlatformLink address={thread.permalink}>
          {t("onPlatform")}
        </PlatformLink>
      </div>
    </li>
  );
};

/**
 * A thread's heading on its own page: its channel, since when the post is
 * live, why its comments are no longer read, and the ways out.
 */
export const ThreadSummaryView = ({
  channel,
  link,
  thread,
  workspaceId,
}: {
  readonly channel: Channel | undefined;
  readonly link: InboxLink;
  readonly thread: InboxThread;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Inbox");
  const channelName = useChannelName();
  const instant = useInstant();

  return (
    <div className="flex flex-col gap-2">
      <p>
        {t("thread.channel", {
          at: instant(thread.publishedAt),
          channel: channelName(channel),
        })}
      </p>
      <p>
        <Badge variant={thread.unanswered > 0 ? "default" : "outline"}>
          {t("row.counts", {
            comments: thread.comments,
            unanswered: thread.unanswered,
          })}
        </Badge>
      </p>
      {thread.collectionEnded === null ? null : (
        <p className="text-muted-foreground text-sm">
          {t("row.ended", { reason: thread.collectionEnded })}
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {link(`/app/${workspaceId}/posts/${thread.postId}`, t("row.openPost"))}
        <PlatformLink address={thread.permalink}>
          {t("row.onPlatform")}
        </PlatformLink>
      </div>
    </div>
  );
};

/**
 * Why nobody can reply in this thread: the account must be connected
 * again (`reconnect`, with `channels`, the way to the channels page), the
 * platform does not offer replies (`unsupported`), or the channel is gone.
 */
export const ReplyAbilityNotice = ({
  channels,
  disconnected,
  standing,
}: {
  readonly channels: ReactNode;
  /** Whether the thread's channel was disconnected. */
  readonly disconnected: boolean;
  readonly standing: InboxAbilityStanding;
}) => {
  const t = useTranslations("Inbox.abilities");

  if (disconnected) {
    return (
      <Alert>
        <AlertDescription>{t("disconnected")}</AlertDescription>
      </Alert>
    );
  }

  if (standing === "available") {
    return null;
  }

  return (
    <Alert>
      <AlertDescription>
        {standing === "reconnect" ? (
          <span className="flex flex-col gap-2">
            {t("reconnect")}
            <span>{channels}</span>
          </span>
        ) : (
          t("unsupported")
        )}
      </AlertDescription>
    </Alert>
  );
};

/** How a comment's author is addressed: with one "@" before the handle. */
export const handleOf = ({ handle }: InboxAuthor): string =>
  handle.startsWith("@") ? handle : `@${handle}`;

/**
 * What a comment's author is called where their platform gives neither a
 * name nor a handle: on LinkedIn, whose commenters Peal keeps by URN and
 * never by name, a member or a page by the kind of URN; elsewhere,
 * someone.
 */
export const namelessKey = (
  author: InboxAuthor | null,
  platform: Platform | null
): "linkedinMember" | "linkedinPage" | "unknownAuthor" => {
  if (platform !== "linkedin" || author === null) {
    return "unknownAuthor";
  }

  return author.platformId.startsWith("urn:li:organization:")
    ? "linkedinPage"
    : "linkedinMember";
};

/** Whether the platform gives the author neither a name nor a handle. */
export const isNameless = (author: InboxAuthor | null): boolean =>
  author === null ||
  ((author.displayName === null || author.displayName === "") &&
    author.handle === "");

// Who wrote a comment, as their platform shows them: plain text, each in
// a `bdi`, so a name written right to left never reorders what stands
// beside it.
const AuthorLine = ({
  author,
  platform,
}: {
  readonly author: InboxAuthor | null;
  readonly platform: Platform | null;
}) => {
  const t = useTranslations("Inbox.comment");

  // A missing author, or one their platform names by neither name nor
  // handle.
  if (author === null || isNameless(author)) {
    return (
      <span className="font-medium">{t(namelessKey(author, platform))}</span>
    );
  }

  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      {author.displayName === null || author.displayName === "" ? null : (
        <bdi className="font-medium break-words">{author.displayName}</bdi>
      )}
      {/* Facebook shows a name and no handle. */}
      {author.handle === "" ? null : (
        <bdi className="text-muted-foreground text-sm break-all">
          {handleOf(author)}
        </bdi>
      )}
    </span>
  );
};

const stateVariants = {
  answered: "outline",
  deleted: "ghost",
  hidden: "secondary",
  new: "default",
} as const;

/**
 * A reply sent from Peal, as the journal has it: on its way, sent, failed
 * with its reason, to check on the platform, or withdrawn. `actions` are
 * what the reader may do about it.
 */
export const ReplyView = ({
  actions,
  reply,
}: {
  readonly actions?: ReactNode;
  readonly reply: InboxReply;
}) => {
  const t = useTranslations("Inbox.reply");
  const instant = useInstant();
  const reason = t("reason", { reason: reply.reason ?? "unknown" });

  return (
    <li className="bg-muted/50 flex flex-col gap-2 rounded-lg p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">
          {t("from", { at: instant(reply.createdAt) })}
        </span>
        <Badge
          variant={
            reply.status === "failed" || reply.status === "unconfirmed"
              ? "destructive"
              : "outline"
          }
        >
          {t("status", { status: reply.status })}
        </Badge>
      </div>
      <p dir="auto" className="text-sm break-words whitespace-pre-wrap">
        {reply.text}
      </p>
      {reply.status === "failed" ? (
        <p className="text-sm">{t("failed", { reason })}</p>
      ) : null}
      {reply.status === "unconfirmed" ? (
        <p className="text-sm">{t("unconfirmed", { reason })}</p>
      ) : null}
      {reply.status === "withdrawn" ? (
        <p className="text-muted-foreground text-sm">{t("withdrawnNote")}</p>
      ) : null}
      {reply.status === "sent" ? (
        <PlatformLink address={reply.permalink}>{t("onPlatform")}</PlatformLink>
      ) : null}
      {actions === undefined ? null : (
        <div className="flex flex-wrap gap-2 empty:hidden">{actions}</div>
      )}
    </li>
  );
};

/**
 * One comment: who wrote it and when, its text as plain text, its state,
 * then the replies sent from Peal (`replies`), what the reader may do
 * (`actions`), the box to answer it (`replyBox`), and the comments that
 * answer it (`children`).
 */
export const CommentView = ({
  actions,
  children,
  comment,
  platform,
  replies,
  replyBox,
}: {
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
  readonly comment: InboxComment;
  /** The thread's platform, which a comment forgotten for its age names. */
  readonly platform?: Platform | null;
  readonly replies?: ReactNode;
  readonly replyBox?: ReactNode;
}) => {
  const t = useTranslations("Inbox.comment");
  const tPosts = useTranslations("Posts");
  const instant = useInstant();
  const deleted = comment.state === "deleted";
  // Forgotten because its platform bounds how long Peal keeps a comment
  // without reading it again: not the same as gone from the platform.
  const expired = deleted && comment.forgotten === "expired";

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <AuthorLine author={comment.author} platform={platform ?? null} />
        <span className="flex flex-wrap items-center gap-2">
          {comment.liked && !deleted ? (
            <Badge variant="outline">{t("liked")}</Badge>
          ) : null}
          <Badge variant={stateVariants[comment.state]}>
            {expired ? t("expiredState") : t("state", { state: comment.state })}
          </Badge>
        </span>
      </div>
      {deleted ? (
        <p className="text-muted-foreground text-sm italic">
          {expired
            ? t("expired", {
                platform:
                  platform === undefined || platform === null
                    ? t("somePlatform")
                    : tPosts("platform", { platform }),
              })
            : t("deleted")}
        </p>
      ) : (
        <p dir="auto" className="break-words whitespace-pre-wrap">
          {comment.text}
        </p>
      )}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span>{t("writtenAt", { at: instant(comment.writtenAt) })}</span>
        {deleted ? null : (
          <PlatformLink address={comment.permalink}>
            {t("onPlatform")}
          </PlatformLink>
        )}
      </div>
      {actions === undefined ? null : (
        <div className="flex flex-wrap gap-2 empty:hidden">{actions}</div>
      )}
      {replies === undefined ? null : (
        <ul aria-label={t("replies")} className="flex flex-col gap-2">
          {replies}
        </ul>
      )}
      {replyBox}
      {children === undefined ? null : (
        <ul
          aria-label={t("answers")}
          className="flex flex-col gap-3 border-l pl-4"
        >
          {children}
        </ul>
      )}
    </li>
  );
};

/**
 * The box to answer a comment: the text, its length against the platform's
 * limit, the mention Peal puts first on Mastodon, and why another reply
 * must wait (`pending`: the status of the one to settle first).
 */
export const ReplyBoxView = ({
  author,
  error,
  fit,
  onChange,
  onSend,
  pending,
  sending,
  text,
}: {
  /** Who the reply answers, as the label names them. */
  readonly author: string;
  /** Why the last send failed, already written. */
  readonly error: string | null;
  readonly fit: ReplyFit;
  readonly onChange: (text: string) => void;
  readonly onSend: () => void;
  readonly pending: "sending" | "unconfirmed" | null;
  /** Whether a send is being asked of the server. */
  readonly sending: boolean;
  readonly text: string;
}) => {
  const t = useTranslations("Inbox.box");
  const id = useId();
  const hintId = useId();
  const countId = useId();
  const tooLong = fit.remaining < 0;
  const blocked = pending !== null;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSend();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor={id}>{t("label", { author })}</Label>
      <Textarea
        dir="auto"
        id={id}
        value={text}
        disabled={blocked || sending}
        aria-invalid={tooLong}
        aria-describedby={`${hintId} ${countId}`}
        onChange={handleChange}
      />
      <div id={hintId} className="text-muted-foreground flex flex-col text-xs">
        <span>{t("public")}</span>
        {fit.mention === null ? null : (
          <span>{t("mention", { mention: fit.mention })}</span>
        )}
      </div>
      {error === null ? null : (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {blocked ? (
        <output className="text-sm">{t("pending", { status: pending })}</output>
      ) : null}
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
          {t("count", {
            length: fit.length,
            maximum: fit.maximum,
            unit: fit.unit,
          })}
          {tooLong ? (
            <span className="ml-2 font-medium">
              {t("tooLong", { over: -fit.remaining })}
            </span>
          ) : null}
        </span>
        <Button
          type="submit"
          size="sm"
          disabled={blocked || sending || fit.empty || tooLong}
          focusableWhenDisabled
        >
          {sending ? t("sending") : t("send")}
        </Button>
      </div>
    </form>
  );
};
