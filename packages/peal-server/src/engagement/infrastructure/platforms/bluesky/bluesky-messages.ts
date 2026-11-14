import { DateTime, Duration, Effect, Metric, Option, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import type {
  MessagesBatch,
  MessagesReadFailure,
} from "#engagement/application/ports/message-source.ts";
import type { ConversationReading } from "#engagement/domain/conversation.ts";
import type { MessageReading } from "#engagement/domain/direct-message.ts";
import type {
  MessageFailure,
  MessageSendOutcome,
} from "#engagement/domain/outgoing-message.ts";
import {
  databaseDown,
  messageRefusedWith,
  needsReconnect,
  unusable,
} from "#engagement/infrastructure/platforms/channel-refusals.ts";
import type { PlatformHttp } from "#engagement/infrastructure/platforms/engagement-platform.ts";
import type {
  MessagePlatform,
  MessagesToRead,
  OutgoingDirect,
} from "#engagement/infrastructure/platforms/message-platform.ts";
import { messagesListingTruncated } from "#engagement/infrastructure/platforms/messages-listing.ts";
import { blueskyChatService } from "#shared/domain/bluesky-scopes.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { sessionOf } from "#shared/infrastructure/platforms/bluesky/bluesky-session.ts";
import type { BlueskySession } from "#shared/infrastructure/platforms/bluesky/bluesky-session.ts";
import { dpopSender } from "#shared/infrastructure/platforms/bluesky/dpop.ts";
import { facetsOf } from "#shared/infrastructure/platforms/bluesky/facets.ts";

export interface BlueskyMessagesOptions {
  readonly http: PlatformHttp;
  /** How long a read may keep the channel's gate. */
  readonly deadline?: Duration.Duration;
}

const defaultDeadline = Duration.seconds(30);

/**
 * The lexicons' largest pages (`listConvos` and `getMessages`, `limit` 1
 * to 100), and the pages a read goes through: 500 conversations, and 500
 * messages of each changed conversation, back to what Peal keeps; past
 * them the read halts, or the conversation's read is not complete.
 */
const pageSize = 100;

const maxPages = 5;

/** How long before a message was written its copy on the platform may say it was sent. */
const clockSkew = Duration.minutes(1);

const ProfileSchema = Schema.Struct({
  did: Schema.NonEmptyString,
  displayName: Schema.optionalKey(Schema.String),
  handle: Schema.String,
});

// The views of chat.bsky.convo.defs Peal reads: a message (its id, text,
// sender, when, and whether it embeds something), a deleted one, and
// anything else (a system message) as nothing.
const MessageViewSchema = Schema.Struct({
  $type: Schema.optionalKey(Schema.String),
  embed: Schema.optionalKey(Schema.Unknown),
  id: Schema.NonEmptyString,
  sender: Schema.optionalKey(Schema.Struct({ did: Schema.String })),
  sentAt: Schema.optionalKey(Schema.String),
  text: Schema.optionalKey(Schema.String),
});

type MessageView = typeof MessageViewSchema.Type;

const ConvoViewSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  kind: Schema.optionalKey(
    Schema.Struct({ $type: Schema.optionalKey(Schema.String) })
  ),
  lastMessage: Schema.optionalKey(MessageViewSchema),
  members: Schema.Array(ProfileSchema),
  rev: Schema.String,
  status: Schema.optionalKey(Schema.String),
});

type ConvoView = typeof ConvoViewSchema.Type;

const convosOf = HttpClientResponse.schemaBodyJson(
  Schema.Struct({
    convos: Schema.Array(ConvoViewSchema),
    cursor: Schema.optionalKey(Schema.String),
  })
);

const messagesOf = HttpClientResponse.schemaBodyJson(
  Schema.Struct({
    cursor: Schema.optionalKey(Schema.String),
    messages: Schema.Array(MessageViewSchema),
  })
);

const sentOf = HttpClientResponse.schemaBodyJson(
  Schema.Struct({ id: Schema.NonEmptyString })
);

const XrpcErrorSchema = Schema.Struct({
  error: Schema.optionalKey(Schema.String),
});

const errorNameOf = (response: HttpClientResponse.HttpClientResponse) =>
  HttpClientResponse.schemaBodyJson(XrpcErrorSchema)(response).pipe(
    Effect.map(({ error }) => Option.fromUndefinedOr(error)),
    Effect.orElseSucceed(() => Option.none<string>())
  );

// Names a PDS gives a token it will not take any more.
const tokenErrors: ReadonlySet<string> = new Set([
  "ExpiredToken",
  "InvalidToken",
]);

const deletedType = "chat.bsky.convo.defs#deletedMessageView";

const messageType = "chat.bsky.convo.defs#messageView";

const groupType = "chat.bsky.convo.defs#groupConvo";

const isDeleted = (view: MessageView) => view.$type === deletedType;

// A view is a message when it says so, or carries what one carries.
const isMessage = (view: MessageView) =>
  view.$type === messageType ||
  (view.$type === undefined && view.text !== undefined);

const sentAtOf = (view: MessageView): Option.Option<DateTime.Utc> =>
  Option.fromUndefinedOr(view.sentAt).pipe(
    Option.flatMap((at) => DateTime.make(at))
  );

const readingOf = (
  view: MessageView,
  did: string
): Option.Option<MessageReading> =>
  isMessage(view)
    ? Option.all({
        sender: Option.fromUndefinedOr(view.sender?.did),
        sentAt: sentAtOf(view),
      }).pipe(
        Option.map(({ sender, sentAt }): MessageReading => ({
          attachments: view.embed === undefined ? 0 : 1,
          fromAccount: sender === did,
          platformMessageId: view.id,
          senderPlatformId: Option.some(sender),
          sentAt,
          text: view.text ?? "",
        }))
      )
    : Option.none();

// Whether a conversation is one Peal reads back: a direct one, with a
// message Peal may keep, changed or due for its daily check.
const needsReadBack = (convo: ConvoView, request: MessagesToRead) =>
  convo.kind?.$type !== groupType &&
  Option.fromUndefinedOr(convo.lastMessage).pipe(
    Option.flatMap(sentAtOf),
    Option.exists((at) =>
      DateTime.isGreaterThanOrEqualTo(at, request.keptSince)
    )
  ) &&
  request.known.get(convo.id) !== convo.rev;

const undecided: MessageSendOutcome = {
  _tag: "unconfirmed",
  reason: "interrupted",
};

const unanswered: MessageSendOutcome = {
  _tag: "unconfirmed",
  reason: "noResponse",
};

/**
 * Bluesky's direct messages, from the `chat.bsky.convo` lexicons at the
 * installed atproto (`listConvos`, `getMessages`, `acceptConvo`,
 * `sendMessage`) and the API directory (read 2026-11-14): chat is
 * Bluesky's central service, reached through the account's PDS with the
 * `atproto-proxy` header naming it (`blueskyChatService`), each call
 * allowed by its `rpc` scope. The account's direct conversations are
 * listed (groups are not read); one whose `rev` changed since Peal read
 * it is read back, the latest message first, to the oldest Peal keeps.
 * A message the platform deleted is a `deletedMessageView`, which Peal
 * deletes. Sending takes no idempotency key: a resume never sends, it
 * looks for the message among the conversation's latest, and answers
 * `sent` only when exactly one of the account's, written since, has its
 * text.
 */
export const blueskyMessages = Effect.fn("BlueskyMessages.make")(
  function* blueskyMessages(options: BlueskyMessagesOptions) {
    const access = yield* ChannelAccess;
    const { http } = options;
    const dpop = yield* dpopSender(http);
    const deadlineAfter = options.deadline ?? defaultDeadline;

    // A call to the chat service, through the account's PDS.
    const chat = (
      session: BlueskySession,
      request: HttpClientRequest.HttpClientRequest
    ) =>
      dpop.send(
        session,
        request.pipe(
          HttpClientRequest.setHeader("atproto-proxy", blueskyChatService)
        )
      );

    const getting = (
      session: BlueskySession,
      method: string,
      params: Readonly<Record<string, string>>
    ) => {
      const url = new URL(`/xrpc/${method}`, session.pds);

      for (const [name, value] of Object.entries(params)) {
        url.searchParams.set(name, value);
      }

      return chat(session, HttpClientRequest.get(url));
    };

    // What an answer that is not a success means for a read: the PDS's
    // own refusal of the token renews it; a refusal of the scope pauses
    // the channel, never marks it to reconnect, as the account's
    // publishing still works.
    const readRefusal = Effect.fn("BlueskyMessages.readRefusal")(
      function* readRefusal(response: HttpClientResponse.HttpClientResponse) {
        const name = yield* errorNameOf(response);

        if (
          (response.status === 401 || response.status === 400) &&
          Option.exists(name, (named) => tokenErrors.has(named))
        ) {
          return yield* new TokenRejected();
        }

        if (response.status === 401 || response.status === 403) {
          return yield* new ChannelUnreadable({ reason: "paused" });
        }

        if (response.status === 429) {
          return yield* new RateLimited({});
        }

        return yield* new PlatformUnavailable();
      }
    );

    const answerOf = <A, E>(
      sent: ReturnType<typeof getting>,
      decode: (
        response: HttpClientResponse.HttpClientResponse
      ) => Effect.Effect<A, E>
    ): Effect.Effect<
      A,
      ChannelUnreadable | PlatformUnavailable | RateLimited | TokenRejected
    > =>
      Effect.gen(function* answering() {
        const response = yield* sent.pipe(
          Effect.mapError((failure): PlatformUnavailable | TokenRejected =>
            failure._tag === "TokenRejected"
              ? new TokenRejected()
              : new PlatformUnavailable()
          )
        );

        if (response.status !== 200) {
          return yield* readRefusal(response);
        }

        return yield* decode(response).pipe(
          Effect.mapError(() => new PlatformUnavailable())
        );
      });

    // A conversation's messages, the latest first, back to `keptSince`.
    const messagesBack = Effect.fn("BlueskyMessages.messagesBack")(
      function* messagesBack(
        session: BlueskySession,
        convoId: string,
        keptSince: DateTime.Utc
      ) {
        const messages: MessageReading[] = [];
        const deleted: string[] = [];
        let cursor = Option.none<string>();

        for (let page = 0; page < maxPages; page += 1) {
          const answer = yield* answerOf(
            getting(session, "chat.bsky.convo.getMessages", {
              convoId,
              limit: String(pageSize),
              ...Option.match(cursor, {
                onNone: () => ({}),
                onSome: (value) => ({ cursor: value }),
              }),
            }),
            messagesOf
          );

          let reachedOlder = false;

          for (const view of answer.messages) {
            const sentAt = sentAtOf(view);

            if (
              Option.exists(sentAt, (at) => DateTime.isLessThan(at, keptSince))
            ) {
              reachedOlder = true;
            } else if (isDeleted(view)) {
              deleted.push(view.id);
            } else {
              messages.push(...Option.toArray(readingOf(view, session.did)));
            }
          }

          cursor = Option.fromUndefinedOr(answer.cursor);

          if (reachedOlder || Option.isNone(cursor)) {
            return { complete: true, deleted, messages };
          }
        }

        return { complete: false, deleted, messages };
      }
    );

    const readAll = Effect.fn("BlueskyMessages.readAll")(function* readAll(
      session: BlueskySession,
      request: MessagesToRead
    ) {
      const deadline = DateTime.addDuration(yield* DateTime.now, deadlineAfter);
      const readings: ConversationReading[] = [];
      const seen: string[] = [];
      let cursor = Option.none<string>();

      const pastDeadline = DateTime.now.pipe(
        Effect.map((now) => DateTime.isGreaterThanOrEqualTo(now, deadline))
      );

      const halted = (): MessagesBatch => ({
        conversations: readings,
        halted: true,
        listed: seen,
        listedWhole: false,
      });

      for (let page = 0; page < maxPages; page += 1) {
        if (yield* pastDeadline) {
          return halted();
        }

        const answer = yield* answerOf(
          getting(session, "chat.bsky.convo.listConvos", {
            limit: String(pageSize),
            ...Option.match(cursor, {
              onNone: () => ({}),
              onSome: (value) => ({ cursor: value }),
            }),
          }),
          convosOf
        );

        for (const convo of answer.convos) {
          seen.push(convo.id);

          // A read-back may take several calls: none starts past the
          // read's time, so the channel's gate is never held long.
          if (needsReadBack(convo, request)) {
            if (yield* pastDeadline) {
              return halted();
            }

            const reading = yield* changedReading(session, convo, request);

            readings.push(...Option.toArray(reading));
          }
        }

        cursor = Option.fromUndefinedOr(answer.cursor);

        // The list runs from the latest activity: a page wholly older
        // than what Peal keeps ends what it may hold, as the last does.
        const pastKept = answer.convos.every(
          (listed) =>
            !Option.fromUndefinedOr(listed.lastMessage).pipe(
              Option.flatMap(sentAtOf),
              Option.exists((at) =>
                DateTime.isGreaterThanOrEqualTo(at, request.keptSince)
              )
            )
        );

        if (Option.isNone(cursor) || pastKept) {
          const batch: MessagesBatch = {
            conversations: readings,
            halted: false,
            listed: seen,
            listedWhole: true,
          };

          return batch;
        }
      }

      yield* Metric.update(messagesListingTruncated, 1);

      return halted();
    });

    // A direct conversation changed since Peal read it, with a message
    // Peal may keep, read back; any other, nothing.
    const changedReading = Effect.fn("BlueskyMessages.changed")(
      function* changedReading(
        session: BlueskySession,
        convo: ConvoView,
        request: MessagesToRead
      ) {
        const lastAt = Option.fromUndefinedOr(convo.lastMessage).pipe(
          Option.flatMap(sentAtOf),
          Option.filter((at) =>
            DateTime.isGreaterThanOrEqualTo(at, request.keptSince)
          )
        );

        if (
          convo.kind?.$type === groupType ||
          Option.isNone(lastAt) ||
          request.known.get(convo.id) === convo.rev
        ) {
          return Option.none<ConversationReading>();
        }

        const read = yield* messagesBack(session, convo.id, request.keptSince);

        return Option.some<ConversationReading>({
          complete: read.complete,
          deleted: read.deleted,
          lastMessageAt: lastAt.value,
          messages: read.messages,
          participants: convo.members
            .filter(({ did }) => did !== session.did)
            .map((member) => ({
              displayName: Option.fromUndefinedOr(member.displayName).pipe(
                Option.filter((name) => name !== "")
              ),
              handle: member.handle,
              platformId: member.did,
            })),
          platformConversationId: convo.id,
          request: convo.status === "request",
          revision: convo.rev,
        });
      }
    );

    const read = (
      account: ChannelAccount,
      request: MessagesToRead
    ): Effect.Effect<MessagesBatch, MessagesReadFailure> =>
      access
        .withToken(account.channelId, ({ accessToken }) =>
          sessionOf(accessToken).pipe(
            Effect.flatMap((session) => readAll(session, request))
          )
        )
        .pipe(
          Effect.catchTags({
            ChannelUnusable: unusable,
            DatabaseError: databaseDown,
            TokenExpired: needsReconnect,
          })
        );

    // What an answer that is not a success means for a write.
    const refusalOn = Effect.fn("BlueskyMessages.refusal")(function* refusalOn(
      response: HttpClientResponse.HttpClientResponse
    ) {
      const name = yield* errorNameOf(response);

      if (Option.exists(name, (named) => tokenErrors.has(named))) {
        return yield* new TokenRejected();
      }

      if (response.status === 401 || response.status === 403) {
        return "reconnectNeeded" as const;
      }

      if (response.status === 429) {
        return "rateLimited" as const;
      }

      if (response.status >= 500) {
        return "platformUnavailable" as const;
      }

      return Option.contains(name, "InvalidConvo")
        ? ("conversationGone" as const)
        : ("refused" as const);
    });

    const posting = (
      session: BlueskySession,
      method: string,
      body: typeof Schema.Json.Type
    ) =>
      chat(
        session,
        HttpClientRequest.post(new URL(`/xrpc/${method}`, session.pds)).pipe(
          HttpClientRequest.bodyJsonUnsafe(body)
        )
      ).pipe(Effect.result);

    const create = Effect.fn("BlueskyMessages.send")(function* create(
      session: BlueskySession,
      message: OutgoingDirect
    ) {
      // Accepting first is safe to repeat, and sends nothing to anyone.
      if (message.request) {
        const accepted = yield* posting(
          session,
          "chat.bsky.convo.acceptConvo",
          {
            convoId: message.platformConversationId,
          }
        );

        if (accepted._tag === "Failure") {
          return accepted.failure._tag === "TokenRejected"
            ? yield* accepted.failure
            : ({ _tag: "failed", reason: "platformUnavailable" } as const);
        }

        if (accepted.success.status !== 200) {
          const reason: MessageFailure = yield* refusalOn(accepted.success);

          return { _tag: "failed", reason } as const;
        }
      }

      const facets = facetsOf(message.text);

      const sent = yield* posting(session, "chat.bsky.convo.sendMessage", {
        convoId: message.platformConversationId,
        message:
          facets.length === 0
            ? { text: message.text }
            : { facets: [...facets], text: message.text },
      });

      if (sent._tag === "Failure") {
        // Refused for its token before the PDS did anything; otherwise
        // the request may have reached it.
        return sent.failure._tag === "TokenRejected"
          ? yield* sent.failure
          : unanswered;
      }

      const response = sent.success;

      if (response.status === 200) {
        return yield* sentOf(response).pipe(
          Effect.map(({ id }): MessageSendOutcome => ({
            _tag: "sent",
            platformMessageId: id,
          })),
          Effect.orElseSucceed(() => unanswered)
        );
      }

      if (response.status >= 500) {
        return unanswered;
      }

      const reason: MessageFailure = yield* refusalOn(response);

      return { _tag: "failed", reason } as const;
    });

    // Looks for the message among the conversation's latest: exactly one
    // of the account's, written since it was, with its text, and taken by
    // no other.
    const lookUp = Effect.fn("BlueskyMessages.lookUp")(function* lookUp(
      session: BlueskySession,
      message: OutgoingDirect
    ) {
      const answer = yield* answerOf(
        getting(session, "chat.bsky.convo.getMessages", {
          convoId: message.platformConversationId,
          limit: String(pageSize),
        }),
        messagesOf
      ).pipe(Effect.option);

      if (Option.isNone(answer)) {
        return undecided;
      }

      const since = DateTime.subtractDuration(message.createdAt, clockSkew);
      const taken = new Set(message.takenIds);

      const found = answer.value.messages.filter(
        (view) =>
          isMessage(view) &&
          view.sender?.did === session.did &&
          view.text === message.text &&
          !taken.has(view.id) &&
          Option.exists(sentAtOf(view), (at) =>
            DateTime.isGreaterThanOrEqualTo(at, since)
          )
      );

      const [only] = found;

      return found.length === 1 && only !== undefined
        ? ({ _tag: "sent", platformMessageId: only.id } as const)
        : undecided;
    });

    const asAccount = (
      account: ChannelAccount,
      onRefused: (reason: MessageFailure) => MessageSendOutcome,
      use: (
        session: BlueskySession
      ) => Effect.Effect<MessageSendOutcome, TokenRejected>
    ): Effect.Effect<MessageSendOutcome> =>
      access
        .withToken(account.channelId, ({ accessToken }) =>
          sessionOf(accessToken).pipe(Effect.flatMap(use))
        )
        .pipe(Effect.catch(messageRefusedWith(onRefused)));

    const platform: MessagePlatform = {
      read,
      resume: (account, message) =>
        asAccount(
          account,
          () => undecided,
          (session) => lookUp(session, message)
        ),
      send: (account, message) =>
        asAccount(
          account,
          (reason) => ({ _tag: "failed", reason }),
          (session) => create(session, message)
        ),
    };

    return platform;
  }
);
