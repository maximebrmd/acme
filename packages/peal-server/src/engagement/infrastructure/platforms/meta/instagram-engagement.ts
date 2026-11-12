import { DateTime, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientResponse } from "effect/http";

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
  needsReconnect,
  refusedWith,
  unusable,
} from "#engagement/infrastructure/platforms/channel-refusals.ts";
import type {
  CommentTarget,
  EngagementPlatform,
  OutgoingReply,
} from "#engagement/infrastructure/platforms/engagement-platform.ts";
import { threadBodyOf } from "#engagement/infrastructure/platforms/thread-body.ts";
import {
  instagramLoginCommentScope,
  instagramPageCommentScope,
} from "#shared/domain/inbox-platform.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";

import {
  actionFailure,
  commentsPerPage,
  confirmedAction,
  defaultDeadline,
  foundAmong,
  instantOf,
  isSuccess,
  madeOf,
  metaRefusalOf,
  nextCursor,
  nodePath,
  notDone,
  pageAfter,
  PagingSchema,
  requestsWith,
  unanswered,
  undecided,
} from "./meta-comments.ts";
import type { ListedReply, MetaEngagementOptions } from "./meta-comments.ts";

// An Instagram professional account's comments, from Meta's pages (read
// 2026-11-12):
//
// - IG Media comments (developers.facebook.com/docs/instagram-platform/
//   instagram-graph-api/reference/ig-media/comments): `GET
//   /{ig-media-id}/comments` "returns only top-level comments", at most 50
//   a query, and replies only through the `replies` field's expansion;
//   with Facebook Login `instagram_basic`, `instagram_manage_comments` and
//   `pages_read_engagement` on graph.facebook.com, with Instagram Login
//   `instagram_business_basic` and `instagram_business_manage_comments` on
//   graph.instagram.com.
// - IG Comment (…/reference/ig-comment): `from` (the commenter's
//   Instagram-scoped id, and `username`), `hidden`, `id`, `parent_id`,
//   `replies`, `text`, `timestamp` (ISO 8601), and `user`, "only returned
//   if the app user created the IG Comment"; `POST /{ig-comment-id}` with
//   `hide` and `DELETE /{ig-comment-id}` answer `{ "success": true }`.
// - IG Comment replies (…/reference/ig-comment/replies): `POST
//   /{ig-comment-id}/replies` with `message` answers `{ "id" }`; "you can
//   only reply to top-level comments", nor to a hidden one.
// - Comment moderation (developers.facebook.com/docs/instagram-platform/
//   comment-moderation): the same calls, and that Meta's webhooks are
//   preferred to polling, against its rate limits.
//
// None of these pages states a length for a comment.

// The fields of a comment Peal reads: who wrote it (their id and
// username), what it says, when, what it answers, and whether it is
// hidden. Nothing else of the author.
const fields =
  "id,text,timestamp,hidden,username,from{id,username},user,parent_id";

const commentFields = `${fields},replies{${fields}}`;

// Meta writes ids as strings, and sometimes nodes as objects.
const UserSchema = Schema.Union([
  Schema.String,
  Schema.Struct({ id: Schema.String }),
]);

const isText = Schema.is(Schema.String);

const CommentSchema = Schema.Struct({
  from: Schema.optionalKey(
    Schema.Struct({
      id: Schema.NonEmptyString,
      username: Schema.optionalKey(Schema.String),
    })
  ),
  hidden: Schema.optionalKey(Schema.Boolean),
  id: Schema.NonEmptyString,
  parent_id: Schema.optionalKey(Schema.String),
  text: Schema.optionalKey(Schema.String),
  timestamp: Schema.String,
  user: Schema.optionalKey(UserSchema),
  username: Schema.optionalKey(Schema.String),
});

type InstagramComment = typeof CommentSchema.Type;

const RepliesSchema = Schema.Struct({
  data: Schema.Array(CommentSchema),
  paging: PagingSchema,
});

const TopLevelSchema = Schema.Struct({
  ...CommentSchema.fields,
  replies: Schema.optionalKey(RepliesSchema),
});

const PageSchema = Schema.Struct({
  data: Schema.Array(TopLevelSchema),
  paging: PagingSchema,
});

const pageOf = threadBodyOf(PageSchema);

const repliesOf = threadBodyOf(RepliesSchema);

const listedOf = HttpClientResponse.schemaBodyJson(RepliesSchema);

// The pages a resume reads at most of the replies under one comment.
const resumePages = 10;

const resumePageSize = 100;

// Whether the account wrote the comment: Meta names the account in `user`
// for a comment the app user made, and in `from` for anyone's.
const byAccount = (comment: InstagramComment, accountId: string) => {
  const { user: named } = comment;
  const user = named === undefined || isText(named) ? named : named.id;

  return comment.from?.id === accountId || user === accountId;
};

const readingOf = (
  comment: InstagramComment,
  accountId: string
): Option.Option<CommentReading> =>
  instantOf(comment.timestamp).pipe(
    Option.map((writtenAt): CommentReading => ({
      author: Option.fromUndefinedOr(comment.from).pipe(
        Option.map((from) => ({
          displayName: Option.none(),
          handle: from.username ?? comment.username ?? "",
          platformId: from.id,
        }))
      ),
      fromAccount: byAccount(comment, accountId),
      hidden: Option.fromUndefinedOr(comment.hidden),
      liked: Option.none(),
      parentPlatformId: Option.fromUndefinedOr(comment.parent_id).pipe(
        Option.filter((parent) => parent !== "")
      ),
      permalink: Option.none(),
      platformCommentId: comment.id,
      text: comment.text ?? "",
      writtenAt,
    }))
  );

/**
 * Instagram's comments under the account's posts, through either way in:
 * through a Page on graph.facebook.com with the Page's token and its
 * proof, through Instagram Login on graph.instagram.com with the account's
 * token and none. A thread is read across pages of 25 top-level comments,
 * each with its replies, a comment's further replies page by page; a
 * comment by the account itself is its own. A reply is one request; Meta takes no idempotency key, so
 * a resumed reply is never sent: it is looked for among the replies under
 * its comment, and left to a person when not found exactly once. Hiding
 * and deleting set a state, and a comment already gone is done.
 */
export const instagramEngagement = Effect.fn("InstagramEngagement.make")(
  function* instagramEngagement(options: MetaEngagementOptions) {
    const access = yield* ChannelAccess;
    const request = yield* requestsWith(options);
    const { http } = options;
    const reader = options.reader ?? http;
    const deadlineAfter = options.deadline ?? defaultDeadline;

    type Step =
      | { readonly _tag: "read"; readonly reading: ThreadReading }
      | {
          readonly _tag: "halt";
          readonly reading: Option.Option<ThreadReading>;
        };

    // What Meta refusing a page of a thread means: a refused token, for
    // ChannelAccess to renew; a missing permission, which pauses the
    // channel and marks nothing; a rate limit, which halts the read with
    // what it had; a post gone; or a failed read.
    const refusedRead = Effect.fn("InstagramEngagement.refusedRead")(
      function* refusedRead(
        response: HttpClientResponse.HttpClientResponse,
        thread: ThreadToRead,
        comments: readonly CommentReading[]
      ) {
        const refusal = yield* metaRefusalOf(response);

        if (refusal === "token") {
          return yield* new TokenRejected();
        }

        if (refusal === "permission") {
          return yield* new ChannelUnreadable({ reason: "paused" });
        }

        if (refusal === "rateLimited") {
          const halt: Step = {
            _tag: "halt",
            reading:
              comments.length === 0
                ? Option.none()
                : Option.some({
                    _tag: "read",
                    comments,
                    complete: false,
                    threadId: thread.threadId,
                  }),
          };

          return halt;
        }

        const step: Step = {
          _tag: "read",
          reading:
            refusal === "gone" && comments.length === 0
              ? { _tag: "missing", threadId: thread.threadId }
              : { _tag: "failed", threadId: thread.threadId },
        };

        return step;
      }
    );

    // A comment's replies from `after` on, as far as the read may go: all
    // of them (`whole`) only when every page was read whole.
    const furtherReplies = Effect.fn("InstagramEngagement.furtherReplies")(
      function* furtherReplies(
        account: ChannelAccount,
        token: Redacted.Redacted,
        commentId: string,
        from: Option.Option<string>,
        deadline: DateTime.Utc
      ) {
        const comments: CommentReading[] = [];
        let after = from;

        while (Option.isSome(after)) {
          if (
            comments.length >= commentsPerThread ||
            DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)
          ) {
            return { comments, whole: false };
          }

          const sent = yield* request(
            account,
            token,
            "GET",
            nodePath(commentId, "replies"),
            { fields, limit: String(commentsPerPage), ...pageAfter(after) }
          ).pipe(Effect.flatMap(reader.execute), Effect.result);

          if (sent._tag === "Failure" || !isSuccess(sent.success)) {
            return { comments, whole: false };
          }

          const page = yield* repliesOf(sent.success);

          if (Option.isNone(page)) {
            return { comments, whole: false };
          }

          for (const reply of page.value.body.data) {
            comments.push(
              ...Option.toArray(readingOf(reply, account.accountId))
            );
          }

          if (!page.value.whole) {
            return { comments, whole: false };
          }

          after = nextCursor(page.value.body.paging);
        }

        return { comments, whole: true };
      }
    );

    // A page's comments, each with all its replies: whole only when every
    // comment's further replies were read whole.
    const commentsOn = Effect.fn("InstagramEngagement.commentsOn")(
      function* commentsOn(
        account: ChannelAccount,
        token: Redacted.Redacted,
        page: typeof PageSchema.Type,
        deadline: DateTime.Utc
      ) {
        const comments: CommentReading[] = [];
        let whole = true;

        for (const comment of page.data) {
          comments.push(
            ...Option.toArray(readingOf(comment, account.accountId)),
            ...(comment.replies?.data ?? []).flatMap((reply) =>
              Option.toArray(readingOf(reply, account.accountId))
            )
          );

          // The replies past the first page of them, under their comment.
          const further = nextCursor(comment.replies?.paging);

          if (Option.isSome(further)) {
            const rest = yield* furtherReplies(
              account,
              token,
              comment.id,
              further,
              deadline
            );

            comments.push(...rest.comments);
            whole &&= rest.whole;
          }
        }

        return { comments, whole };
      }
    );

    const readOne = Effect.fn("InstagramEngagement.thread")(function* readOne(
      account: ChannelAccount,
      token: Redacted.Redacted,
      thread: ThreadToRead,
      deadline: DateTime.Utc
    ) {
      const comments: CommentReading[] = [];
      let after = Option.none<string>();

      const failedOn: Step = {
        _tag: "read",
        reading: { _tag: "failed", threadId: thread.threadId },
      };

      // What was read so far, not all of it.
      const partial: ThreadReading = {
        _tag: "read",
        comments,
        complete: false,
        threadId: thread.threadId,
      };

      while (true) {
        const sent = yield* request(
          account,
          token,
          "GET",
          nodePath(thread.platformPostId, "comments"),
          {
            fields: commentFields,
            limit: String(commentsPerPage),
            ...pageAfter(after),
          }
        ).pipe(Effect.flatMap(reader.execute), Effect.result);

        if (sent._tag === "Failure") {
          return failedOn;
        }

        const response = sent.success;

        if (!isSuccess(response)) {
          return yield* refusedRead(response, thread, comments);
        }

        const page = yield* pageOf(response);

        if (Option.isNone(page)) {
          return failedOn;
        }

        const listed = yield* commentsOn(
          account,
          token,
          page.value.body,
          deadline
        );

        comments.push(...listed.comments);

        const repliesWhole = listed.whole;

        after = nextCursor(page.value.body.paging);

        // Every comment was read only when every page came whole.
        if (page.value.whole && repliesWhole && Option.isNone(after)) {
          const step: Step = {
            _tag: "read",
            reading: {
              _tag: "read",
              comments,
              complete: true,
              threadId: thread.threadId,
            },
          };

          return step;
        }

        if (
          !page.value.whole ||
          !repliesWhole ||
          comments.length >= commentsPerThread ||
          DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)
        ) {
          const step: Step = { _tag: "read", reading: partial };

          return step;
        }
      }
    });

    const readAll = Effect.fn("InstagramEngagement.readAll")(function* readAll(
      account: ChannelAccount,
      token: Redacted.Redacted,
      threads: readonly ThreadToRead[]
    ) {
      const deadline = DateTime.addDuration(yield* DateTime.now, deadlineAfter);
      const readings: ThreadReading[] = [];

      for (const thread of threads) {
        if (DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)) {
          return { halted: true, readings };
        }

        const step = yield* readOne(account, token, thread, deadline);

        if (step._tag === "halt") {
          readings.push(...Option.toArray(step.reading));

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
      // An account that did not grant its comments is read once it does:
      // nothing is asked of Meta meanwhile.
      account.scopes.some(
        (scope) =>
          scope === instagramPageCommentScope ||
          scope === instagramLoginCommentScope
      )
        ? access
            .withToken(account.channelId, ({ accessToken }) =>
              readAll(account, accessToken, threads)
            )
            .pipe(
              Effect.catchTags({
                ChannelUnusable: unusable,
                DatabaseError: databaseDown,
                TokenExpired: needsReconnect,
              })
            )
        : Effect.fail(new ChannelUnreadable({ reason: "paused" }));

    // A call as the account, whose failures to get a token each mean
    // nothing was sent.
    const asAccount = <A>(
      account: ChannelAccount,
      onRefused: (reason: ReplyFailure) => A,
      use: (token: Redacted.Redacted) => Effect.Effect<A, TokenRejected>
    ): Effect.Effect<A> =>
      access
        .withToken(account.channelId, ({ accessToken }) => use(accessToken))
        .pipe(Effect.catch(refusedWith(onRefused)));

    const send = (
      account: ChannelAccount,
      reply: OutgoingReply
    ): Effect.Effect<SendOutcome> =>
      asAccount<SendOutcome>(
        account,
        (reason) => ({ _tag: "failed", reason }),
        Effect.fn("InstagramEngagement.reply")(function* sending(token) {
          const sent = yield* request(
            account,
            token,
            "POST",
            nodePath(reply.parentPlatformId, "replies"),
            { message: reply.text }
          ).pipe(Effect.flatMap(http.execute), Effect.result);

          // The request may have reached Meta.
          if (sent._tag === "Failure") {
            return unanswered;
          }

          const response = sent.success;

          if (isSuccess(response)) {
            return yield* madeOf(response);
          }

          const refusal = yield* metaRefusalOf(response);

          // Meta failed on the reply itself: it may be there.
          if (refusal === "unavailable") {
            return unanswered;
          }

          // Refused before anything was made: a renewed token may be
          // tried.
          if (refusal === "token") {
            return yield* new TokenRejected();
          }

          const outcome: SendOutcome = {
            _tag: "failed",
            reason: actionFailure(refusal),
          };

          return outcome;
        })
      );

    // The replies under the comment, every page of them, as Meta lists
    // them; none when any page could not be read.
    const repliesUnder = Effect.fn("InstagramEngagement.replies")(
      function* repliesUnder(
        account: ChannelAccount,
        token: Redacted.Redacted,
        commentId: string
      ) {
        const listed: ListedReply[] = [];
        let after = Option.none<string>();

        for (let page = 0; page < resumePages; page += 1) {
          const sent = yield* request(
            account,
            token,
            "GET",
            nodePath(commentId, "replies"),
            {
              fields,
              limit: String(resumePageSize),
              ...pageAfter(after),
            }
          ).pipe(Effect.flatMap(http.execute), Effect.result);

          if (sent._tag === "Failure" || !isSuccess(sent.success)) {
            return Option.none<readonly ListedReply[]>();
          }

          const body = yield* listedOf(sent.success).pipe(Effect.option);

          if (Option.isNone(body)) {
            return Option.none<readonly ListedReply[]>();
          }

          for (const comment of body.value.data) {
            listed.push({
              fromAccount: byAccount(comment, account.accountId),
              id: comment.id,
              text: comment.text ?? "",
              writtenAt: instantOf(comment.timestamp),
            });
          }

          after = nextCursor(body.value.paging);

          if (Option.isNone(after)) {
            return Option.some<readonly ListedReply[]>(listed);
          }
        }

        // More replies than a resume reads: the one sought may be past them.
        return Option.none<readonly ListedReply[]>();
      }
    );

    const resume = (
      account: ChannelAccount,
      reply: OutgoingReply
    ): Effect.Effect<SendOutcome> =>
      asAccount<SendOutcome>(
        account,
        () => undecided,
        (token) =>
          repliesUnder(account, token, reply.parentPlatformId).pipe(
            Effect.map(
              Option.match({
                onNone: () => undecided,
                onSome: (listed) => foundAmong(reply, listed),
              })
            )
          )
      );

    // A call that sets a state on a comment: done on success, and on a
    // comment already gone.
    // A call that sets a state on a comment (`confirmedAction`).
    const act = (
      account: ChannelAccount,
      method: "DELETE" | "POST",
      commentId: string,
      rootPostId: string,
      params: Readonly<Record<string, string>> = {}
    ): Effect.Effect<ActionOutcome> =>
      asAccount<ActionOutcome>(account, notDone, (token) =>
        confirmedAction(
          (verb, path, given = {}) =>
            request(account, token, verb, path, given).pipe(
              Effect.flatMap(http.execute),
              Effect.option
            ),
          method,
          commentId,
          rootPostId,
          params
        )
      );

    const moderate = (
      account: ChannelAccount,
      target: CommentTarget
    ): Effect.Effect<ActionOutcome> => {
      if (target.action === "hide" || target.action === "unhide") {
        return act(
          account,
          "POST",
          target.platformCommentId,
          target.rootPlatformPostId,
          {
            hide: target.action === "hide" ? "true" : "false",
          }
        );
      }

      // Instagram's API has no like; deleting someone's comment is not
      // done here yet.
      return Effect.succeed(notDone("refused"));
    };

    const platform: EngagementPlatform = {
      moderate,
      read,
      resume,
      send,
      withdraw: (account, platformCommentId, rootPlatformPostId) =>
        act(account, "DELETE", platformCommentId, rootPlatformPostId),
    };

    return platform;
  }
);
