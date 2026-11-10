import { DateTime, Duration, Effect, Option, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
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
import { refusedWith } from "#engagement/infrastructure/platforms/channel-refusals.ts";
import type {
  CommentTarget,
  EngagementPlatform,
  OutgoingReply,
  PlatformHttp,
} from "#engagement/infrastructure/platforms/engagement-platform.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { sessionOf } from "#shared/infrastructure/platforms/bluesky/bluesky-session.ts";
import type { BlueskySession } from "#shared/infrastructure/platforms/bluesky/bluesky-session.ts";
import { dpopSender } from "#shared/infrastructure/platforms/bluesky/dpop.ts";
import { facetsOf } from "#shared/infrastructure/platforms/bluesky/facets.ts";
import { recordKeyOf } from "#shared/infrastructure/platforms/bluesky/record-key.ts";

export interface BlueskyEngagementOptions {
  /** The AppView that serves threads to anyone: Bluesky's public one. */
  readonly appView: URL;
  readonly http: PlatformHttp;
  /** How long a read may keep the channel's gate. */
  readonly deadline?: Duration.Duration;
}

const defaultDeadline = Duration.seconds(30);

const postCollection = "app.bsky.feed.post";
const likeCollection = "app.bsky.feed.like";
const gateCollection = "app.bsky.feed.threadgate";

/**
 * How deep a thread is read. A post of several parts is a chain of the
 * account's own replies, so the comments under its last part sit as deep
 * as it has parts: 25 levels for the longest post (24 parts after the
 * first, which a test keeps equal to the contract's), then replies to
 * replies ten levels down, as under a post of one part. The lexicon takes
 * up to 1000.
 */
export const threadDepth = 35;

// What a thread gate's `hiddenReplies` holds at most (the lexicon's).
const maxHiddenReplies = 300;

const AuthorSchema = Schema.Struct({
  did: Schema.NonEmptyString,
  displayName: Schema.optionalKey(Schema.String),
  handle: Schema.String,
});

// The parts of an app.bsky.feed.defs#postView Peal reads.
const PostViewSchema = Schema.Struct({
  author: AuthorSchema,
  cid: Schema.NonEmptyString,
  indexedAt: Schema.optionalKey(Schema.String),
  record: Schema.Struct({
    createdAt: Schema.optionalKey(Schema.String),
    reply: Schema.optionalKey(
      Schema.Struct({ parent: Schema.Struct({ uri: Schema.String }) })
    ),
    text: Schema.optionalKey(Schema.String),
  }),
  replyCount: Schema.optionalKey(Schema.Number),
  threadgate: Schema.optionalKey(
    Schema.Struct({
      record: Schema.optionalKey(
        Schema.Struct({
          hiddenReplies: Schema.optionalKey(Schema.Array(Schema.String)),
        })
      ),
    })
  ),
  uri: Schema.NonEmptyString,
});

type PostView = typeof PostViewSchema.Type;

// A node of app.bsky.feed.getPostThread: a post with its replies, or a
// post the AppView does not show (not found, or blocked).
interface ThreadNode {
  readonly post?: PostView | undefined;
  readonly replies?: readonly ThreadNode[] | undefined;
}

const ThreadNodeSchema: Schema.Codec<ThreadNode, unknown> = Schema.Struct({
  post: Schema.optionalKey(PostViewSchema),
  replies: Schema.optionalKey(
    Schema.Array(Schema.suspend(() => ThreadNodeSchema))
  ),
});

const threadOf = HttpClientResponse.schemaBodyJson(
  Schema.Struct({ thread: ThreadNodeSchema })
);

const postsOf = HttpClientResponse.schemaBodyJson(
  Schema.Struct({
    posts: Schema.Array(
      Schema.Struct({ cid: Schema.NonEmptyString, uri: Schema.String })
    ),
  })
);

const XrpcErrorSchema = Schema.Struct({
  error: Schema.optionalKey(Schema.String),
});

const errorNameOf = (response: HttpClientResponse.HttpClientResponse) =>
  HttpClientResponse.schemaBodyJson(XrpcErrorSchema)(response).pipe(
    Effect.map(({ error }) => Option.fromUndefinedOr(error)),
    Effect.orElseSucceed(() => Option.none<string>())
  );

const createdOf = HttpClientResponse.schemaBodyJson(
  Schema.Struct({ uri: Schema.NonEmptyString })
);

const storedPostOf = HttpClientResponse.schemaBodyJson(
  Schema.Struct({
    value: Schema.Struct({
      createdAt: Schema.optionalKey(Schema.String),
      text: Schema.optionalKey(Schema.String),
    }),
  })
);

// A thread gate as stored: every field is kept as it is, and only the
// hidden replies change.
const storedGateOf = HttpClientResponse.schemaBodyJson(
  Schema.Struct({
    cid: Schema.optionalKey(Schema.String),
    value: Schema.Record(Schema.String, Schema.Json),
  })
);

const decodeUris = Schema.decodeUnknownOption(Schema.Array(Schema.String));

// What a write to a repository names, besides the repository: the
// collection and the record's key, the record for a put, and the cid the
// stored record must still have.
interface RepositoryWrite {
  readonly collection: string;
  readonly record?: typeof Schema.Json.Type;
  readonly rkey: string;
  readonly swapRecord?: string;
}

// Names a PDS gives a token it will not take any more.
const tokenErrors: ReadonlySet<string> = new Set([
  "ExpiredToken",
  "InvalidToken",
]);

// at://<did>/<collection>/<rkey>
const recordKeyIn = (uri: string): Option.Option<string> =>
  Option.fromUndefinedOr(uri.split("/").at(-1)).pipe(
    Option.filter((key) => key !== "" && uri.startsWith("at://"))
  );

const permalinkOf = (did: string, recordKey: string) =>
  `https://bsky.app/profile/${did}/post/${recordKey}`;

const writtenAtOf = (post: PostView): Option.Option<DateTime.Utc> =>
  Option.fromUndefinedOr(post.record.createdAt).pipe(
    Option.flatMap((at) => DateTime.make(at)),
    Option.orElse(() =>
      Option.fromUndefinedOr(post.indexedAt).pipe(
        Option.flatMap((at) => DateTime.make(at))
      )
    )
  );

interface Walked {
  readonly comments: CommentReading[];
  complete: boolean;
}

// The replies under `node`, depth first: each with the reply it answers,
// none when it answers the post itself. A node whose replies are fewer
// than it counts, or a reply the AppView does not show, leaves the read
// incomplete.
const walk = (
  node: ThreadNode,
  root: string,
  account: string,
  hidden: ReadonlySet<string>,
  into: Walked
): void => {
  const replies = node.replies ?? [];

  if ((node.post?.replyCount ?? 0) !== replies.length) {
    into.complete = false;
  }

  for (const reply of replies) {
    const { post } = reply;
    const writtenAt = post === undefined ? Option.none() : writtenAtOf(post);

    if (post === undefined || Option.isNone(writtenAt)) {
      into.complete = false;
    } else if (into.comments.length >= commentsPerThread) {
      into.complete = false;

      return;
    } else {
      into.comments.push({
        author: {
          displayName: Option.fromUndefinedOr(post.author.displayName).pipe(
            Option.filter((name) => name !== "")
          ),
          handle: post.author.handle,
          platformId: post.author.did,
        },
        fromAccount: post.author.did === account,
        hidden: hidden.has(post.uri),
        liked: Option.none(),
        parentPlatformId: Option.fromUndefinedOr(
          post.record.reply?.parent.uri
        ).pipe(Option.filter((parent) => parent !== root)),
        permalink: recordKeyIn(post.uri).pipe(
          Option.map((key) => permalinkOf(post.author.did, key))
        ),
        platformCommentId: post.uri,
        text: post.record.text ?? "",
        writtenAt: writtenAt.value,
      });

      walk(reply, root, account, hidden, into);
    }
  }
};

const failed = (reason: ReplyFailure): ActionOutcome => ({
  _tag: "failed",
  reason,
});

const done: ActionOutcome = { _tag: "done" };

const recordKeyFor = (reply: OutgoingReply) =>
  recordKeyOf(reply.createdAt, reply.replyId);

const sentAs = (session: BlueskySession, recordKey: string): SendOutcome => ({
  _tag: "sent",
  permalink: Option.some(permalinkOf(session.did, recordKey)),
  platformCommentId: `at://${session.did}/${postCollection}/${recordKey}`,
});

const unanswered: SendOutcome = { _tag: "unconfirmed", reason: "noResponse" };

/**
 * Bluesky's comments, from the AT Protocol's lexicons. A post's replies
 * are read from the public AppView (app.bsky.feed.getPostThread), without
 * the session: they are public. A reply is a post record with a `reply`
 * to the comment and the thread's root, created under a record key every
 * run derives from the reply's id and time, so a reply whose outcome is
 * unknown is read back by that key and created only when absent. A like is
 * a record of its own under a key derived from the comment; hiding a reply
 * writes its URI into the post's thread gate, keeping everything else the
 * gate holds. Each needs its own permission, which `abilitiesOf` checks
 * before any call.
 */
export const blueskyEngagement = Effect.fn("BlueskyEngagement.make")(
  function* blueskyEngagement(options: BlueskyEngagementOptions) {
    const access = yield* ChannelAccess;
    const { appView, http } = options;
    const dpop = yield* dpopSender(http);
    const deadlineAfter = options.deadline ?? defaultDeadline;

    type Step =
      | { readonly _tag: "read"; readonly reading: ThreadReading }
      | { readonly _tag: "halt" };

    const readOne = Effect.fn("BlueskyEngagement.getPostThread")(
      function* readOne(account: ChannelAccount, thread: ThreadToRead) {
        const failedOn: Step = {
          _tag: "read",
          reading: { _tag: "failed", threadId: thread.threadId },
        };

        const sent = yield* http
          .get(new URL("/xrpc/app.bsky.feed.getPostThread", appView), {
            urlParams: {
              depth: String(threadDepth),
              parentHeight: "0",
              uri: thread.platformPostId,
            },
          })
          .pipe(Effect.result);

        if (sent._tag === "Failure") {
          return failedOn;
        }

        const response = sent.success;

        if (response.status === 429) {
          const step: Step = { _tag: "halt" };

          return step;
        }

        // The AppView names a post it does not have: deleted, or taken down.
        if (
          response.status === 400 &&
          Option.contains(yield* errorNameOf(response), "NotFound")
        ) {
          const step: Step = {
            _tag: "read",
            reading: { _tag: "missing", threadId: thread.threadId },
          };

          return step;
        }

        if (response.status !== 200) {
          return failedOn;
        }

        const found = yield* threadOf(response).pipe(Effect.option);

        if (Option.isNone(found)) {
          return failedOn;
        }

        const root = found.value.thread;

        // A root without a post is one the AppView does not show.
        if (root.post === undefined) {
          const step: Step = {
            _tag: "read",
            reading: { _tag: "missing", threadId: thread.threadId },
          };

          return step;
        }

        const walked: Walked = { comments: [], complete: true };

        walk(
          root,
          thread.platformPostId,
          account.accountId,
          new Set(root.post.threadgate?.record?.hiddenReplies),
          walked
        );

        const step: Step = {
          _tag: "read",
          reading: {
            _tag: "read",
            comments: walked.comments,
            complete: walked.complete,
            threadId: thread.threadId,
          },
        };

        return step;
      }
    );

    const read = Effect.fn("BlueskyEngagement.read")(function* read(
      account: ChannelAccount,
      threads: readonly ThreadToRead[]
    ): Effect.fn.Return<CommentsBatch, CommentsReadFailure> {
      const deadline = DateTime.addDuration(yield* DateTime.now, deadlineAfter);
      const readings: ThreadReading[] = [];

      for (const thread of threads) {
        if (DateTime.isGreaterThanOrEqualTo(yield* DateTime.now, deadline)) {
          return { halted: true, readings };
        }

        const step = yield* readOne(account, thread);

        if (step._tag === "halt") {
          return { halted: true, readings };
        }

        readings.push(step.reading);
      }

      return { halted: false, readings };
    });

    // A call as the account, whose failures to get a session each mean
    // nothing was sent.
    const asAccount = <A>(
      account: ChannelAccount,
      onRefused: (reason: ReplyFailure) => A,
      use: (session: BlueskySession) => Effect.Effect<A, TokenRejected>
    ): Effect.Effect<A> =>
      access
        .withToken(account.channelId, ({ accessToken }) =>
          sessionOf(accessToken).pipe(Effect.flatMap(use))
        )
        .pipe(Effect.catch(refusedWith(onRefused)));

    // What an XRPC answer that is not a success means for a write: a
    // refused token before anything happened, a rate limit, or a refusal
    // of what was sent.
    const refusalOn = Effect.fn("BlueskyEngagement.refusal")(
      function* refusalOn(response: HttpClientResponse.HttpClientResponse) {
        const { status } = response;

        if (status === 401 || status === 403) {
          return yield* new TokenRejected();
        }

        if (status === 429) {
          return "rateLimited" as const;
        }

        if (status >= 500) {
          return "platformUnavailable" as const;
        }

        return Option.exists(yield* errorNameOf(response), (name) =>
          tokenErrors.has(name)
        )
          ? yield* new TokenRejected()
          : ("refused" as const);
      }
    );

    // The cids of posts, from the AppView: a reply and a like name their
    // subject by URI and cid.
    const cidsOf = Effect.fn("BlueskyEngagement.cids")(function* cidsOf(
      uris: readonly string[]
    ) {
      const url = new URL("/xrpc/app.bsky.feed.getPosts", appView);

      for (const uri of new Set(uris)) {
        url.searchParams.append("uris", uri);
      }

      const sent = yield* http.get(url).pipe(Effect.result);

      if (sent._tag === "Failure" || sent.success.status !== 200) {
        return Option.none<ReadonlyMap<string, string>>();
      }

      return (yield* postsOf(sent.success).pipe(Effect.option)).pipe(
        Option.map(
          ({ posts }) => new Map(posts.map(({ cid, uri }) => [uri, cid]))
        )
      );
    });

    const create = Effect.fn("BlueskyEngagement.reply")(function* create(
      session: BlueskySession,
      reply: OutgoingReply
    ) {
      // Reads, safe to repeat: nothing is out yet.
      const cids = yield* cidsOf([
        reply.rootPlatformPostId,
        reply.parentPlatformId,
      ]);

      if (Option.isNone(cids)) {
        const outcome: SendOutcome = {
          _tag: "failed",
          reason: "platformUnavailable",
        };

        return outcome;
      }

      const root = cids.value.get(reply.rootPlatformPostId);
      const parent = cids.value.get(reply.parentPlatformId);

      if (root === undefined || parent === undefined) {
        const outcome: SendOutcome = { _tag: "failed", reason: "commentGone" };

        return outcome;
      }

      const facets = facetsOf(reply.text);

      const threaded = {
        $type: postCollection,
        createdAt: DateTime.formatIso(reply.createdAt),
        reply: {
          parent: { cid: parent, uri: reply.parentPlatformId },
          root: { cid: root, uri: reply.rootPlatformPostId },
        },
        text: reply.text,
      };

      const recordKey = recordKeyFor(reply);

      const sent = yield* dpop
        .send(
          session,
          HttpClientRequest.post(
            new URL("/xrpc/com.atproto.repo.createRecord", session.pds)
          ).pipe(
            HttpClientRequest.bodyJsonUnsafe({
              collection: postCollection,
              record: facets.length === 0 ? threaded : { ...threaded, facets },
              repo: session.did,
              rkey: recordKey,
            })
          )
        )
        .pipe(Effect.result);

      if (sent._tag === "Failure") {
        // Refused for its token before the PDS did anything; otherwise
        // the request may have reached it.
        return sent.failure._tag === "TokenRejected"
          ? yield* sent.failure
          : unanswered;
      }

      const response = sent.success;

      if (response.status === 200) {
        return yield* createdOf(response).pipe(
          Effect.as(sentAs(session, recordKey)),
          Effect.orElseSucceed(() => unanswered)
        );
      }

      if (response.status >= 500) {
        return unanswered;
      }

      const reason = yield* refusalOn(response);
      const outcome: SendOutcome = { _tag: "failed", reason };

      return outcome;
    });

    // Reads the reply's record back from the PDS, by its key.
    const lookUp = Effect.fn("BlueskyEngagement.lookUp")(function* lookUp(
      session: BlueskySession,
      reply: OutgoingReply
    ) {
      const recordKey = recordKeyFor(reply);

      const sent = yield* http
        .get(new URL("/xrpc/com.atproto.repo.getRecord", session.pds), {
          urlParams: {
            collection: postCollection,
            repo: session.did,
            rkey: recordKey,
          },
        })
        .pipe(Effect.result);

      if (sent._tag === "Failure") {
        return "unknown" as const;
      }

      const response = sent.success;

      if (response.status === 200) {
        const stored = yield* storedPostOf(response).pipe(Effect.option);

        return Option.exists(
          stored,
          ({ value }) =>
            value.text === reply.text &&
            value.createdAt === DateTime.formatIso(reply.createdAt)
        )
          ? ("found" as const)
          : ("unknown" as const);
      }

      return response.status === 400 &&
        Option.contains(yield* errorNameOf(response), "RecordNotFound")
        ? ("absent" as const)
        : ("unknown" as const);
    });

    const send = (
      account: ChannelAccount,
      reply: OutgoingReply
    ): Effect.Effect<SendOutcome> =>
      asAccount<SendOutcome>(
        account,
        (reason) => ({ _tag: "failed", reason }),
        (session) => create(session, reply)
      );

    const resume = (
      account: ChannelAccount,
      reply: OutgoingReply
    ): Effect.Effect<SendOutcome> =>
      asAccount<SendOutcome>(
        account,
        // No session: the reply cannot be looked up, and may be out.
        () => ({ _tag: "unconfirmed", reason: "interrupted" }),
        Effect.fn("BlueskyEngagement.resume")(function* resuming(session) {
          const found = yield* lookUp(session, reply);

          if (found === "found") {
            return sentAs(session, recordKeyFor(reply));
          }

          if (found === "absent") {
            return yield* create(session, reply);
          }

          const outcome: SendOutcome = {
            _tag: "unconfirmed",
            reason: "interrupted",
          };

          return outcome;
        })
      );

    // A write to the account's repository that sets a state.
    const write = Effect.fn("BlueskyEngagement.write")(function* write(
      session: BlueskySession,
      method: "deleteRecord" | "putRecord",
      body: RepositoryWrite
    ) {
      const sent = yield* dpop
        .send(
          session,
          HttpClientRequest.post(
            new URL(`/xrpc/com.atproto.repo.${method}`, session.pds)
          ).pipe(
            HttpClientRequest.bodyJsonUnsafe({ ...body, repo: session.did })
          )
        )
        .pipe(Effect.result);

      if (sent._tag === "Failure") {
        if (sent.failure._tag === "TokenRejected") {
          return yield* sent.failure;
        }

        return failed("platformUnavailable");
      }

      return sent.success.status === 200
        ? done
        : failed(yield* refusalOn(sent.success));
    });

    const like = Effect.fn("BlueskyEngagement.like")(function* like(
      session: BlueskySession,
      target: CommentTarget
    ) {
      // A key the comment gives: liking twice writes one record, and
      // taking the like back deletes that one.
      const rkey = recordKeyOf(target.receivedAt, target.platformCommentId);

      if (target.action === "unlike") {
        return yield* write(session, "deleteRecord", {
          collection: likeCollection,
          rkey,
        });
      }

      const cid = (yield* cidsOf([target.platformCommentId])).pipe(
        Option.map((cids) => cids.get(target.platformCommentId))
      );

      if (Option.isNone(cid)) {
        return failed("platformUnavailable");
      }

      if (cid.value === undefined) {
        return failed("commentGone");
      }

      return yield* write(session, "putRecord", {
        collection: likeCollection,
        record: {
          $type: likeCollection,
          createdAt: DateTime.formatIso(yield* DateTime.now),
          subject: { cid: cid.value, uri: target.platformCommentId },
        },
        rkey,
      });
    });

    // Hides a reply, or shows it again, in the thread gate of the post it
    // is under: the gate's record has the post's own key. A post without
    // a gate gets one that hides the reply and limits nothing (no `allow`
    // rule means anyone may reply); an existing gate keeps its rules, and
    // is written only if it has not changed since it was read.
    const hide = Effect.fn("BlueskyEngagement.hide")(function* hide(
      session: BlueskySession,
      target: CommentTarget
    ) {
      const rkey = recordKeyIn(target.rootPlatformPostId);

      if (Option.isNone(rkey)) {
        return failed("refused");
      }

      const gate = yield* http
        .get(new URL("/xrpc/com.atproto.repo.getRecord", session.pds), {
          urlParams: {
            collection: gateCollection,
            repo: session.did,
            rkey: rkey.value,
          },
        })
        .pipe(Effect.result);

      if (gate._tag === "Failure") {
        return failed("platformUnavailable");
      }

      const absent =
        gate.success.status === 400 &&
        Option.contains(yield* errorNameOf(gate.success), "RecordNotFound");

      if (gate.success.status !== 200 && !absent) {
        return failed("platformUnavailable");
      }

      const stored = absent
        ? Option.none()
        : yield* storedGateOf(gate.success).pipe(Effect.option);

      if (!absent && Option.isNone(stored)) {
        return failed("platformUnavailable");
      }

      const kept = stored.pipe(
        Option.flatMap(({ value }) => decodeUris(value["hiddenReplies"])),
        Option.getOrElse((): readonly string[] => [])
      );

      const hiding = target.action === "hide";

      // Already as asked.
      if (kept.includes(target.platformCommentId) === hiding) {
        return done;
      }

      if (hiding && kept.length >= maxHiddenReplies) {
        return failed("refused");
      }

      const createdAt = DateTime.formatIso(yield* DateTime.now);

      const hiddenReplies = hiding
        ? [...kept, target.platformCommentId]
        : kept.filter((uri) => uri !== target.platformCommentId);

      return yield* write(session, "putRecord", {
        collection: gateCollection,
        record: Option.match(stored, {
          onNone: () => ({
            $type: gateCollection,
            createdAt,
            hiddenReplies,
            post: target.rootPlatformPostId,
          }),
          onSome: ({ value }) => ({ ...value, hiddenReplies }),
        }),
        rkey: rkey.value,
        ...Option.match(
          stored.pipe(Option.flatMap(({ cid }) => Option.fromUndefinedOr(cid))),
          {
            onNone: () => ({}),
            onSome: (cid) => ({ swapRecord: cid }),
          }
        ),
      });
    });

    const moderate = (
      account: ChannelAccount,
      target: CommentTarget
    ): Effect.Effect<ActionOutcome> => {
      // Nobody deletes another account's record.
      if (target.action === "delete") {
        return Effect.succeed(failed("refused"));
      }

      return asAccount<ActionOutcome>(account, failed, (session) =>
        target.action === "like" || target.action === "unlike"
          ? like(session, target)
          : hide(session, target)
      );
    };

    const withdraw = (
      account: ChannelAccount,
      platformCommentId: string
    ): Effect.Effect<ActionOutcome> =>
      Option.match(recordKeyIn(platformCommentId), {
        onNone: () => Effect.succeed(failed("refused")),
        // Deleting a record already gone succeeds.
        onSome: (rkey) =>
          asAccount<ActionOutcome>(account, failed, (session) =>
            write(session, "deleteRecord", { collection: postCollection, rkey })
          ),
      });

    const platform: EngagementPlatform = {
      moderate,
      read,
      resume,
      send,
      withdraw,
    };

    return platform;
  }
);
