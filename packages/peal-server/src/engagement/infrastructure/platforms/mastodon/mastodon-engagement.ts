import { DateTime, Duration, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import { commentsPerThread } from "#engagement/application/ports/comment-source.ts";
import type {
  CommentsBatch,
  CommentsReadFailure,
  ThreadReading,
  ThreadToRead,
} from "#engagement/application/ports/comment-source.ts";
import type { ActionOutcome } from "#engagement/application/ports/reply-sender.ts";
import type { CommentReading } from "#engagement/domain/comment.ts";
import type { ReplyFailure, SendOutcome } from "#engagement/domain/reply.ts";
import {
  databaseDown,
  refusedWith,
  needsReconnect,
  unusable,
} from "#engagement/infrastructure/platforms/channel-refusals.ts";
import type {
  CommentTarget,
  EngagementPlatform,
  OutgoingReply,
  PlatformHttp,
} from "#engagement/infrastructure/platforms/engagement-platform.ts";
import { threadBodyOf } from "#engagement/infrastructure/platforms/thread-body.ts";
import { textOfHtml } from "#shared/domain/html-text.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";

export interface MastodonEngagementOptions {
  readonly http: PlatformHttp;
  /**
   * The client threads are read with, whose answers end at
   * `maxThreadBytes` rather than fail past a megabyte; `http` otherwise.
   */
  readonly reader?: PlatformHttp;
  /** `https:`, or `http:` for tests against a local fake. */
  readonly scheme: "http:" | "https:";
  /** How long a read may keep the channel's gate. */
  readonly deadline?: Duration.Duration;
}

const defaultDeadline = Duration.seconds(30);

// Mastodon keeps an Idempotency-Key for an hour; resending with it is
// trusted for a little less, so the key cannot lapse during the resend.
const idempotencyWindow = Duration.minutes(50);

// What an unauthenticated context holds at most (Mastodon 4.0 and later):
// a read that reaches it may have missed replies.
const signedOutDescendants = 60;

// The channels context names a Mastodon account `<id>@<host>`.
const accountPattern = /^(?<id>[^@\s]+)@(?<host>[^@\s/]+)$/u;

const readingScopes: ReadonlySet<string> = new Set(["read", "read:statuses"]);

// The parts of a Status entity Peal reads: who wrote it, what it says,
// what it answers. Nothing else of the account is read.
const StatusSchema = Schema.Struct({
  account: Schema.Struct({
    acct: Schema.String,
    display_name: Schema.optionalKey(Schema.NullOr(Schema.String)),
    id: Schema.String,
  }),
  content: Schema.String,
  created_at: Schema.String,
  favourited: Schema.optionalKey(Schema.NullOr(Schema.Boolean)),
  id: Schema.NonEmptyString,
  in_reply_to_id: Schema.optionalKey(Schema.NullOr(Schema.String)),
  url: Schema.optionalKey(Schema.NullOr(Schema.String)),
  visibility: Schema.String,
});

type Status = typeof StatusSchema.Type;

const contextOf = threadBodyOf(
  Schema.Struct({ descendants: Schema.Array(StatusSchema) })
);

// How deep an unauthenticated context goes (Mastodon's API reference: "a
// maximum depth of 20"): a reply that deep may have others under it that
// the read was not given.
const signedOutDepth = 20;

// Whether a reply sits `depth` levels or more under the post, following
// what each status answers among those read.
const reachesDepth = (statuses: readonly Status[], depth: number): boolean => {
  const depths = new Map<string, number>();

  // A context lists a status after the one it answers.
  for (const { id, in_reply_to_id: parent } of statuses) {
    const at = (depths.get(parent ?? "") ?? 0) + 1;

    if (at >= depth) {
      return true;
    }

    depths.set(id, at);
  }

  return false;
};

const createdOf = HttpClientResponse.schemaBodyJson(
  Schema.Struct({
    id: Schema.NonEmptyString,
    url: Schema.optionalKey(Schema.NullOr(Schema.String)),
  })
);

// How Mastodon refuses a token: a JSON error. A page from something on the
// way, such as a proxy's challenge, says nothing of the token.
const refusalOf = HttpClientResponse.schemaBodyJson(
  Schema.Struct({ error: Schema.String })
);

const isMastodonError = (response: HttpClientResponse.HttpClientResponse) =>
  refusalOf(response).pipe(Effect.option, Effect.map(Option.isSome));

// Replies anyone can see. A reply only its author's followers or the
// people it mentions see is a private message, which Peal does not collect.
const isPublic = (status: Status) =>
  status.visibility === "public" || status.visibility === "unlisted";

const readingOf = (
  status: Status,
  postId: string,
  accountId: string
): Option.Option<CommentReading> =>
  DateTime.make(status.created_at).pipe(
    Option.map((writtenAt): CommentReading => ({
      author: Option.some({
        displayName: Option.fromNullishOr(status.account.display_name).pipe(
          Option.filter((name) => name !== "")
        ),
        handle: status.account.acct,
        platformId: status.account.id,
      }),
      fromAccount: status.account.id === accountId,
      // Mastodon lets no account hide a reply.
      hidden: Option.some(false),
      liked: Option.fromNullishOr(status.favourited),
      parentPlatformId: Option.fromNullishOr(status.in_reply_to_id).pipe(
        Option.filter((parent) => parent !== postId)
      ),
      permalink: Option.fromNullishOr(status.url),
      platformCommentId: status.id,
      text: textOfHtml(status.content),
      writtenAt,
    }))
  );

const failed = (reason: ReplyFailure): ActionOutcome => ({
  _tag: "failed",
  reason,
});

const done: ActionOutcome = { _tag: "done" };

// A resumed reply nobody can tell the fate of: a person checks.
const undecided: SendOutcome = { _tag: "unconfirmed", reason: "interrupted" };

// A resumed reply Mastodon refused as it was sent: none was ever made.
const refusedAsSent: SendOutcome = { _tag: "failed", reason: "refused" };

const statusPath = (id: string, action = "") =>
  `/api/v1/statuses/${encodeURIComponent(id)}${action}`;

/**
 * Mastodon's comments, from its API reference. Replies to a status are its
 * context's descendants (GET /api/v1/statuses/:id/context), read with the
 * account's token when it may read statuses, without one otherwise, which
 * public statuses allow. A reply is a status with `in_reply_to_id`, sent
 * under an Idempotency-Key the reply's id gives, so sending it again
 * within the hour Mastodon keeps the key answers the status already made.
 * A favourite is the account's like. Only Mastodon's own JSON error
 * refuses a token: a proxy's page must not mark the channel to reconnect.
 */
export const mastodonEngagement = Effect.fn("MastodonEngagement.make")(
  function* mastodonEngagement(options: MastodonEngagementOptions) {
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

    type Step =
      | { readonly _tag: "read"; readonly reading: ThreadReading }
      | { readonly _tag: "halt" };

    const readOne = Effect.fn("MastodonEngagement.context")(function* readOne(
      instance: URL,
      accountId: string,
      thread: ThreadToRead,
      token: Option.Option<Redacted.Redacted>
    ) {
      const request = HttpClientRequest.get(
        new URL(
          `/api/v1/statuses/${encodeURIComponent(thread.platformPostId)}/context`,
          instance
        )
      ).pipe(
        Option.match(token, {
          onNone: () => (built: HttpClientRequest.HttpClientRequest) => built,
          onSome: (bearer) => HttpClientRequest.bearerToken(bearer),
        })
      );

      const failedOn: Step = {
        _tag: "read",
        reading: { _tag: "failed", threadId: thread.threadId },
      };

      const sent = yield* reader.execute(request).pipe(Effect.result);

      if (sent._tag === "Failure") {
        return failedOn;
      }

      const response = sent.success;

      if (response.status === 200) {
        const context = yield* contextOf(response);

        if (Option.isNone(context)) {
          return failedOn;
        }

        const { descendants } = context.value.body;

        const ceiling = Option.isSome(token)
          ? commentsPerThread
          : Math.min(signedOutDescendants, commentsPerThread);

        // A signed-out read is cut in depth as well as in number.
        const cutInDepth =
          Option.isNone(token) && reachesDepth(descendants, signedOutDepth);

        const step: Step = {
          _tag: "read",
          reading: {
            _tag: "read",
            comments: descendants
              .slice(0, commentsPerThread)
              .flatMap((status) =>
                isPublic(status)
                  ? Option.toArray(
                      readingOf(status, thread.platformPostId, accountId)
                    )
                  : []
              ),
            // Every reply was read only when the answer came whole, fewer
            // came than the server gives at most, none sits as deep as a
            // signed-out read goes, and none was left out for being
            // private.
            complete:
              context.value.whole &&
              descendants.length < ceiling &&
              !cutInDepth &&
              descendants.every(isPublic),
            threadId: thread.threadId,
          },
        };

        return step;
      }

      if (response.status === 404 || response.status === 410) {
        const step: Step = {
          _tag: "read",
          reading: { _tag: "missing", threadId: thread.threadId },
        };

        return step;
      }

      if (
        (response.status === 401 || response.status === 403) &&
        (yield* isMastodonError(response))
      ) {
        return yield* Option.isSome(token)
          ? new TokenRejected()
          : new ChannelUnreadable({ reason: "paused" });
      }

      if (response.status === 429) {
        const step: Step = { _tag: "halt" };

        return step;
      }

      return failedOn;
    });

    const readAll = Effect.fn("MastodonEngagement.readAll")(function* readAll(
      instance: URL,
      accountId: string,
      threads: readonly ThreadToRead[],
      token: Option.Option<Redacted.Redacted>
    ) {
      const deadline = DateTime.addDuration(yield* DateTime.now, deadlineAfter);
      const readings: ThreadReading[] = [];

      for (const thread of threads) {
        if (DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)) {
          return { halted: true, readings };
        }

        const step = yield* readOne(instance, accountId, thread, token);

        if (step._tag === "halt") {
          return { halted: true, readings };
        }

        readings.push(step.reading);
      }

      const batch: CommentsBatch = { halted: false, readings };

      return batch;
    });

    const read = (
      account: ChannelAccount,
      threads: readonly ThreadToRead[]
    ): Effect.Effect<CommentsBatch, CommentsReadFailure> =>
      Option.match(placeOf(account), {
        onNone: () =>
          Effect.fail(new ChannelUnreadable({ reason: "unsupported" })),
        onSome: ({ accountId, instance }) =>
          account.scopes.some((scope) => readingScopes.has(scope))
            ? access
                .withToken(account.channelId, ({ accessToken }) =>
                  readAll(
                    instance,
                    accountId,
                    threads,
                    Option.some(accessToken)
                  )
                )
                .pipe(
                  Effect.catchTags({
                    ChannelUnusable: unusable,
                    DatabaseError: databaseDown,
                    TokenExpired: needsReconnect,
                  })
                )
            : readAll(instance, accountId, threads, Option.none()).pipe(
                Effect.catchTag("TokenRejected", () =>
                  Effect.fail(new ChannelUnreadable({ reason: "paused" }))
                )
              ),
      });

    // A call as the account, whose failures to get a token each mean
    // nothing was sent.
    const asAccount = <A>(
      account: ChannelAccount,
      onRefused: (reason: ReplyFailure) => A,
      use: (
        instance: URL,
        token: Redacted.Redacted
      ) => Effect.Effect<A, TokenRejected>
    ): Effect.Effect<A> =>
      Option.match(placeOf(account), {
        onNone: () => Effect.succeed(onRefused("channelUnavailable")),
        onSome: ({ instance }) =>
          access
            .withToken(account.channelId, ({ accessToken }) =>
              use(instance, accessToken)
            )
            .pipe(Effect.catch(refusedWith(onRefused))),
      });

    // What an answer that is not a success means for a call that changes
    // something: a refused token before anything happened, a rate limit,
    // a status that is gone, or a refusal of what was sent.
    const refusalOn = Effect.fn("MastodonEngagement.refusal")(
      function* refusalOn(response: HttpClientResponse.HttpClientResponse) {
        const { status } = response;

        if (status === 401 || status === 403) {
          return (yield* isMastodonError(response))
            ? yield* new TokenRejected()
            : ("platformUnavailable" as const);
        }

        if (status === 429) {
          return "rateLimited" as const;
        }

        if (status === 404 || status === 410) {
          return "commentGone" as const;
        }

        return status >= 500 || status === 408
          ? ("platformUnavailable" as const)
          : ("refused" as const);
      }
    );

    // A first send knows nothing went out before it, so a refusal is a
    // failure. A resume follows a run that may have made the status: the
    // same key answers that status, or makes it, and only Mastodon's own
    // refusal of what is sent (422, in its JSON) proves none was made, as
    // a status is validated only when the key made none. Anything else,
    // a rate limit, a proxy, a refused token, a status answered that was
    // deleted since, leaves the reply for a person to check.
    const post = (
      account: ChannelAccount,
      reply: OutgoingReply,
      mode: "resume" | "send"
    ): Effect.Effect<SendOutcome> =>
      asAccount<SendOutcome>(
        account,
        (reason) => (mode === "send" ? { _tag: "failed", reason } : undecided),
        Effect.fn("MastodonEngagement.reply")(function* send(instance, token) {
          const sent = yield* HttpClientRequest.post(
            new URL("/api/v1/statuses", instance)
          ).pipe(
            HttpClientRequest.bearerToken(token),
            HttpClientRequest.setHeader("Idempotency-Key", reply.replyId),
            HttpClientRequest.bodyJsonUnsafe({
              in_reply_to_id: reply.parentPlatformId,
              status: reply.text,
            }),
            http.execute,
            Effect.result
          );

          const unanswered: SendOutcome = {
            _tag: "unconfirmed",
            reason: "noResponse",
          };

          // The request may have reached the instance.
          if (sent._tag === "Failure") {
            return unanswered;
          }

          const response = sent.success;

          if (response.status === 200) {
            return yield* createdOf(response).pipe(
              Effect.map(({ id, url }): SendOutcome => ({
                _tag: "sent",
                permalink: Option.fromNullishOr(url),
                platformCommentId: id,
              })),
              // Made, and answered in a shape Peal cannot read.
              Effect.orElseSucceed(() => unanswered)
            );
          }

          // The instance failed on the status itself: it may be there.
          if (response.status >= 500 || response.status === 408) {
            return unanswered;
          }

          if (mode === "resume") {
            return response.status === 422 && (yield* isMastodonError(response))
              ? refusedAsSent
              : undecided;
          }

          const reason = yield* refusalOn(response);
          const outcome: SendOutcome = { _tag: "failed", reason };

          return outcome;
        })
      );

    const resume = (
      account: ChannelAccount,
      reply: OutgoingReply
    ): Effect.Effect<SendOutcome> =>
      DateTime.now.pipe(
        Effect.flatMap((now) => {
          // Within the window, the same key answers the status already
          // made, or makes it now.
          if (
            DateTime.isLessThan(
              now,
              DateTime.addDuration(reply.createdAt, idempotencyWindow)
            )
          ) {
            return post(account, reply, "resume");
          }

          return Effect.succeed<SendOutcome>({
            _tag: "unconfirmed",
            reason: "interrupted",
          });
        })
      );

    // A call that sets a state on a status: done on success, and on a
    // status already gone when `goneIsDone`.
    const act = (
      account: ChannelAccount,
      method: "DELETE" | "POST",
      path: string,
      goneIsDone: boolean
    ): Effect.Effect<ActionOutcome> =>
      asAccount<ActionOutcome>(
        account,
        failed,
        Effect.fn("MastodonEngagement.act")(function* acting(instance, token) {
          const sent = yield* HttpClientRequest.make(method)(
            new URL(path, instance)
          ).pipe(
            HttpClientRequest.bearerToken(token),
            http.execute,
            Effect.result
          );

          if (sent._tag === "Failure") {
            return failed("platformUnavailable");
          }

          if (sent.success.status === 200) {
            return done;
          }

          const reason = yield* refusalOn(sent.success);

          return reason === "commentGone" && goneIsDone ? done : failed(reason);
        })
      );

    const moderate = (
      account: ChannelAccount,
      target: CommentTarget
    ): Effect.Effect<ActionOutcome> => {
      if (target.action === "like" || target.action === "unlike") {
        return act(
          account,
          "POST",
          statusPath(
            target.platformCommentId,
            target.action === "like" ? "/favourite" : "/unfavourite"
          ),
          false
        );
      }

      // Mastodon lets no account hide or delete another's reply.
      return Effect.succeed(failed("refused"));
    };

    const platform: EngagementPlatform = {
      moderate,
      read,
      resume,
      send: (account, reply) => post(account, reply, "send"),
      withdraw: (account, platformCommentId) =>
        act(account, "DELETE", statusPath(platformCommentId), true),
    };

    return platform;
  }
);
