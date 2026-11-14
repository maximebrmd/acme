import { DateTime, Effect, Layer, Option } from "effect";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import { MessageSender } from "#engagement/application/ports/message-sender.ts";
import type { MessageSendRequest } from "#engagement/application/ports/message-sender.ts";
import { MessageSource } from "#engagement/application/ports/message-source.ts";
import type { MessagesRequest } from "#engagement/application/ports/message-source.ts";
import { MessageStore } from "#engagement/application/ports/message-store.ts";
import { dueForCheck } from "#engagement/domain/conversation.ts";
import {
  messageAbilitiesOf,
  readsMessagesOn,
} from "#engagement/domain/message-abilities.ts";
import type {
  MessageFailure,
  MessageSendOutcome,
} from "#engagement/domain/outgoing-message.ts";
import {
  databaseDown,
  needsReconnect,
  unusable,
} from "#engagement/infrastructure/platforms/channel-refusals.ts";
import type { PlatformHttp } from "#engagement/infrastructure/platforms/engagement-platform.ts";
import { CurrentInboxMessages } from "#shared/application/current-inbox-messages.ts";
import type { InboxMessagePlatform } from "#shared/domain/inbox-message-platform.ts";

import { blueskyMessages } from "./bluesky/bluesky-messages.ts";
import { mastodonMessages } from "./mastodon/mastodon-messages.ts";
import type { MessagePlatform } from "./message-platform.ts";

// What the gate answers for a message it did not call the platform for
// and cannot tell the fate of: one no longer on its way, whose job then
// finds it settled, or a resumed one.
const notClaimed: MessageSendOutcome = {
  _tag: "unconfirmed",
  reason: "interrupted",
};

const failedWith = (reason: MessageFailure): MessageSendOutcome => ({
  _tag: "failed",
  reason,
});

// Why nothing was sent, when the channels context gave no token.
const accessFailureOf = (failure: {
  readonly _tag: string;
}): MessageFailure => {
  if (failure._tag === "ChannelUnusable") {
    return "channelUnavailable";
  }

  return failure._tag === "TokenExpired"
    ? "reconnectNeeded"
    : "platformUnavailable";
};

/**
 * The direct messages of Mastodon and Bluesky, as the channel's gate runs
 * them: `MessageSource` reads a channel's conversations, `MessageSender`
 * sends what the engagement tables hold, found by id, so no text travels
 * with a call. Only where the inbox reads the platform's messages
 * (`readsMessagesOn`) and the channel granted what it takes
 * (`messageAbilitiesOf`): otherwise nothing is called. Needs
 * ChannelAccess, the MessageStore and CurrentInboxMessages.
 */
export const platformMessagesWith = (settings: {
  readonly http: PlatformHttp;
  /** The client conversations are read with, whose answers end rather than fail when long. */
  readonly reader: PlatformHttp;
  readonly mastodonScheme: "http:" | "https:";
}) =>
  Layer.unwrap(
    Effect.gen(function* PlatformMessages() {
      const access = yield* ChannelAccess;
      const store = yield* MessageStore;
      const messages = yield* CurrentInboxMessages;

      const platforms: Readonly<Record<InboxMessagePlatform, MessagePlatform>> =
        {
          bluesky: yield* blueskyMessages({ http: settings.http }),
          mastodon: yield* mastodonMessages({
            http: settings.http,
            reader: settings.reader,
            scheme: settings.mastodonScheme,
          }),
        };

      const read = Effect.fn("MessageSource.read")(function* read(
        request: MessagesRequest
      ) {
        const account = yield* access.account(request.channelId).pipe(
          Effect.catchTags({
            ChannelUnusable: unusable,
            DatabaseError: databaseDown,
            TokenExpired: needsReconnect,
          })
        );

        if (!readsMessagesOn(account.platform, messages)) {
          return yield* new ChannelUnreadable({ reason: "unsupported" });
        }

        // A channel connected before Peal asked what reading takes is
        // never called: it is read once connected again.
        if (
          messageAbilitiesOf(account.platform, account.scopes, messages)
            .read !== "available"
        ) {
          return yield* new ChannelUnreadable({ reason: "paused" });
        }

        const known = yield* store
          .conversationsOf(request.channelId)
          .pipe(Effect.catchTag("DatabaseError", databaseDown));

        const now = yield* DateTime.now;

        // A conversation not read back whole for a day is read back
        // whatever its revision says, so a deletion there is seen.
        const byPlatformId = new Map(
          known.map((conversation) => [
            conversation.platformConversationId,
            conversation.id,
          ])
        );

        // What Peal keeps of a conversation, read when the adapter asks;
        // none when the database does not answer, so nothing is deleted.
        const keptOf = (platformConversationId: string) => {
          const id = byPlatformId.get(platformConversationId);

          return id === undefined
            ? Effect.succeed([])
            : store.messagesOf(id).pipe(
                Effect.map((kept) =>
                  kept.map(({ platformMessageId }) => platformMessageId)
                ),
                Effect.orElseSucceed((): readonly string[] => [])
              );
        };

        return yield* platforms[account.platform].read(account, {
          keptOf,
          keptSince: request.keptSince,
          known: new Map(
            known.flatMap((conversation) =>
              dueForCheck(conversation, now)
                ? []
                : [
                    [
                      conversation.platformConversationId,
                      conversation.revision,
                    ] as const,
                  ]
            )
          ),
        });
      });

      // The channel's account, if it may send there, or why nothing can be
      // sent: each before any request to the platform.
      const reach = (request: MessageSendRequest) =>
        access.account(request.channelId).pipe(
          Effect.map(
            (
              account
            ): Option.Option<readonly [ChannelAccount, InboxMessagePlatform]> =>
              readsMessagesOn(account.platform, messages) &&
              messageAbilitiesOf(account.platform, account.scopes, messages)
                .send === "available"
                ? Option.some([account, account.platform] as const)
                : Option.none()
          ),
          Effect.mapError(accessFailureOf)
        );

      const sending = (
        request: MessageSendRequest,
        mode: "resume" | "send"
      ): Effect.Effect<MessageSendOutcome> =>
        Effect.gen(function* send() {
          // A resumed message may be out since its first run: whatever
          // keeps this run from asking the platform proves nothing.
          const stopped = (reason: MessageFailure): MessageSendOutcome =>
            mode === "send" ? failedWith(reason) : notClaimed;

          const message = yield* store.outgoing(request.messageId);

          const summary = yield* Option.match(message, {
            onNone: () => Effect.succeed(Option.none()),
            onSome: ({ conversationId }) => store.conversation(conversationId),
          });

          if (Option.isNone(message) || Option.isNone(summary)) {
            return stopped("conversationGone");
          }

          const reached = yield* reach(request).pipe(Effect.result);

          if (reached._tag === "Failure") {
            return stopped(reached.failure);
          }

          if (Option.isNone(reached.success)) {
            return stopped("channelUnavailable");
          }

          const [account, platform] = reached.success.value;
          const { conversation } = summary.value;
          const kept = yield* store.messagesOf(conversation.id);
          const others = yield* store.outgoingOf(conversation.id);

          // Claimed just before the call, and only while the message is on
          // its way: one handed over meanwhile is not sent.
          if (
            !(yield* store.claimCall(request.messageId, yield* DateTime.now))
          ) {
            return notClaimed;
          }

          return yield* platforms[platform][mode](account, {
            createdAt: message.value.createdAt,
            latestPlatformId: Option.fromUndefinedOr(
              kept.at(-1)?.platformMessageId
            ),
            messageId: message.value.id,
            participants: conversation.participants,
            platformConversationId: conversation.platformConversationId,
            request: conversation.request,
            takenIds: [
              ...kept
                .filter(({ fromAccount }) => fromAccount)
                .map(({ platformMessageId }) => platformMessageId),
              ...others.flatMap((other) =>
                other.id !== message.value.id && other.status._tag === "sent"
                  ? Option.toArray(other.status.platformMessageId)
                  : []
              ),
            ],
            text: message.value.text,
          });
        }).pipe(
          // Logged by its ids alone, never the failure's cause.
          Effect.catchTag("DatabaseError", () =>
            Effect.logWarning("Could not read a direct message to send").pipe(
              Effect.annotateLogs({
                channelId: request.channelId,
                messageId: request.messageId,
              }),
              Effect.as(
                mode === "send" ? failedWith("platformUnavailable") : notClaimed
              )
            )
          )
        );

      return Layer.mergeAll(
        Layer.succeed(MessageSource, MessageSource.of({ read })),
        Layer.succeed(
          MessageSender,
          MessageSender.of({
            resume: (request) => sending(request, "resume"),
            send: (request) => sending(request, "send"),
          })
        )
      );
    })
  );
