import { DateTime, Duration, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import type {
  MessagesBatch,
  MessagesReadFailure,
} from "#engagement/application/ports/message-source.ts";
import type {
  ConversationReading,
  Participant,
} from "#engagement/domain/conversation.ts";
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
import { threadBodyOf } from "#engagement/infrastructure/platforms/thread-body.ts";
import { textOfHtml } from "#shared/domain/html-text.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";

export interface MastodonMessagesOptions {
  readonly http: PlatformHttp;
  /**
   * The client contexts are read with, whose answers end at
   * `maxThreadBytes` rather than fail past a megabyte; `http` otherwise.
   */
  readonly reader?: PlatformHttp;
  /** `https:`, or `http:` for tests against a local fake. */
  readonly scheme: "http:" | "https:";
  /** How long a read may keep the channel's gate. */
  readonly deadline?: Duration.Duration;
}

const defaultDeadline = Duration.seconds(30);

/**
 * The conversations a page lists, at most (the reference: "Max 40
 * conversations"), and the pages a read goes through: 200 conversations,
 * the latest first, which reaches back 30 days for any account Peal
 * serves; past them the read halts and the next run goes on.
 */
const pageSize = 40;

const maxPages = 5;

/** What an authenticated context gives at most (the reference: 4,096 descendants). */
const contextCeiling = 4096;

// Mastodon keeps an Idempotency-Key for an hour; resending with it is
// trusted for a little less, so the key cannot lapse during the resend.
const idempotencyWindow = Duration.minutes(50);

// The channels context names a Mastodon account `<id>@<host>`.
const accountPattern = /^(?<id>[^@\s]+)@(?<host>[^@\s/]+)$/u;

const AccountSchema = Schema.Struct({
  acct: Schema.String,
  display_name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  id: Schema.NonEmptyString,
});

// The parts of a Status entity Peal reads of a message: who sent it, what
// it says, how many files it carries, when, and to whom it is visible.
const StatusSchema = Schema.Struct({
  account: AccountSchema,
  content: Schema.String,
  created_at: Schema.String,
  id: Schema.NonEmptyString,
  in_reply_to_id: Schema.optionalKey(Schema.NullOr(Schema.String)),
  media_attachments: Schema.optionalKey(Schema.Array(Schema.Unknown)),
  visibility: Schema.String,
});

type Status = typeof StatusSchema.Type;

// The Conversation entity (docs.joinmastodon.org/entities/Conversation,
// read 2026-11-14): its id, the participants, and its last status, which
// may be null.
const ConversationSchema = Schema.Struct({
  accounts: Schema.Array(AccountSchema),
  id: Schema.NonEmptyString,
  last_status: Schema.optionalKey(Schema.NullOr(StatusSchema)),
});

type MastodonConversation = typeof ConversationSchema.Type;

const conversationsOf = HttpClientResponse.schemaBodyJson(
  Schema.Array(ConversationSchema)
);

const contextOf = threadBodyOf(
  Schema.Struct({
    ancestors: Schema.Array(StatusSchema),
    descendants: Schema.Array(StatusSchema),
  })
);

const createdOf = HttpClientResponse.schemaBodyJson(
  Schema.Struct({ id: Schema.NonEmptyString })
);

// How Mastodon refuses: a JSON error. A page from something on the way,
// such as a proxy's challenge, says nothing of the token.
const refusalOf = HttpClientResponse.schemaBodyJson(
  Schema.Struct({ error: Schema.String })
);

const isMastodonError = (response: HttpClientResponse.HttpClientResponse) =>
  refusalOf(response).pipe(Effect.option, Effect.map(Option.isSome));

// The address a `Link` header gives as `rel="next"`, on the instance only:
// a page elsewhere is never followed.
const nextPageOf = (
  response: HttpClientResponse.HttpClientResponse,
  instance: URL
): Option.Option<URL> => {
  const header = response.headers["link"];

  if (header === undefined) {
    return Option.none();
  }

  for (const part of header.split(",")) {
    const match = /<(?<target>[^>]*)>\s*;(?<params>.*)$/u.exec(part.trim());
    const target = match?.groups?.["target"];
    const params = match?.groups?.["params"] ?? "";

    if (target !== undefined && /\brel="?next"?/u.test(params)) {
      const next = URL.parse(target);

      return next !== null && next.origin === instance.origin
        ? Option.some(next)
        : Option.none();
    }
  }

  return Option.none();
};

const participantOf = (account: typeof AccountSchema.Type): Participant => ({
  displayName: Option.fromNullishOr(account.display_name).pipe(
    Option.filter((name) => name !== "")
  ),
  handle: account.acct,
  platformId: account.id,
});

// A status as a message: only a status of `direct` visibility is one.
const messageOf = (
  status: Status,
  accountId: string
): Option.Option<MessageReading> =>
  status.visibility === "direct"
    ? DateTime.make(status.created_at).pipe(
        Option.map((sentAt): MessageReading => ({
          attachments: status.media_attachments?.length ?? 0,
          fromAccount: status.account.id === accountId,
          platformMessageId: status.id,
          senderPlatformId: Option.some(status.account.id),
          sentAt,
          text: textOfHtml(status.content),
        }))
      )
    : Option.none();

// A resumed message nobody can tell the fate of: a person checks.
const undecided: MessageSendOutcome = {
  _tag: "unconfirmed",
  reason: "interrupted",
};

const unanswered: MessageSendOutcome = {
  _tag: "unconfirmed",
  reason: "noResponse",
};

/**
 * Mastodon's direct messages, from its API reference (read 2026-11-14):
 * a direct message is a status of `direct` visibility, which reaches the
 * accounts it mentions. The account's conversations are
 * `GET /api/v1/conversations` (`read:statuses`), the latest first, paged
 * by the `Link` header; a conversation changed since Peal read it (its
 * last status) is read whole from its first status's context
 * (`GET /api/v1/statuses/:id/context`, with the token, which gives
 * private statuses, to any depth), so a message deleted since is no
 * longer in it. Only statuses of `direct` visibility are kept. A message
 * is a status answering the conversation's latest, sent under an
 * Idempotency-Key the message's id gives, so sending it again within the
 * hour Mastodon keeps the key answers the status already made.
 */
export const mastodonMessages = Effect.fn("MastodonMessages.make")(
  function* mastodonMessages(options: MastodonMessagesOptions) {
    const access = yield* ChannelAccess;
    const { http, scheme } = options;
    const reader = options.reader ?? http;
    const deadlineAfter = options.deadline ?? defaultDeadline;

    const placeOf = (account: ChannelAccount) =>
      Option.fromNullishOr(accountPattern.exec(account.accountId)?.groups).pipe(
        Option.flatMap((groups) =>
          Option.all({
            accountId: Option.fromUndefinedOr(groups["id"]),
            instance: Option.fromUndefinedOr(groups["host"]).pipe(
              Option.map((host) => new URL(`${scheme}//${host}`))
            ),
          })
        )
      );

    // What an answer that is not a success means for a read.
    const readRefusal = Effect.fn("MastodonMessages.readRefusal")(
      function* readRefusal(response: HttpClientResponse.HttpClientResponse) {
        if (
          (response.status === 401 || response.status === 403) &&
          (yield* isMastodonError(response))
        ) {
          return yield* new TokenRejected();
        }

        if (response.status === 429) {
          return yield* new RateLimited({});
        }

        return yield* new PlatformUnavailable();
      }
    );

    // A conversation's statuses, from its first: the status itself and
    // every one under it the account may see, with whether that is all.
    const threadOf = Effect.fn("MastodonMessages.thread")(function* threadOf(
      instance: URL,
      token: Redacted.Redacted,
      last: Status
    ) {
      const contextAt = (id: string) =>
        reader.execute(
          HttpClientRequest.get(
            new URL(
              `/api/v1/statuses/${encodeURIComponent(id)}/context`,
              instance
            )
          ).pipe(HttpClientRequest.bearerToken(token))
        );

      const read = (id: string) =>
        Effect.gen(function* reading() {
          const response = yield* contextAt(id).pipe(
            Effect.mapError(() => new PlatformUnavailable())
          );

          // The status is gone, or no longer visible: nothing of it.
          if (response.status === 404 || response.status === 410) {
            return Option.none<{
              readonly ancestors: readonly Status[];
              readonly descendants: readonly Status[];
              readonly whole: boolean;
            }>();
          }

          if (response.status !== 200) {
            return yield* readRefusal(response);
          }

          const context = yield* contextOf(response);

          if (Option.isNone(context)) {
            return yield* new PlatformUnavailable();
          }

          return Option.some({
            ancestors: context.value.body.ancestors,
            descendants: context.value.body.descendants,
            whole: context.value.whole,
          });
        });

      const around = yield* read(last.id);

      if (Option.isNone(around)) {
        return { complete: false, statuses: [last] };
      }

      const [first] = around.value.ancestors;

      // The last status started the conversation: its context is all of it.
      if (first === undefined) {
        return {
          complete:
            around.value.whole &&
            around.value.descendants.length < contextCeiling,
          statuses: [last, ...around.value.descendants],
        };
      }

      const whole = yield* read(first.id);

      if (Option.isNone(whole)) {
        return {
          complete: false,
          statuses: [...around.value.ancestors, last],
        };
      }

      return {
        complete:
          whole.value.whole && whole.value.descendants.length < contextCeiling,
        statuses: [first, ...whole.value.descendants],
      };
    });

    const readingOf = Effect.fn("MastodonMessages.reading")(function* readingOf(
      instance: URL,
      token: Redacted.Redacted,
      accountId: string,
      conversation: MastodonConversation,
      last: Status,
      lastMessageAt: DateTime.Utc
    ) {
      const thread = yield* threadOf(instance, token, last);

      // The thread's statuses, as fresh as the list's or fresher, win.
      const statuses = new Map(
        thread.statuses.map((status) => [status.id, status])
      );

      if (!statuses.has(last.id)) {
        statuses.set(last.id, last);
      }

      const reading: ConversationReading = {
        complete: thread.complete,
        deleted: [],
        lastMessageAt,
        messages: [...statuses.values()].flatMap((status) =>
          Option.toArray(messageOf(status, accountId))
        ),
        participants: conversation.accounts
          .filter(({ id }) => id !== accountId)
          .map(participantOf),
        platformConversationId: conversation.id,
        request: false,
        revision: last.id,
      };

      return reading;
    });

    const readAll = Effect.fn("MastodonMessages.readAll")(function* readAll(
      instance: URL,
      accountId: string,
      request: MessagesToRead,
      token: Redacted.Redacted
    ) {
      const deadline = DateTime.addDuration(yield* DateTime.now, deadlineAfter);
      const readings: ConversationReading[] = [];

      let page = Option.some(
        new URL(`/api/v1/conversations?limit=${pageSize}`, instance)
      );

      for (let turn = 0; Option.isSome(page); turn += 1) {
        if (
          turn >= maxPages ||
          DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)
        ) {
          const halted: MessagesBatch = {
            conversations: readings,
            halted: true,
          };

          return halted;
        }

        const response = yield* reader
          .execute(
            HttpClientRequest.get(page.value).pipe(
              HttpClientRequest.bearerToken(token)
            )
          )
          .pipe(Effect.mapError(() => new PlatformUnavailable()));

        if (response.status !== 200) {
          return yield* readRefusal(response);
        }

        const listed = yield* conversationsOf(response).pipe(
          Effect.mapError(() => new PlatformUnavailable())
        );

        let older = 0;

        for (const conversation of listed) {
          const last = Option.fromNullishOr(conversation.last_status);

          const lastAt = last.pipe(
            Option.flatMap(({ created_at: createdAt }) =>
              DateTime.make(createdAt)
            ),
            Option.filter((at) =>
              DateTime.isGreaterThanOrEqualTo(at, request.keptSince)
            )
          );

          if (Option.isNone(last) || Option.isNone(lastAt)) {
            older += 1;
          } else if (request.known.get(conversation.id) !== last.value.id) {
            readings.push(
              yield* readingOf(
                instance,
                token,
                accountId,
                conversation,
                last.value,
                lastAt.value
              )
            );
          }
        }

        // A page whose every conversation is past what Peal keeps ends
        // the read: the list is the latest first.
        page =
          listed.length > 0 && older === listed.length
            ? Option.none()
            : nextPageOf(response, instance);
      }

      const batch: MessagesBatch = { conversations: readings, halted: false };

      return batch;
    });

    const read = (
      account: ChannelAccount,
      request: MessagesToRead
    ): Effect.Effect<MessagesBatch, MessagesReadFailure> =>
      Option.match(placeOf(account), {
        onNone: () =>
          Effect.fail(new ChannelUnreadable({ reason: "unsupported" })),
        onSome: ({ accountId, instance }) =>
          access
            .withToken(account.channelId, ({ accessToken }) =>
              readAll(instance, accountId, request, accessToken)
            )
            .pipe(
              Effect.catchTags({
                ChannelUnusable: unusable,
                DatabaseError: databaseDown,
                TokenExpired: needsReconnect,
              })
            ),
      });

    // What an answer that is not a success means for a first send.
    const refusalOn = Effect.fn("MastodonMessages.refusal")(function* refusalOn(
      response: HttpClientResponse.HttpClientResponse
    ) {
      const { status } = response;

      if (status === 401 || status === 403) {
        return (yield* isMastodonError(response))
          ? yield* new TokenRejected()
          : ("platformUnavailable" as const);
      }

      if (status === 429) {
        return "rateLimited" as const;
      }

      // The status it answers is gone.
      if (status === 404 || status === 410) {
        return "conversationGone" as const;
      }

      return "refused" as const;
    });

    // A first send knows nothing went out before it, so a refusal is a
    // failure. A resume follows a run that may have made the status: the
    // same key answers that status, or makes it, and only Mastodon's own
    // refusal of what is sent (422, in its JSON) proves none was made.
    const post = (
      account: ChannelAccount,
      message: OutgoingDirect,
      mode: "resume" | "send"
    ): Effect.Effect<MessageSendOutcome> =>
      Option.match(placeOf(account), {
        onNone: () =>
          Effect.succeed<MessageSendOutcome>(
            mode === "send"
              ? { _tag: "failed", reason: "channelUnavailable" }
              : undecided
          ),
        onSome: ({ instance }) =>
          access
            .withToken(account.channelId, ({ accessToken }) =>
              Effect.gen(function* sending() {
                const sent = yield* HttpClientRequest.post(
                  new URL("/api/v1/statuses", instance)
                ).pipe(
                  HttpClientRequest.bearerToken(accessToken),
                  HttpClientRequest.setHeader(
                    "Idempotency-Key",
                    message.messageId
                  ),
                  HttpClientRequest.bodyJsonUnsafe({
                    ...Option.match(message.latestPlatformId, {
                      onNone: () => ({}),
                      onSome: (latest) => ({ in_reply_to_id: latest }),
                    }),
                    status: message.text,
                    visibility: "direct",
                  }),
                  http.execute,
                  Effect.result
                );

                // The request may have reached the instance.
                if (sent._tag === "Failure") {
                  return unanswered;
                }

                const response = sent.success;

                if (response.status === 200) {
                  return yield* createdOf(response).pipe(
                    Effect.map(({ id }): MessageSendOutcome => ({
                      _tag: "sent",
                      platformMessageId: id,
                    })),
                    Effect.orElseSucceed(() => unanswered)
                  );
                }

                // The instance failed on the status itself: it may be there.
                if (response.status >= 500 || response.status === 408) {
                  return unanswered;
                }

                if (mode === "resume") {
                  return response.status === 422 &&
                    (yield* isMastodonError(response))
                    ? ({ _tag: "failed", reason: "refused" } as const)
                    : undecided;
                }

                const reason: MessageFailure = yield* refusalOn(response);

                return { _tag: "failed", reason } as const;
              })
            )
            .pipe(
              Effect.catch(
                messageRefusedWith((reason): MessageSendOutcome =>
                  mode === "send" ? { _tag: "failed", reason } : undecided
                )
              )
            ),
      });

    const resume = (
      account: ChannelAccount,
      message: OutgoingDirect
    ): Effect.Effect<MessageSendOutcome> =>
      DateTime.now.pipe(
        Effect.flatMap((now) =>
          // Within the window, the same key answers the status already
          // made, or makes it now.
          DateTime.isLessThan(
            now,
            DateTime.addDuration(message.createdAt, idempotencyWindow)
          )
            ? post(account, message, "resume")
            : Effect.succeed(undecided)
        )
      );

    const platform: MessagePlatform = {
      read,
      resume,
      send: (account, message) => post(account, message, "send"),
    };

    return platform;
  }
);
