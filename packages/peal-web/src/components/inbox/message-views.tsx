"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type {
  Channel,
  InboxConversation,
  InboxDirectMessage,
  InboxOutgoingMessage,
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

// The views of the inbox's direct messages: a conversation's row, a
// message, one sent from Peal and the box to answer in, whatever fetched
// them. Their state lives in messages-list.tsx and message-screen.tsx.
// What people wrote is shown as text, never as markup: React escapes it.

const useInstant = () => {
  const format = useFormatter();

  return (at: DateTime.Utc) =>
    format.dateTime(DateTime.toDate(at), {
      dateStyle: "medium",
      timeStyle: "short",
    });
};

const peopleOf = (conversation: InboxConversation): string =>
  conversation.participants
    .map(({ displayName, handle }) => displayName ?? handle)
    .join(", ");

/** A conversation's row in the inbox: who is in it, and whether it is read. */
export const ConversationRowView = ({
  channel,
  conversation,
  link,
  workspaceId,
}: {
  /** The conversation's channel, unless it was disconnected since. */
  readonly channel: Channel | undefined;
  readonly conversation: InboxConversation;
  readonly link: InboxLink;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("InboxMessages.row");
  const channelName = useChannelName();
  const instant = useInstant();

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span dir="auto" className="font-medium">
          {link(
            `/app/${workspaceId}/inbox/messages/${conversation.id}`,
            t("with", { people: peopleOf(conversation) })
          )}
        </span>
        <Badge variant={conversation.unread ? "default" : "outline"}>
          {conversation.unread ? t("unread") : t("read")}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">
        {channelName(channel)} · {t("count", { count: conversation.messages })}{" "}
        · {t("lastMessage", { at: instant(conversation.lastMessageAt) })}
      </p>
    </li>
  );
};

/** One message, as its platform gave it: who sent it, when, and its text. */
export const DirectMessageView = ({
  conversation,
  message,
}: {
  readonly conversation: InboxConversation;
  readonly message: InboxDirectMessage;
}) => {
  const t = useTranslations("InboxMessages.message");
  const instant = useInstant();

  const sender = conversation.participants.find(
    ({ platformId }) => platformId === message.senderPlatformId
  );

  return (
    <li
      className={
        message.fromAccount
          ? "bg-muted ml-8 flex flex-col gap-1 rounded-md px-3 py-2"
          : "mr-8 flex flex-col gap-1 rounded-md border px-3 py-2"
      }
    >
      <span className="text-muted-foreground text-xs">
        {message.fromAccount
          ? t("account")
          : (sender?.displayName ?? sender?.handle ?? t("them"))}{" "}
        · {instant(message.sentAt)}
        {message.attachments > 0
          ? ` · ${t("files", { count: message.attachments })}`
          : ""}
      </span>
      <p dir="auto" className="text-sm whitespace-pre-line">
        {message.text === "" ? t("noText") : message.text}
      </p>
    </li>
  );
};

/** A message sent from Peal, how it ended, and what a member may do about it. */
export const OutgoingMessageView = ({
  actions,
  message,
}: {
  /** What the member may do, already wired; none otherwise. */
  readonly actions: ReactNode;
  readonly message: InboxOutgoingMessage;
}) => {
  const t = useTranslations("InboxMessages.message");

  return (
    <li className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        {t("sent", { status: message.status })}
      </p>
      {actions}
    </li>
  );
};

/** The buttons that settle a message Peal could not confirm. */
export const ConfirmMessageView = ({
  disabled,
  onConfirm,
}: {
  readonly disabled: boolean;
  readonly onConfirm: (sent: boolean) => void;
}) => {
  const t = useTranslations("InboxMessages.message");

  return (
    <span className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => {
          onConfirm(true);
        }}
      >
        {t("confirmSent")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => {
          onConfirm(false);
        }}
      >
        {t("confirmNotSent")}
      </Button>
    </span>
  );
};

/** The box a member answers a conversation in. */
export const MessageBoxView = ({
  error,
  maximum,
  onChange,
  onSend,
  pending,
  sending,
  text,
}: {
  /** Why the last send failed, already written. */
  readonly error: string | null;
  readonly maximum: number;
  readonly onChange: (text: string) => void;
  readonly onSend: () => void;
  /** Whether a message to the conversation is on its way. */
  readonly pending: boolean;
  readonly sending: boolean;
  readonly text: string;
}) => {
  const t = useTranslations("InboxMessages.box");
  const id = useId();
  const hintId = useId();
  const countId = useId();
  // Counted as the server counts the most a member may write.
  const written = text.trim();
  const tooLong = written.length > maximum;
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
        {t("private")}
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
          {t("count", { length: written.length, maximum })}
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
