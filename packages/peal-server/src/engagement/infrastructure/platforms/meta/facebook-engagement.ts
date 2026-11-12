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
import { facebookCommentScopes } from "#shared/domain/inbox-platform.ts";
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
  pastUsageCeiling,
  requestsWith,
  unanswered,
  undecided,
} from "./meta-comments.ts";
import type { ListedReply, MetaEngagementOptions } from "./meta-comments.ts";

// A Page's comments, from Meta's pages (read 2026-11-12):
//
// - Comments of an object (developers.facebook.com/docs/graph-api/
//   reference/object/comments/): `GET /{object-id}/comments`, `filter=stream`
//   for every level in chronological order; `POST /{object-id}/comments`
//   with `message` answers `{ "id" }` and needs `pages_manage_engagement`
//   or a Page token of someone who may MODERATE the Page; "other users'
//   profile information and comments will not be returned" unless they
//   authorize the app, so an author may be missing.
// - The Pages API's comments guide (developers.facebook.com/docs/pages-api/
//   comments-mentions): `from` (the commenter's Page-scoped id and name),
//   `message`, `created_time` (`2020-02-19T23:05:53+0000`), and `from` only
//   when asked for in `fields`.
// - Comment (developers.facebook.com/docs/graph-api/reference/comment/,
//   v27.0): `parent` names the comment a reply answers; updating
//   `POST /{comment-id}` with `is_hidden` ("only applicable to Page
//   comments") and `DELETE /{comment-id}` each answer `{ success }`. The
//   reference lists no `is_hidden` field to read, so a read cannot tell
//   whether a comment is hidden, and none states a length for `message`.

// The fields of a comment Peal reads: who wrote it (their id and name),
// what it says, when, and what it answers. Nothing else of the author.
const commentFields = "id,from{id,name},message,created_time,parent{id}";

// What a resume reads of the replies under a comment.
const replyFields = "id,from{id},message,created_time";

const CommentSchema = Schema.Struct({
  created_time: Schema.String,
  from: Schema.optionalKey(
    Schema.Struct({
      id: Schema.NonEmptyString,
      name: Schema.optionalKey(Schema.String),
    })
  ),
  id: Schema.NonEmptyString,
  message: Schema.optionalKey(Schema.String),
  parent: Schema.optionalKey(Schema.Struct({ id: Schema.String })),
});

type FacebookComment = typeof CommentSchema.Type;

const PageSchema = Schema.Struct({
  data: Schema.Array(CommentSchema),
  paging: PagingSchema,
});

const pageOf = threadBodyOf(PageSchema);

const listedOf = HttpClientResponse.schemaBodyJson(PageSchema);

// The pages a resume reads at most of the replies under one comment.
const resumePages = 10;

const resumePageSize = 100;

const readingOf = (
  comment: FacebookComment,
  postId: string,
  accountId: string
): Option.Option<CommentReading> =>
  instantOf(comment.created_time).pipe(
    Option.map((writtenAt): CommentReading => ({
      author: Option.fromUndefinedOr(comment.from).pipe(
        Option.map((from) => ({
          displayName: Option.fromUndefinedOr(from.name).pipe(
            Option.filter((name) => name.trim() !== "")
          ),
          // Facebook shows a name, and no handle.
          handle: "",
          platformId: from.id,
        }))
      ),
      fromAccount: comment.from?.id === accountId,
      hidden: Option.none(),
      liked: Option.none(),
      parentPlatformId: Option.fromUndefinedOr(comment.parent?.id).pipe(
        Option.filter((parent) => parent !== "" && parent !== postId)
      ),
      permalink: Option.none(),
      platformCommentId: comment.id,
      text: comment.message ?? "",
      writtenAt,
    }))
  );

/**
 * Facebook Pages' comments under the Page's posts. A thread is read
 * across pages of 25, every level at once (`filter=stream`), with the
 * Page's token and its proof; a comment by the Page itself is the
 * account's own. A reply is one request; Meta takes no idempotency key, so
 * a resumed reply is never sent: it is looked for among the replies under
 * its comment, and left to a person when not found exactly once. Hiding
 * and deleting set a state, and a comment already gone is done.
 */
export const facebookEngagement = Effect.fn("FacebookEngagement.make")(
  function* facebookEngagement(options: MetaEngagementOptions) {
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
    const refusedRead = Effect.fn("FacebookEngagement.refusedRead")(
      function* refusedRead(
        response: HttpClientResponse.HttpClientResponse,
        reading: {
          readonly account: ChannelAccount;
          readonly comments: readonly CommentReading[];
          /** Whether no thread of the batch was read before this one. */
          readonly first: boolean;
          readonly thread: ThreadToRead;
          readonly token: Redacted.Redacted;
        }
      ) {
        const { account, comments, first, thread, token } = reading;
        const refusal = yield* metaRefusalOf(response);

        const failed: Step = {
          _tag: "read",
          reading: { _tag: "failed", threadId: thread.threadId },
        };

        if (refusal === "token") {
          return yield* new TokenRejected();
        }

        // A permission the token lacks pauses the channel when the batch's
        // first thread meets it; a later one, after another thread was
        // read, is that thread's own (Meta also answers 200 to 299 for one
        // object, such as 210 "User not visible"), and only it waits.
        if (refusal === "permission") {
          return first
            ? yield* new ChannelUnreadable({ reason: "paused" })
            : failed;
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

        if (refusal !== "gone" || comments.length > 0) {
          return failed;
        }

        // Code 100, subcode 33 also says an object "cannot be loaded due to
        // missing permissions": the post is gone, and its comments with
        // it, only when the same token still loads the account itself.
        // Otherwise the channel waits, and nothing is erased.
        const own = yield* request(
          account,
          token,
          "GET",
          nodePath(account.accountId),
          { fields: "id" }
        ).pipe(Effect.flatMap(reader.execute), Effect.option);

        if (!Option.exists(own, isSuccess)) {
          return yield* new ChannelUnreadable({ reason: "paused" });
        }

        const missing: Step = {
          _tag: "read",
          reading: { _tag: "missing", threadId: thread.threadId },
        };

        return missing;
      }
    );

    const readOne = Effect.fn("FacebookEngagement.thread")(function* readOne(
      account: ChannelAccount,
      token: Redacted.Redacted,
      thread: ThreadToRead,
      deadline: DateTime.Utc,
      first: boolean
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
            filter: "stream",
            limit: String(commentsPerPage),
            ...pageAfter(after),
          }
        ).pipe(Effect.flatMap(reader.execute), Effect.result);

        if (sent._tag === "Failure") {
          return failedOn;
        }

        const response = sent.success;

        if (!isSuccess(response)) {
          return yield* refusedRead(response, {
            account,
            comments,
            first,
            thread,
            token,
          });
        }

        const page = yield* pageOf(response);

        if (Option.isNone(page)) {
          return failedOn;
        }

        for (const comment of page.value.body.data) {
          comments.push(
            ...Option.toArray(
              readingOf(comment, thread.platformPostId, account.accountId)
            )
          );
        }

        after = nextCursor(page.value.body.paging);

        // Past the share of Meta's limits a read may use, the read stops
        // with what it has, and the batch with it.
        if (pastUsageCeiling(response)) {
          const halt: Step = {
            _tag: "halt",
            reading: Option.some({
              _tag: "read",
              comments,
              complete: page.value.whole && Option.isNone(after),
              threadId: thread.threadId,
            }),
          };

          return halt;
        }

        // Every comment was read only when every page came whole.
        if (page.value.whole && Option.isNone(after)) {
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
          comments.length >= commentsPerThread ||
          DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)
        ) {
          const step: Step = { _tag: "read", reading: partial };

          return step;
        }
      }
    });

    const readAll = Effect.fn("FacebookEngagement.readAll")(function* readAll(
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

        const step = yield* readOne(
          account,
          token,
          thread,
          deadline,
          readings.length === 0
        );

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
      // A Page that did not grant reading its comments is read once it
      // does: nothing is asked of Meta meanwhile.
      account.scopes.includes(facebookCommentScopes.read)
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
        Effect.fn("FacebookEngagement.reply")(function* sending(token) {
          const sent = yield* request(
            account,
            token,
            "POST",
            nodePath(reply.parentPlatformId, "comments"),
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
          // tried, which a Page's never is.
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
    const repliesUnder = Effect.fn("FacebookEngagement.replies")(
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
            nodePath(commentId, "comments"),
            {
              fields: replyFields,
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
              fromAccount: comment.from?.id === account.accountId,
              id: comment.id,
              text: comment.message ?? "",
              writtenAt: instantOf(comment.created_time),
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
          // Under the comment answered, and under its own parent too when
          // it is a reply: Facebook's pages do not say where a reply to a
          // reply goes. More places only make a match rarer, never wrong.
          Effect.forEach(
            [
              reply.parentPlatformId,
              ...Option.toArray(reply.grandparentPlatformId),
            ],
            (commentId) => repliesUnder(account, token, commentId)
          ).pipe(
            Effect.map((lists) =>
              Option.match(Option.all(lists), {
                onNone: () => undecided,
                onSome: (listed) => foundAmong(reply, listed.flat()),
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
            is_hidden: target.action === "hide" ? "true" : "false",
          }
        );
      }

      // Likes and deleting someone's comment are not done here yet.
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
