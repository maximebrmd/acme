import { Config, DateTime, Duration, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { Headers, HttpClientRequest, HttpClientResponse } from "effect/http";

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
import { connectionOf } from "#shared/domain/channel-connection.ts";
import { linkedinCommentScopes } from "#shared/domain/inbox-platform.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { localDateOf } from "#shared/domain/wall-clock.ts";
import {
  encodedUrn,
  isLinkedInError,
  isOrganization,
  restCall,
} from "#shared/infrastructure/platforms/linkedin-rest.ts";

// A LinkedIn company page's comments, from LinkedIn's Marketing API pages
// (each read 2026-11-12, documenting version 2026-10):
//
// - Comments API (learn.microsoft.com/en-us/linkedin/marketing/
//   community-management/shares/comments-api, dated 2026-04-28):
//   `GET /rest/socialActions/{shareUrn|ugcPostUrn|commentUrn}/comments`,
//   a comment's nested comments under its `commentUrn`; a comment has
//   `id`, `commentUrn` ("a composite URN constructed using the ID of the
//   comment and the URN of the thread the comment is on", whose thread
//   may be an `urn:li:activity:…`), `actor`, `created.time`,
//   `message.text`, `parentComment`, `object`. `POST` on the same path,
//   with `actor`, `object`, `message` and `parentComment`, answers the new
//   comment's id in `x-restli-id`; 429 "Comment create throttled" is a
//   member's one-minute limit. `DELETE …/comments/{comment ID}?actor=…`
//   deletes one as an organization. No length is stated, and no
//   idempotency key taken.
// - Social Actions (…/network-update-social-actions, dated 2026-04-28):
//   `GET /rest/socialActions/{urn}` gives `commentsSummary`, which a share
//   without comments does not show; fetching the comments of one without
//   any "returns 404 - Not Found", so the summary is read first. "Setting
//   the page `count` to less than 200 … to prevent timeouts".
// - Data Storage Requirements (…/marketing/data-storage-requirements,
//   updated 2026-02-02): members' social activity (comments) 48 hours,
//   other members' profile data 24 hours of caching and never stored,
//   member URNs and the ids of posts and comments without limit; "the
//   shortest storage/caching duration shall apply". So Peal keeps a
//   commenter's URN, fetches no profile (no name), and forgets a comment
//   not read again within a day (`linkedinRefreshWithin`).
// - Increasing access (…/marketing/increasing-access, dated 2026-10-14):
//   the Development tier allows "500 API calls for an app for 24 hrs" and
//   "100 API calls per member": a server there halts on 429 most days.

/**
 * How long Peal keeps what LinkedIn gave without reading it again: a day,
 * the shortest bound that could apply (other members' profile data, 24
 * hours; comments themselves are 48).
 */
export const linkedinRefreshWithin = Duration.hours(24);

/**
 * The calls comment reads may make a day, by UTC day: of the app's, and of
 * each page's. LinkedIn's Development tier allows "500 API calls for an
 * app for 24 hrs" and "100 API calls per member of an App for 24 hrs" for
 * every call, posting included (…/marketing/increasing-access, read
 * 2026-11-12): reads take 200 of the app's and 40 a page by default, so
 * publishing keeps the rest. A Standard-tier server raises them
 * (`LINKEDIN_DAILY_COMMENT_CALLS`, `LINKEDIN_DAILY_COMMENT_CALLS_PER_PAGE`).
 * Peal keeps no member for a page, so the second is counted by page: a
 * member who administers several pages shares their 100 across them.
 */
export const linkedinCommentsDailyCalls = { app: 200, perPage: 40 } as const;

/** The daily calls reads may make, of the app's and of each page's. */
export interface LinkedInReadCalls {
  readonly app: number;
  readonly perPage: number;
}

/**
 * `LINKEDIN_DAILY_COMMENT_CALLS` and `LINKEDIN_DAILY_COMMENT_CALLS_PER_PAGE`:
 * what comment reads may call a day, across the app and for one page. A
 * value that is not a whole number stops the server.
 */
export const linkedinReadCallsConfig = Config.all({
  app: Config.schema(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    "LINKEDIN_DAILY_COMMENT_CALLS"
  ).pipe(Config.withDefault(linkedinCommentsDailyCalls.app)),
  perPage: Config.schema(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    "LINKEDIN_DAILY_COMMENT_CALLS_PER_PAGE"
  ).pipe(Config.withDefault(linkedinCommentsDailyCalls.perPage)),
});

/** The ledger bucket of the app's read calls; a page's adds its channel. */
export const linkedinCommentsBucket = "comments:linkedin";

const utc = TimeZoneIdSchema.make("UTC");

/** The comments one page of a read asks for, under LinkedIn's 200. */
const pageSize = 100;

// The pages a read takes of one list, and a resume of the replies: as
// many as `commentsPerThread` needs at LinkedIn's sample page of 10.
const listPages = 50;

/** How long a read keeps the channel's gate unless told. */
const defaultDeadline = Duration.seconds(30);

export interface LinkedInEngagementOptions {
  /** The REST API's origin: `https://api.linkedin.com`, or a fake's. */
  readonly api: URL;
  readonly http: PlatformHttp;
  /** The client threads are read with; `http` otherwise. */
  readonly reader?: PlatformHttp;
  /** The API version every call names (`Linkedin-Version`). */
  readonly version: string;
  /** What reads may call a day (`linkedinCommentsDailyCalls`). */
  readonly dailyCalls: LinkedInReadCalls;
  readonly deadline?: Duration.Duration;
}

const CommentSchema = Schema.Struct({
  actor: Schema.optionalKey(Schema.String),
  commentUrn: Schema.optionalKey(Schema.String),
  commentsSummary: Schema.optionalKey(
    Schema.Struct({
      aggregatedTotalComments: Schema.optionalKey(Schema.Number),
      totalFirstLevelComments: Schema.optionalKey(Schema.Number),
    })
  ),
  created: Schema.optionalKey(
    Schema.Struct({ time: Schema.optionalKey(Schema.Number) })
  ),
  id: Schema.optionalKey(Schema.String),
  message: Schema.optionalKey(
    Schema.Struct({ text: Schema.optionalKey(Schema.String) })
  ),
  parentComment: Schema.optionalKey(Schema.String),
});

type LinkedInComment = typeof CommentSchema.Type;

const PageSchema = Schema.Struct({
  elements: Schema.Array(CommentSchema),
  paging: Schema.optionalKey(
    Schema.Struct({
      links: Schema.optionalKey(
        Schema.Array(Schema.Struct({ rel: Schema.optionalKey(Schema.String) }))
      ),
      total: Schema.optionalKey(Schema.Number),
    })
  ),
});

type Paging = (typeof PageSchema.Type)["paging"];

/**
 * Whether LinkedIn says a list ends with what was read up to `read`
 * elements: its `paging.total` reached, or its `links` naming no next
 * page. A page shorter than asked proves nothing, as LinkedIn may answer
 * fewer than `count` (its samples show 10).
 */
const listEnds = (paging: Paging | undefined, read: number): boolean => {
  if (paging?.total !== undefined) {
    return read >= paging.total;
  }

  return (
    paging?.links !== undefined &&
    !paging.links.some(({ rel }) => rel === "next")
  );
};

const SummarySchema = Schema.Struct({
  commentsSummary: Schema.optionalKey(
    Schema.Struct({
      aggregatedTotalComments: Schema.optionalKey(Schema.Number),
      totalFirstLevelComments: Schema.optionalKey(Schema.Number),
    })
  ),
});

const pageOf = threadBodyOf(PageSchema);

const listedOf = HttpClientResponse.schemaBodyJson(PageSchema);

const summaryOf = HttpClientResponse.schemaBodyJson(SummarySchema);

const madeOf = HttpClientResponse.schemaBodyJson(CommentSchema);

const isSuccess = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

// How many comments a summary says there are; none when it shows none.
const countOf = (
  summary: LinkedInComment["commentsSummary"] | undefined
): number =>
  summary?.aggregatedTotalComments ?? summary?.totalFirstLevelComments ?? 0;

// A comment's id inside its URN, `urn:li:comment:(<thread>,<id>)`, which
// the DELETE takes; an id given bare is its own.
const commentIdOf = (platformCommentId: string): string =>
  /^urn:li:comment:\(.+,(?<id>[^,()]+)\)$/u.exec(platformCommentId)?.groups?.[
    "id"
  ] ?? platformCommentId;

// The comment as Peal keeps it: by its URN, as LinkedIn gave it (the
// thread inside may be an activity the post's URN is not), its author by
// their URN alone, with no name.
const readingOf = (
  comment: LinkedInComment,
  accountId: string
): Option.Option<CommentReading> => {
  const urn = comment.commentUrn ?? "";
  const actor = comment.actor ?? "";
  const time = comment.created?.time;

  if (urn === "" || time === undefined) {
    return Option.none();
  }

  return DateTime.make(time).pipe(
    Option.map((writtenAt): CommentReading => ({
      author:
        actor === ""
          ? Option.none()
          : Option.some({
              displayName: Option.none(),
              handle: "",
              platformId: actor,
            }),
      fromAccount: actor === accountId,
      hidden: Option.none(),
      liked: Option.none(),
      parentPlatformId: Option.fromUndefinedOr(comment.parentComment).pipe(
        Option.filter((parent) => parent !== "")
      ),
      permalink: Option.none(),
      platformCommentId: urn,
      text: comment.message?.text ?? "",
      writtenAt,
    }))
  );
};

// LinkedIn has two levels: an answer to a nested comment goes under the
// top-level comment it answers.
const topLevelOf = (reply: OutgoingReply) =>
  Option.getOrElse(reply.grandparentPlatformId, () => reply.parentPlatformId);

const done: ActionOutcome = { _tag: "done" };

const notDone = (reason: ReplyFailure): ActionOutcome => ({
  _tag: "failed",
  reason,
});

// What a LinkedIn refusal of an act means, once it is LinkedIn's own.
const actFailure = (status: number): ReplyFailure => {
  if (status === 429) {
    return "rateLimited";
  }

  if (status >= 500) {
    return "platformUnavailable";
  }

  return status === 404 ? "commentGone" : "refused";
};

// The page the channel posts as, and whether the account may read its
// comments: a page, with the read scope.
const isPage = (account: ChannelAccount) =>
  isOrganization(account.accountId) &&
  Option.contains(connectionOf("linkedin", account.connection), "linkedinPage");

/**
 * A LinkedIn company page's comments under its posts. A thread is read
 * from its summary, then its comments by pages of 100, then the nested
 * comments of each that has some (two levels, as LinkedIn has). A comment
 * by the page itself is the account's own. A reply is one request, as the
 * page, under the top-level comment; LinkedIn takes no idempotency key, so
 * a resumed reply is never sent: it is looked for among the comments
 * under that one. Withdrawing deletes the page's own comment, and one
 * already gone is done. Nothing is hidden or liked.
 */
export const linkedinEngagement = Effect.fn("LinkedInEngagement.make")(
  function* linkedinEngagement(options: LinkedInEngagementOptions) {
    const access = yield* ChannelAccess;
    const quota = yield* PlatformQuota;
    const { api, dailyCalls, http, version } = options;
    const reader = options.reader ?? http;
    const deadlineAfter = options.deadline ?? defaultDeadline;
    const call = restCall(version);

    const actionsOf = (urn: string, edge = "") =>
      new URL(
        `/rest/socialActions/${encodedUrn(urn)}${edge === "" ? "" : `/${edge}`}`,
        api
      );

    const get = (url: URL, token: Redacted.Redacted, query = "") =>
      call(
        HttpClientRequest.get(query === "" ? url.href : `${url.href}?${query}`),
        token
      );

    // A call of the day's reads, of the app's and of the page's, if both
    // are left: whether it was. The ledger being down reads nothing more.
    const spendCall = (account: ChannelAccount) =>
      DateTime.now.pipe(
        Effect.flatMap((now) => {
          const day = localDateOf(now, utc);

          return quota
            .spend({
              allowance: dailyCalls.perPage,
              bucket: `${linkedinCommentsBucket}:${account.channelId}`,
              day,
              units: 1,
            })
            .pipe(
              Effect.flatMap((spent) =>
                spent
                  ? quota.spend({
                      allowance: dailyCalls.app,
                      bucket: linkedinCommentsBucket,
                      day,
                      units: 1,
                    })
                  : Effect.succeed(false)
              )
            );
        }),
        Effect.orElseSucceed(() => false)
      );

    type Step =
      | { readonly _tag: "read"; readonly reading: ThreadReading }
      | {
          readonly _tag: "halt";
          readonly reading: Option.Option<ThreadReading>;
        };

    const progress = (thread: ThreadToRead) => {
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

      return { comments, failed, halt, read };
    };

    type Progress = ReturnType<typeof progress>;

    // What LinkedIn refusing a read means: a refused token, for
    // ChannelAccess to renew; a permission the page lacks, which pauses
    // the channel on the batch's first thread and fails a later one; a
    // limit or a retired version, which halt the batch; LinkedIn down.
    // None for a 404, which the caller weighs.
    const refusedRead = Effect.fn("LinkedInEngagement.refusedRead")(
      function* refusedRead(
        response: HttpClientResponse.HttpClientResponse,
        at: Progress,
        first: boolean
      ) {
        const { status } = response;

        if (status >= 500) {
          return first && at.comments.length === 0
            ? yield* new PlatformUnavailable()
            : Option.some(at.halt());
        }

        if (!(yield* isLinkedInError(response))) {
          return Option.some(at.failed);
        }

        if (status === 401) {
          return yield* new TokenRejected();
        }

        if (status === 403) {
          return first
            ? yield* new ChannelUnreadable({ reason: "paused" })
            : Option.some(at.failed);
        }

        if (status === 426) {
          yield* Effect.logError(
            "LinkedIn retired the API version Peal sends: set LINKEDIN_API_VERSION"
          );

          return Option.some(at.halt());
        }

        if (status === 429) {
          return Option.some(at.halt());
        }

        return status === 404 ? Option.none<Step>() : Option.some(at.failed);
      }
    );

    // A list of comments under `target`, page by page, into `at`: none
    // when it was read whole, or the step the read ends with.
    const listInto = Effect.fn("LinkedInEngagement.list")(function* listInto(
      account: ChannelAccount,
      token: Redacted.Redacted,
      target: string,
      at: Progress,
      deadline: DateTime.Utc,
      first: boolean,
      nested: string[]
    ) {
      let start = 0;

      for (let page = 0; page < listPages; page += 1) {
        if (
          at.comments.length >= commentsPerThread ||
          DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)
        ) {
          return Option.some(at.read(false));
        }

        if (!(yield* spendCall(account))) {
          return Option.some(at.halt());
        }

        const sent = yield* reader
          .execute(
            get(
              actionsOf(target, "comments"),
              token,
              `start=${String(start)}&count=${String(pageSize)}`
            )
          )
          .pipe(Effect.result);

        if (sent._tag === "Failure") {
          return Option.some(at.failed);
        }

        if (!isSuccess(sent.success)) {
          const step = yield* refusedRead(sent.success, at, first);

          // A list LinkedIn says is not there, after its summary said it
          // was: what was read stands, not as all of it.
          return Option.some(Option.getOrElse(step, () => at.read(false)));
        }

        const body = yield* pageOf(sent.success);

        if (Option.isNone(body)) {
          return Option.some(at.failed);
        }

        const { elements, paging } = body.value.body;

        for (const comment of elements) {
          at.comments.push(
            ...Option.toArray(readingOf(comment, account.accountId))
          );

          if (
            comment.commentUrn !== undefined &&
            comment.parentComment === undefined &&
            countOf(comment.commentsSummary) > 0
          ) {
            nested.push(comment.commentUrn);
          }
        }

        if (!body.value.whole) {
          return Option.some(at.read(false));
        }

        start += elements.length;

        if (listEnds(paging, start)) {
          return Option.none<Step>();
        }

        // Nothing more came, and LinkedIn did not say the list ended.
        if (elements.length === 0) {
          return Option.some(at.read(false));
        }
      }

      // More pages than a read takes: not all of them.
      return Option.some(at.read(false));
    });

    // Whether the token still reads the page itself: a 404 on a post is
    // its being gone only then, as a missing permission can look the same.
    const readsOwnPage = (account: ChannelAccount, token: Redacted.Redacted) =>
      reader
        .execute(
          get(
            new URL(
              `/rest/organizations/${account.accountId.replace("urn:li:organization:", "")}`,
              api
            ),
            token
          )
        )
        .pipe(
          Effect.map(isSuccess),
          Effect.orElseSucceed(() => false)
        );

    const readOne = Effect.fn("LinkedInEngagement.thread")(function* readOne(
      account: ChannelAccount,
      token: Redacted.Redacted,
      thread: ThreadToRead,
      deadline: DateTime.Utc,
      first: boolean
    ) {
      const at = progress(thread);

      // The day's calls for reads are spent: publishing keeps the rest.
      if (!(yield* spendCall(account))) {
        return at.halt();
      }

      const summary = yield* reader
        .execute(get(actionsOf(thread.platformPostId), token))
        .pipe(Effect.result);

      if (summary._tag === "Failure") {
        return at.failed;
      }

      if (!isSuccess(summary.success)) {
        const step = yield* refusedRead(summary.success, at, first);

        if (Option.isSome(step)) {
          return step.value;
        }

        if (!(yield* spendCall(account))) {
          return at.halt();
        }

        if (!(yield* readsOwnPage(account, token))) {
          return yield* new ChannelUnreadable({ reason: "paused" });
        }

        const missing: Step = {
          _tag: "read",
          reading: { _tag: "missing", threadId: thread.threadId },
        };

        return missing;
      }

      const counted = yield* summaryOf(summary.success).pipe(Effect.option);

      if (Option.isNone(counted)) {
        return at.failed;
      }

      // No summary of comments: none to read, and that is all of them.
      if (countOf(counted.value.commentsSummary) === 0) {
        return at.read(true);
      }

      const nested: string[] = [];

      const top = yield* listInto(
        account,
        token,
        thread.platformPostId,
        at,
        deadline,
        first,
        nested
      );

      if (Option.isSome(top)) {
        return top.value;
      }

      for (const parent of nested) {
        const under = yield* listInto(
          account,
          token,
          parent,
          at,
          deadline,
          first,
          []
        );

        if (Option.isSome(under)) {
          return under.value;
        }
      }

      return at.read(true);
    });

    const readAll = Effect.fn("LinkedInEngagement.readAll")(function* readAll(
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
    ): Effect.Effect<CommentsBatch, CommentsReadFailure> => {
      // A member's profile has no comments Peal may read: its threads end.
      if (!isPage(account)) {
        return Effect.fail(new ChannelUnreadable({ reason: "unsupported" }));
      }

      // A page that did not grant reading its comments is read once it
      // does: nothing is asked of LinkedIn meanwhile.
      if (!account.scopes.includes(linkedinCommentScopes.read)) {
        return Effect.fail(new ChannelUnreadable({ reason: "paused" }));
      }

      return access
        .withToken(account.channelId, ({ accessToken }) =>
          readAll(account, accessToken, threads)
        )
        .pipe(
          Effect.catchTags({
            ChannelUnusable: unusable,
            DatabaseError: databaseDown,
            TokenExpired: needsReconnect,
          })
        );
    };

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
        Effect.fn("LinkedInEngagement.reply")(function* sending(token) {
          const target = topLevelOf(reply);

          const request = call(
            HttpClientRequest.post(actionsOf(target, "comments")).pipe(
              HttpClientRequest.bodyJsonUnsafe({
                actor: account.accountId,
                message: { text: reply.text },
                object: reply.rootPlatformPostId,
                parentComment: target,
              })
            ),
            token
          );

          const sent = yield* http.execute(request).pipe(Effect.result);

          // The request may have reached LinkedIn.
          if (sent._tag === "Failure") {
            return unanswered;
          }

          const response = sent.success;

          if (isSuccess(response)) {
            const body = yield* madeOf(response).pipe(Effect.option);

            // The comment's URN as LinkedIn wrote it, or the bare id its
            // header gives.
            const made = body.pipe(
              Option.flatMap(({ commentUrn }) =>
                Option.fromUndefinedOr(commentUrn)
              ),
              Option.orElse(() => Headers.get(response.headers, "x-restli-id")),
              Option.map((id) => id.trim()),
              Option.filter((id) => id !== "")
            );

            return Option.match(made, {
              onNone: () => unanswered,
              onSome: (platformCommentId): SendOutcome => ({
                _tag: "sent",
                permalink: Option.none(),
                platformCommentId,
              }),
            });
          }

          // LinkedIn failed on the reply itself: it may be there.
          if (response.status >= 500) {
            return unanswered;
          }

          if (response.status === 401 && (yield* isLinkedInError(response))) {
            return yield* new TokenRejected();
          }

          const outcome: SendOutcome = {
            _tag: "failed",
            reason: actFailure(response.status),
          };

          return outcome;
        })
      );

    // The comments under a top-level comment, every page of them; none
    // when one could not be read, or there are more than a resume reads.
    const repliesUnder = Effect.fn("LinkedInEngagement.replies")(
      function* repliesUnder(
        account: ChannelAccount,
        token: Redacted.Redacted,
        parent: string
      ) {
        const listed: ListedReply[] = [];

        for (let page = 0; page < listPages; page += 1) {
          const sent = yield* http
            .execute(
              get(
                actionsOf(parent, "comments"),
                token,
                `start=${String(listed.length)}&count=${String(pageSize)}`
              )
            )
            .pipe(Effect.result);

          if (sent._tag === "Failure") {
            return Option.none<readonly ListedReply[]>();
          }

          // A comment without nested comments may answer 404: none there.
          if (sent.success.status === 404) {
            return (yield* isLinkedInError(sent.success))
              ? Option.some<readonly ListedReply[]>(listed)
              : Option.none<readonly ListedReply[]>();
          }

          if (!isSuccess(sent.success)) {
            return Option.none<readonly ListedReply[]>();
          }

          const body = yield* listedOf(sent.success).pipe(Effect.option);

          if (Option.isNone(body)) {
            return Option.none<readonly ListedReply[]>();
          }

          for (const comment of body.value.elements) {
            listed.push({
              fromAccount: comment.actor === account.accountId,
              id: comment.commentUrn ?? comment.id ?? "",
              text: comment.message?.text ?? "",
              writtenAt: Option.fromUndefinedOr(comment.created?.time).pipe(
                Option.flatMap((time) => DateTime.make(time))
              ),
            });
          }

          if (listEnds(body.value.paging, listed.length)) {
            return Option.some<readonly ListedReply[]>(listed);
          }

          // Nothing more, and no word that the list ended: not proof.
          if (body.value.elements.length === 0) {
            return Option.none<readonly ListedReply[]>();
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

    const withdraw = (
      account: ChannelAccount,
      platformCommentId: string,
      rootPlatformPostId: string
    ): Effect.Effect<ActionOutcome> =>
      asAccount<ActionOutcome>(
        account,
        notDone,
        Effect.fn("LinkedInEngagement.withdraw")(function* withdrawing(token) {
          const url = actionsOf(
            rootPlatformPostId,
            `comments/${encodeURIComponent(commentIdOf(platformCommentId))}`
          );

          const sent = yield* http
            .execute(
              call(
                HttpClientRequest.delete(
                  `${url.href}?actor=${encodedUrn(account.accountId)}`
                ),
                token
              )
            )
            .pipe(Effect.result);

          if (sent._tag === "Failure") {
            return notDone("platformUnavailable");
          }

          const response = sent.success;

          if (isSuccess(response)) {
            return done;
          }

          if (response.status >= 500) {
            return notDone("platformUnavailable");
          }

          if (!(yield* isLinkedInError(response))) {
            return notDone("refused");
          }

          if (response.status === 401) {
            return yield* new TokenRejected();
          }

          // Gone already: what withdrawing asks for.
          return response.status === 404
            ? done
            : notDone(actFailure(response.status));
        })
      );

    const platform: EngagementPlatform = {
      // The pages read give no hide, and a like is not done here.
      moderate: () => Effect.succeed(notDone("refused")),
      read,
      resume,
      send,
      withdraw,
    };

    return platform;
  }
);
