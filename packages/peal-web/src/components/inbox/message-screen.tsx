"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { maxInboxMessageLength } from "peal-contract";
import type {
  InboxConversationDetail,
  InboxOutgoingMessage,
} from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { inboxErrorOf } from "#inbox/errors.ts";
import {
  confirmMessage,
  conversationDetail,
  conversationsChanged,
  sendMessage,
  setConversationRead,
} from "#inbox/message-atoms.ts";
import { useRefreshWhileVisible } from "#notices/use-refresh-while-visible.ts";

import { useInboxErrorText } from "./inbox-views.tsx";
import {
  ConfirmMessageView,
  DirectMessageView,
  MessageBoxView,
  OutgoingMessageView,
} from "./message-views.tsx";

// How often the conversation is read again while the tab is visible, so a
// message on its way shows how it ended.
const refreshEvery = 30_000;

// Whether a message to the conversation is on its way, or may be out.
const isPending = (sent: readonly InboxOutgoingMessage[]) =>
  sent.some(({ status }) => status === "sending" || status === "unconfirmed");

// What a member who may answer can do about a conversation.
const useActions = (workspaceId: string, conversationId: string) => {
  const explain = useInboxErrorText();
  const [error, setError] = useState<string | null>(null);

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

  return {
    error,
    failed,
    reactivityKeys: conversationsChanged(workspaceId, conversationId),
    setError,
  };
};

const LoadedConversation = ({
  detail,
  mayAnswer,
  workspaceId,
}: {
  readonly detail: InboxConversationDetail;
  readonly mayAnswer: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("InboxMessages");
  const { conversation } = detail;

  const { error, failed, reactivityKeys, setError } = useActions(
    workspaceId,
    conversation.id
  );

  const send = useAtomSet(sendMessage, { mode: "promiseExit" });
  const mark = useAtomSet(setConversationRead, { mode: "promiseExit" });
  const confirm = useAtomSet(confirmMessage, { mode: "promiseExit" });
  const [text, setText] = useState("");
  const [attempt, setAttempt] = useState(() => crypto.randomUUID());
  const [isSending, startSending] = useTransition();
  const [isActing, startActing] = useTransition();

  const params = { conversationId: conversation.id, workspaceId };

  const answers =
    mayAnswer && detail.abilities.send === "available" && detail.window.open;

  const handleSend = () => {
    setError(null);
    startSending(async () => {
      // The same key until the message is made: one sent again after a
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
        toast.success(t("box.sentToast"));

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
        payload: { read: conversation.unread },
        reactivityKeys,
      });

      if (Exit.isFailure(exit)) {
        failed(exit);
      }
    });
  };

  const handleConfirm = (messageId: string, sent: boolean) => {
    setError(null);
    startActing(async () => {
      const exit = await confirm({
        params: { messageId, workspaceId },
        payload: { sent },
        reactivityKeys,
      });

      if (Exit.isFailure(exit)) {
        failed(exit);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{t("thread.private")}</p>
      {mayAnswer ? (
        <div>
          <Button
            variant="outline"
            size="sm"
            disabled={isActing}
            onClick={handleMark}
          >
            {conversation.unread
              ? t("thread.markRead")
              : t("thread.markUnread")}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t("thread.readOnly")}</p>
      )}
      <ul className="flex flex-col gap-2">
        {detail.messages.map((message) => (
          <DirectMessageView
            key={message.id}
            conversation={conversation}
            message={message}
          />
        ))}
      </ul>
      <ul className="flex flex-col gap-2">
        {detail.sent
          .filter(({ status }) => status !== "sent")
          .map((message) => (
            <OutgoingMessageView
              key={message.id}
              message={message}
              actions={
                mayAnswer && message.status === "unconfirmed" ? (
                  <ConfirmMessageView
                    disabled={isActing}
                    onConfirm={(sent) => {
                      handleConfirm(message.id, sent);
                    }}
                  />
                ) : null
              }
            />
          ))}
      </ul>
      {conversation.request && answers ? (
        <p className="text-muted-foreground text-sm">{t("thread.request")}</p>
      ) : null}
      {mayAnswer && !detail.window.open ? (
        <p className="text-muted-foreground text-sm">{t("box.closed")}</p>
      ) : null}
      {answers ? (
        <MessageBoxView
          error={error}
          maximum={maxInboxMessageLength}
          pending={isPending(detail.sent)}
          sending={isSending}
          text={text}
          onChange={(changed) => {
            // Another text is another message, under a key of its own.
            setText(changed);
            setAttempt(crypto.randomUUID());
          }}
          onSend={handleSend}
        />
      ) : null}
      {!answers && error !== null ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
};

/**
 * A conversation whole: its messages, those sent from Peal and how each
 * ended, and, for a member who may answer and where the channel can, the
 * box to answer in. Rendered in the browser, where the reader's time zone
 * is known.
 */
export const MessageScreen = ({
  conversationId,
  mayAnswer,
  workspaceId,
}: {
  readonly conversationId: string;
  readonly mayAnswer: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("InboxMessages");
  const hydrated = useHydrated();
  const atom = conversationDetail(workspaceId, conversationId);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);

  useRefreshWhileVisible(reload, refreshEvery);

  if (!hydrated || AsyncResult.isInitial(result)) {
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
    <LoadedConversation
      detail={result.value}
      mayAnswer={mayAnswer}
      workspaceId={workspaceId}
    />
  );
};
