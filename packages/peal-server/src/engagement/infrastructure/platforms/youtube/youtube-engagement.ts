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
  needsReconnect,
  refusedWith,
  unusable,
} from "#engagement/infrastructure/platforms/channel-refusals.ts";
import type {
  CommentTarget,
  EngagementPlatform,
  OutgoingReply,
  PlatformHttp,
} from "#engagement/infrastructure/platforms/engagement-platform.ts";
import {
  foundAmong,
  unanswered,
  undecided,
} from "#engagement/infrastructure/platforms/resumed-reply.ts";
import type { ListedReply } from "#engagement/infrastructure/platforms/resumed-reply.ts";
import { threadBodyOf } from "#engagement/infrastructure/platforms/thread-body.ts";
import { PlatformQuota } from "#publishing/application/platform-quota.ts";
import { youtubeCommentScope } from "#shared/domain/inbox-platform.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { googleReasonOf } from "#shared/infrastructure/platforms/google-refusal.ts";
import { quotaDayOf } from "#shared/infrastructure/platforms/youtube-quota-day.ts";

// A YouTube channel's comments, from the YouTube Data API v3's reference
// (each page read 2026-11-12):
//
// - commentThreads.list (developers.google.com/youtube/v3/docs/
//   commentThreads/list): `GET /youtube/v3/commentThreads` by `videoId`,
//   `part=snippet,replies`, `maxResults` 1 to 100, `order=time`,
//   `textFormat=plainText`, `pageToken`; 1 quota unit. Errors: 403
//   `commentsDisabled`, 403 `forbidden`, 404 `videoNotFound`. A thread
//   "does not necessarily contain all replies to a comment"
//   (developers.google.com/youtube/v3/docs/commentThreads): when fewer
//   came than `snippet.totalReplyCount`, the rest are read with
//   comments.list.
// - comments.list (…/docs/comments/list): `GET /youtube/v3/comments` by
//   `parentId`, 1 unit; "YouTube currently supports replies only for
//   top-level comments".
// - The comment resource (…/docs/comments): `snippet.authorDisplayName`,
//   `authorChannelId.value`, `textDisplay`, `textOriginal` ("only returned
//   to the authenticated user if they are the comment's author"),
//   `parentId`, `publishedAt`, `moderationStatus` (only to the owner of
//   the channel or video).
// - comments.insert (…/docs/comments/insert): `POST /youtube/v3/comments`
//   with `snippet.parentId` and `snippet.textOriginal`, 50 units, a reply
//   to a top-level comment; no idempotency key. Errors include 400
//   `commentTextTooLong` (no length is stated), `parentCommentIsPrivate`,
//   403 `forbidden`, 404 `parentCommentNotFound`.
// - comments.delete (…/docs/comments/delete): `DELETE` by `id`, 50 units,
//   204; 404 `commentNotFound`; only the comment's author may.
// - comments.setModerationStatus (…/docs/comments/setModerationStatus):
//   `POST` with `id` and `moderationStatus` (`heldForReview`, `published`,
//   `rejected`), 50 units, 204, the channel's owner only. `rejected`
//   "effectively hides all replies to the rejected comment". The
//   reference says a rejected comment cannot be set to `published`; the
//   implementation guide (…/guides/implementation/comments) says it can
//   once its id is known. Showing again asks `published`, and a refusal
//   changes nothing in Peal. `banAuthor` is never sent.
// - Errors (…/docs/errors): 403 `quotaExceeded`, 403
//   `insufficientPermissions`; quotas (…/determine_quota_cost): 10,000
//   units a day for the project, reset at midnight Pacific Time, shared by
//   every workspace of a server, its publishing and its analytics.
// - The scope of every comment method is `youtube.force-ssl` (the
//   discovery document, `youtubeCommentScope`).

/**
 * How long YouTube lets Peal keep what the API gave without reading it
 * again: the YouTube API Services Developer Policies
 * (developers.google.com/youtube/terms/developer-policies, III.E.4, read
 * 2026-11-12) keep authorized data "for no longer than 30 calendar days",
 * after which it is deleted or refreshed. 29 days, so the hourly
 * retention forgets it before the 30th.
 */
export const youtubeRefreshWithin = Duration.days(29);

/**
 * The quota units comment reads may spend a Pacific day, across every
 * channel of the server: half of the project's 10,000, so publishing's
 * calls and analytics' keep the rest. Replies, hides and withdrawals are
 * a person's acts and are never held by it.
 */
export const youtubeCommentsDailyUnits = 5000;

/** The ledger bucket comment reads are counted in, one unit a call. */
export const youtubeCommentsBucket = "comments:youtube";

/** The comments one page of a read asks for: YouTube's most. */
const pageSize = 100;

// The pages a resume reads at most of the replies under one comment.
const resumePages = 10;

/** How long a read keeps the channel's gate unless told. */
const defaultDeadline = Duration.seconds(30);

export interface YouTubeEngagementOptions {
  /** The API's origin: `https://www.googleapis.com`, or a fake's in tests. */
  readonly api: URL;
  readonly http: PlatformHttp;
  /**
   * The client threads are read with, whose answers end at
   * `maxThreadBytes` rather than fail past a megabyte; `http` otherwise.
   */
  readonly reader?: PlatformHttp;
  /** How long a read may keep the channel's gate. */
  readonly deadline?: Duration.Duration;
  /** The units comment reads may spend a day (`youtubeCommentsDailyUnits`). */
  readonly dailyUnits?: number;
}

const CommentSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  snippet: Schema.Struct({
    authorChannelId: Schema.optionalKey(
      Schema.Struct({ value: Schema.optionalKey(Schema.String) })
    ),
    authorDisplayName: Schema.optionalKey(Schema.String),
    moderationStatus: Schema.optionalKey(Schema.String),
    parentId: Schema.optionalKey(Schema.String),
    publishedAt: Schema.String,
    textDisplay: Schema.optionalKey(Schema.String),
    textOriginal: Schema.optionalKey(Schema.String),
  }),
});

type YouTubeComment = typeof CommentSchema.Type;

const ThreadSchema = Schema.Struct({
  replies: Schema.optionalKey(
    Schema.Struct({
      comments: Schema.optionalKey(Schema.Array(CommentSchema)),
    })
  ),
  snippet: Schema.Struct({
    topLevelComment: CommentSchema,
    totalReplyCount: Schema.optionalKey(Schema.Number),
  }),
});

const ThreadsPageSchema = Schema.Struct({
  items: Schema.optionalKey(Schema.Array(ThreadSchema)),
  nextPageToken: Schema.optionalKey(Schema.String),
});

const CommentsPageSchema = Schema.Struct({
  items: Schema.optionalKey(Schema.Array(CommentSchema)),
  nextPageToken: Schema.optionalKey(Schema.String),
});

const threadsPageOf = threadBodyOf(ThreadsPageSchema);

const commentsPageOf = threadBodyOf(CommentsPageSchema);

const listedOf = HttpClientResponse.schemaBodyJson(CommentsPageSchema);

const madeOf = HttpClientResponse.schemaBodyJson(CommentSchema);

const isSuccess = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

/**
 * What YouTube refusing a comment call means, from its status and
 * `errors[].reason`:
 *
 * - `token`: 401 (but `youtubeSignupRequired`), or `authError`: the
 *   token, which a renewal replaces.
 * - `permission`: `insufficientPermissions`: the grant lacks the scope.
 * - `quota`: `quotaExceeded`, the project's day is spent.
 * - `rateLimited`: 429, `rateLimitExceeded`, `userRateLimitExceeded`.
 * - `unavailable`: 5xx.
 * - `disabled`: `commentsDisabled`, the video's comments are off.
 * - `gone`: `videoNotFound`, `commentNotFound` or `parentCommentNotFound`,
 *   the video or the comment no longer exists.
 * - `refused`: anything else.
 */
type YouTubeRefusal =
  | "disabled"
  | "gone"
  | "permission"
  | "quota"
  | "rateLimited"
  | "refused"
  | "token"
  | "unavailable";

const rateReasons: ReadonlySet<string> = new Set([
  "rateLimitExceeded",
  "userRateLimitExceeded",
]);

// What YouTube answers when the video, a comment or its parent is gone
// (commentThreads.list, comments.list, comments.insert, comments.delete,
// comments.setModerationStatus, each read 2026-11-12).
const goneReasons: ReadonlySet<string> = new Set([
  "commentNotFound",
  "parentCommentNotFound",
  "videoNotFound",
]);

const refusalOf = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<YouTubeRefusal> =>
  Effect.gen(function* refusing() {
    const { status } = response;

    if (status >= 500) {
      return "unavailable" as const;
    }

    const reason = Option.getOrElse(yield* googleReasonOf(response), () => "");

    if (reason === "quotaExceeded") {
      return "quota" as const;
    }

    if (status === 429 || rateReasons.has(reason)) {
      return "rateLimited" as const;
    }

    if (
      (status === 401 && reason !== "youtubeSignupRequired") ||
      reason === "authError"
    ) {
      return "token" as const;
    }

    if (reason === "insufficientPermissions") {
      return "permission" as const;
    }

    if (reason === "commentsDisabled") {
      return "disabled" as const;
    }

    // Only the documented reasons say the video, or the comment, is gone:
    // any other 404, or one without Google's error, proves nothing.
    return goneReasons.has(reason) ? ("gone" as const) : ("refused" as const);
  });

/** Why an act was not done, from YouTube's refusal of it. */
const actionFailure = (refusal: YouTubeRefusal): ReplyFailure => {
  if (refusal === "quota" || refusal === "rateLimited") {
    return "rateLimited";
  }

  if (refusal === "unavailable") {
    return "platformUnavailable";
  }

  return refusal === "gone" ? "commentGone" : "refused";
};

const done: ActionOutcome = { _tag: "done" };

const notDone = (reason: ReplyFailure): ActionOutcome => ({
  _tag: "failed",
  reason,
});

// The author as YouTube shows them: their channel's id and the name they
// display. Nothing else of them. None without a channel id.
const authorOf = (comment: YouTubeComment) =>
  Option.fromUndefinedOr(comment.snippet.authorChannelId?.value).pipe(
    Option.filter((id) => id !== ""),
    Option.map((platformId) => {
      const name = comment.snippet.authorDisplayName?.trim() ?? "";

      // A name YouTube gives as a handle (`@name`) is that handle, which
      // the clients show with its `@`; any other is a name, with no
      // handle, as on Facebook.
      return name.startsWith("@")
        ? {
            displayName: Option.none<string>(),
            handle: name.slice(1),
            platformId,
          }
        : {
            displayName: Option.some(name).pipe(Option.filter((n) => n !== "")),
            handle: "",
            platformId,
          };
    })
  );

// A comment as Peal reads it; a reply answers `parent`, its top-level
// comment, when YouTube's answer does not say so itself.
const readingOf = (
  comment: YouTubeComment,
  accountId: string,
  parent: Option.Option<string> = Option.none()
): Option.Option<CommentReading> =>
  DateTime.make(comment.snippet.publishedAt).pipe(
    Option.map((writtenAt): CommentReading => {
      const status = comment.snippet.moderationStatus;

      return {
        author: authorOf(comment),
        fromAccount: comment.snippet.authorChannelId?.value === accountId,
        // Told only to the channel's owner; the threads Peal lists are
        // those shown (`published`), so a rejected one is read as gone.
        hidden:
          status === undefined
            ? Option.none()
            : Option.some(status === "rejected"),
        liked: Option.none(),
        parentPlatformId: Option.fromUndefinedOr(comment.snippet.parentId).pipe(
          Option.filter((id) => id !== ""),
          Option.orElse(() => parent)
        ),
        // YouTube's reference gives no address for a comment.
        permalink: Option.none(),
        platformCommentId: comment.id,
        text: comment.snippet.textDisplay ?? "",
        writtenAt,
      };
    })
  );

// YouTube has one level of replies: an answer to a reply goes under the
// top-level comment the reply answers.
const topLevelOf = (reply: OutgoingReply) =>
  Option.getOrElse(reply.grandparentPlatformId, () => reply.parentPlatformId);

const pageAfter = (token: Option.Option<string>) =>
  Option.match(token, {
    onNone: () => ({}),
    onSome: (pageToken) => ({ pageToken }),
  });

const nextOf = (token: string | undefined) =>
  Option.fromUndefinedOr(token).pipe(Option.filter((next) => next !== ""));

/**
 * YouTube's comments under the channel's videos, Shorts included. A
 * thread is read by pages of 100 top-level comments with their replies,
 * then the replies of a comment that came with fewer than it has; each
 * call spends a unit of the server's day of comment reads
 * (`youtubeCommentsDailyUnits`), and the read halts once it is spent, or
 * once YouTube says the project's quota is. A comment by the channel
 * itself is the account's own. A reply is one request, under the
 * top-level comment (YouTube has one level of replies); YouTube takes no
 * idempotency key, so a resumed reply is never sent: it is looked for
 * among the replies under that comment. Hiding rejects the comment, and
 * showing it publishes it again; withdrawing deletes the channel's own
 * reply, and one already gone is done.
 */
export const youtubeEngagement = Effect.fn("YouTubeEngagement.make")(
  function* youtubeEngagement(options: YouTubeEngagementOptions) {
    const access = yield* ChannelAccess;
    const quota = yield* PlatformQuota;
    const { api, http } = options;
    const reader = options.reader ?? http;
    const deadlineAfter = options.deadline ?? defaultDeadline;
    const dailyUnits = options.dailyUnits ?? youtubeCommentsDailyUnits;

    const url = (path: string) => new URL(`/youtube/v3/${path}`, api);

    const get = (
      token: Redacted.Redacted,
      path: string,
      params: Readonly<Record<string, string>>
    ) =>
      HttpClientRequest.get(url(path)).pipe(
        HttpClientRequest.setUrlParams(params),
        HttpClientRequest.bearerToken(token)
      );

    // A unit of the day's comment reads, if one is left: whether it was.
    // The ledger being down reads nothing more this time.
    const spendUnit = DateTime.now.pipe(
      Effect.flatMap((now) =>
        quota.spend({
          allowance: dailyUnits,
          bucket: youtubeCommentsBucket,
          day: quotaDayOf(now),
          units: 1,
        })
      ),
      Effect.orElseSucceed(() => false)
    );

    // YouTube said the project's quota is spent: no comment is read again
    // before its next day.
    const quotaSpent = DateTime.now.pipe(
      Effect.flatMap((now) =>
        quota.exhaust({
          allowance: dailyUnits,
          bucket: youtubeCommentsBucket,
          day: quotaDayOf(now),
        })
      ),
      Effect.ignore
    );

    type Step =
      | { readonly _tag: "read"; readonly reading: ThreadReading }
      | {
          readonly _tag: "halt";
          readonly reading: Option.Option<ThreadReading>;
        };

    // What reading one thread found so far, and what a refusal makes of
    // it (`Step`), for the thread being read.
    const progress = (thread: ThreadToRead, first: boolean) => {
      const comments: CommentReading[] = [];

      const read = (whole: boolean): Step => ({
        _tag: "read",
        reading: {
          _tag: "read",
          comments,
          complete: whole,
          threadId: thread.threadId,
        },
      });

      const failed: Step = {
        _tag: "read",
        reading: { _tag: "failed", threadId: thread.threadId },
      };

      // What was read so far is kept, and the rest of the batch waits.
      const halt = (): Step => ({
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
      });

      const missing: Step = {
        _tag: "read",
        reading: { _tag: "missing", threadId: thread.threadId },
      };

      // What YouTube refusing a page means for this thread: null when
      // only the replies of one comment stop there.
      const refused = Effect.fn("YouTubeEngagement.refusedRead")(
        function* refused(
          response: HttpClientResponse.HttpClientResponse,
          listing: "replies" | "threads"
        ) {
          const refusal = yield* refusalOf(response);

          if (refusal === "token") {
            return yield* new TokenRejected();
          }

          if (refusal === "quota") {
            yield* quotaSpent;

            return halt();
          }

          if (refusal === "rateLimited") {
            return halt();
          }

          // YouTube failed: what came first is kept, and the rest waits.
          if (refusal === "unavailable") {
            return first && comments.length === 0
              ? yield* new PlatformUnavailable()
              : halt();
          }

          // The grant lacks the scope: on the batch's first thread the
          // channel waits; later, after one was read, only this thread.
          if (refusal === "permission") {
            return first
              ? yield* new ChannelUnreadable({ reason: "paused" })
              : failed;
          }

          // Comments turned off on the video: nothing is shown now, and
          // nothing Peal holds is taken for deleted.
          if (refusal === "disabled") {
            return read(false);
          }

          if (refusal !== "gone") {
            return failed;
          }

          // The video is gone, and its comments with it; a comment gone
          // while its replies were read leaves what was read standing.
          if (listing === "threads") {
            return comments.length === 0 ? missing : read(false);
          }

          return null;
        }
      );

      return { comments, failed, halt, read, refused };
    };

    type Progress = ReturnType<typeof progress>;

    // A page and whether more follow, or the step the read ends with.
    type Paged =
      | { readonly _tag: "page"; readonly next: Option.Option<string> }
      | { readonly _tag: "step"; readonly step: Step };

    const stepped = (step: Step): Paged => ({ _tag: "step", step });

    // One page of the video's threads, its comments kept with the
    // top-level comments whose replies came short.
    const threadsPage = Effect.fn("YouTubeEngagement.threadsPage")(
      function* threadsPage(
        account: ChannelAccount,
        token: Redacted.Redacted,
        thread: ThreadToRead,
        at: Progress,
        pageToken: Option.Option<string>,
        short: string[]
      ) {
        if (!(yield* spendUnit)) {
          return stepped(at.halt());
        }

        const sent = yield* get(token, "commentThreads", {
          maxResults: String(pageSize),
          order: "time",
          part: "snippet,replies",
          textFormat: "plainText",
          videoId: thread.platformPostId,
          ...pageAfter(pageToken),
        }).pipe(reader.execute, Effect.result);

        if (sent._tag === "Failure") {
          return stepped(at.failed);
        }

        if (!isSuccess(sent.success)) {
          const step = yield* at.refused(sent.success, "threads");

          return stepped(step ?? at.failed);
        }

        const page = yield* threadsPageOf(sent.success);

        if (Option.isNone(page)) {
          return stepped(at.failed);
        }

        for (const item of page.value.body.items ?? []) {
          const top = item.snippet.topLevelComment;
          const replies = item.replies?.comments ?? [];

          at.comments.push(
            ...Option.toArray(readingOf(top, account.accountId)),
            ...replies.flatMap((reply) =>
              Option.toArray(
                readingOf(reply, account.accountId, Option.some(top.id))
              )
            )
          );

          if ((item.snippet.totalReplyCount ?? 0) > replies.length) {
            short.push(top.id);
          }
        }

        const paged: Paged = page.value.whole
          ? { _tag: "page", next: nextOf(page.value.body.nextPageToken) }
          : stepped(at.read(false));

        return paged;
      }
    );

    // One page of a top-level comment's replies, those not read yet kept;
    // none when the comment is gone and its replies stop there.
    const repliesPage = Effect.fn("YouTubeEngagement.repliesPage")(
      function* repliesPage(
        account: ChannelAccount,
        token: Redacted.Redacted,
        at: Progress,
        parentId: string,
        after: Option.Option<string>
      ) {
        if (!(yield* spendUnit)) {
          return Option.some(stepped(at.halt()));
        }

        const sent = yield* get(token, "comments", {
          maxResults: String(pageSize),
          parentId,
          part: "snippet",
          textFormat: "plainText",
          ...pageAfter(after),
        }).pipe(reader.execute, Effect.result);

        if (sent._tag === "Failure") {
          return Option.some(stepped(at.failed));
        }

        if (!isSuccess(sent.success)) {
          const step = yield* at.refused(sent.success, "replies");

          return Option.map(Option.fromNullOr(step), stepped);
        }

        const page = yield* commentsPageOf(sent.success);

        if (Option.isNone(page)) {
          return Option.some(stepped(at.failed));
        }

        const known = new Set(
          at.comments.map(({ platformCommentId }) => platformCommentId)
        );

        for (const reply of page.value.body.items ?? []) {
          if (!known.has(reply.id)) {
            at.comments.push(
              ...Option.toArray(
                readingOf(reply, account.accountId, Option.some(parentId))
              )
            );
          }
        }

        const paged: Paged = page.value.whole
          ? { _tag: "page", next: nextOf(page.value.body.nextPageToken) }
          : stepped(at.read(false));

        return Option.some(paged);
      }
    );

    const readOne = Effect.fn("YouTubeEngagement.thread")(function* readOne(
      account: ChannelAccount,
      token: Redacted.Redacted,
      thread: ThreadToRead,
      deadline: DateTime.Utc,
      first: boolean
    ) {
      const at = progress(thread, first);
      // Top-level comments whose replies came short.
      const short: string[] = [];
      let complete = true;

      const isOver = DateTime.now.pipe(
        Effect.map(
          (now) =>
            at.comments.length >= commentsPerThread ||
            DateTime.isGreaterThanOrEqualTo(now, deadline)
        )
      );

      let pageToken = Option.none<string>();

      do {
        if (Option.isSome(pageToken) && (yield* isOver)) {
          return at.read(false);
        }

        const paged = yield* threadsPage(
          account,
          token,
          thread,
          at,
          pageToken,
          short
        );

        if (paged._tag === "step") {
          return paged.step;
        }

        pageToken = paged.next;
      } while (Option.isSome(pageToken));

      // The replies the threads came without, comment by comment.
      for (const parentId of short) {
        let after = Option.none<string>();

        do {
          if (yield* isOver) {
            return at.read(false);
          }

          const paged = yield* repliesPage(account, token, at, parentId, after);

          if (Option.isNone(paged)) {
            // This comment's replies stop here; the others are read.
            complete = false;
            after = Option.none();
          } else if (paged.value._tag === "step") {
            return paged.value.step;
          } else {
            after = paged.value.next;
          }
        } while (Option.isSome(after));
      }

      return at.read(complete);
    });

    const readAll = Effect.fn("YouTubeEngagement.readAll")(function* readAll(
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
      // A channel that did not grant the comment scope is read once it
      // does: nothing is asked of YouTube meanwhile.
      account.scopes.includes(youtubeCommentScope)
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
        Effect.fn("YouTubeEngagement.reply")(function* sending(token) {
          const request = HttpClientRequest.post(url("comments")).pipe(
            HttpClientRequest.setUrlParams({ part: "snippet" }),
            HttpClientRequest.bearerToken(token),
            HttpClientRequest.bodyJsonUnsafe({
              snippet: {
                parentId: topLevelOf(reply),
                textOriginal: reply.text,
              },
            })
          );

          const sent = yield* http.execute(request).pipe(Effect.result);

          // The request may have reached YouTube.
          if (sent._tag === "Failure") {
            return unanswered;
          }

          const response = sent.success;

          if (isSuccess(response)) {
            return yield* madeOf(response).pipe(
              Effect.map(({ id }): SendOutcome => ({
                _tag: "sent",
                permalink: Option.none(),
                platformCommentId: id,
              })),
              // Made, and answered in a shape Peal cannot read.
              Effect.orElseSucceed(() => unanswered)
            );
          }

          const refusal = yield* refusalOf(response);

          // YouTube failed on the reply itself: it may be there.
          if (refusal === "unavailable") {
            return unanswered;
          }

          // Refused before anything was made: a renewed token is tried.
          if (refusal === "token") {
            return yield* new TokenRejected();
          }

          if (refusal === "quota") {
            yield* quotaSpent;
          }

          const outcome: SendOutcome = {
            _tag: "failed",
            reason: actionFailure(refusal),
          };

          return outcome;
        })
      );

    // The replies under a top-level comment, every page of them; none
    // when any page could not be read, or there are more than a resume
    // reads.
    const repliesUnder = Effect.fn("YouTubeEngagement.replies")(
      function* repliesUnder(
        account: ChannelAccount,
        token: Redacted.Redacted,
        parentId: string
      ) {
        const listed: ListedReply[] = [];
        let after = Option.none<string>();

        for (let page = 0; page < resumePages; page += 1) {
          const sent = yield* get(token, "comments", {
            maxResults: String(pageSize),
            parentId,
            part: "snippet",
            textFormat: "plainText",
            ...pageAfter(after),
          }).pipe(http.execute, Effect.result);

          if (sent._tag === "Failure" || !isSuccess(sent.success)) {
            return Option.none<readonly ListedReply[]>();
          }

          const body = yield* listedOf(sent.success).pipe(Effect.option);

          if (Option.isNone(body)) {
            return Option.none<readonly ListedReply[]>();
          }

          for (const comment of body.value.items ?? []) {
            listed.push({
              fromAccount:
                comment.snippet.authorChannelId?.value === account.accountId,
              id: comment.id,
              // The original, which YouTube gives the account for its own.
              text:
                comment.snippet.textOriginal ??
                comment.snippet.textDisplay ??
                "",
              writtenAt: DateTime.make(comment.snippet.publishedAt),
            });
          }

          after = nextOf(body.value.nextPageToken);

          if (Option.isNone(after)) {
            return Option.some<readonly ListedReply[]>(listed);
          }
        }

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
          repliesUnder(account, token, topLevelOf(reply)).pipe(
            Effect.map(
              Option.match({
                onNone: () => undecided,
                onSome: (listed) => foundAmong(reply, listed),
              })
            )
          )
      );

    // A call that sets a state, answered 204: done; `goneIsDone` when a
    // comment already gone leaves nothing to do.
    const act = (
      account: ChannelAccount,
      request: (
        token: Redacted.Redacted
      ) => HttpClientRequest.HttpClientRequest,
      goneIsDone: boolean
    ): Effect.Effect<ActionOutcome> =>
      asAccount<ActionOutcome>(
        account,
        notDone,
        Effect.fn("YouTubeEngagement.act")(function* acting(token) {
          const sent = yield* http.execute(request(token)).pipe(Effect.result);

          if (sent._tag === "Failure") {
            return notDone("platformUnavailable");
          }

          if (isSuccess(sent.success)) {
            return done;
          }

          const refusal = yield* refusalOf(sent.success);

          if (refusal === "token") {
            return yield* new TokenRejected();
          }

          if (refusal === "quota") {
            yield* quotaSpent;
          }

          return refusal === "gone" && goneIsDone
            ? done
            : notDone(actionFailure(refusal));
        })
      );

    const withdraw = (account: ChannelAccount, platformCommentId: string) =>
      act(
        account,
        (token) =>
          HttpClientRequest.delete(url("comments")).pipe(
            HttpClientRequest.setUrlParams({ id: platformCommentId }),
            HttpClientRequest.bearerToken(token)
          ),
        true
      );

    const moderate = (
      account: ChannelAccount,
      target: CommentTarget
    ): Effect.Effect<ActionOutcome> => {
      if (target.action !== "hide" && target.action !== "unhide") {
        // YouTube's API has no like, and only an author deletes a comment.
        return Effect.succeed(notDone("refused"));
      }

      const hide = target.action === "hide";

      return act(
        account,
        (token) =>
          HttpClientRequest.post(url("comments/setModerationStatus")).pipe(
            HttpClientRequest.setUrlParams({
              id: target.platformCommentId,
              moderationStatus: hide ? "rejected" : "published",
            }),
            HttpClientRequest.bearerToken(token)
          ),
        // A comment gone is hidden as much as it can be; it cannot be
        // shown again.
        hide
      );
    };

    const platform: EngagementPlatform = {
      moderate,
      read,
      resume,
      send,
      withdraw: (account, platformCommentId) =>
        withdraw(account, platformCommentId),
    };

    return platform;
  }
);
