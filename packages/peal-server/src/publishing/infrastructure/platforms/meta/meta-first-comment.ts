import { DateTime, Duration, Effect, Option, Schema } from "effect";
import type { HttpClientRequest } from "effect/http";

import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import type { PublishingAccount } from "#publishing/application/platform-credentials.ts";
import { commentPublished } from "#publishing/infrastructure/platforms/first-comment.ts";
import type {
  CommentCalls,
  ListedComment,
} from "#publishing/infrastructure/platforms/first-comment.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import type { PlatformPostId } from "#shared/domain/publish-result.ts";

import { formPost, graphRefusal, query } from "./graph-calls.ts";
import type { GraphAuth, graphCalls, MetaHttp } from "./graph-calls.ts";

// A first comment on Facebook Pages and Instagram, with the call the inbox
// answers a comment with (read 2026-11-14):
//
// - Facebook Pages (developers.facebook.com/docs/graph-api/reference/
//   object/comments/): `POST /{object-id}/comments` with `message`, which
//   answers the comment's `id`, with a Page token and
//   `pages_manage_engagement`; `GET /{object-id}/comments` lists them,
//   `filter=toplevel` and `order=reverse_chronological` newest first.
// - Instagram (…/instagram-graph-api/reference/ig-media/comments): `POST
//   /{ig-media-id}/comments` with `message`, which answers its `id`;
//   `GET /{ig-media-id}/comments` "returns only top-level comments", newest
//   first, at most 50 a query; `instagram_manage_comments` through a Page,
//   `instagram_business_manage_comments` through Instagram Login, each on
//   its own host.
//
// Neither takes an idempotency key: a lost answer is looked for among the
// newest comments, which hold every one since the attempt began unless a
// next page is newer than that.

const CommentMadeSchema = Schema.Struct({ id: Schema.String });

const PagingSchema = Schema.optionalKey(
  Schema.Struct({ next: Schema.optionalKey(Schema.String) })
);

const FacebookCommentsSchema = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      created_time: Schema.optionalKey(Schema.String),
      from: Schema.optionalKey(Schema.Struct({ id: Schema.String })),
      id: Schema.String,
      message: Schema.optionalKey(Schema.String),
    })
  ),
  paging: PagingSchema,
});

const InstagramCommentsSchema = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      from: Schema.optionalKey(Schema.Struct({ id: Schema.String })),
      id: Schema.String,
      text: Schema.optionalKey(Schema.String),
      timestamp: Schema.optionalKey(Schema.String),
      // Given only when the app's user wrote the comment: an id, or the
      // user's node.
      user: Schema.optionalKey(
        Schema.Union([Schema.String, Schema.Struct({ id: Schema.String })])
      ),
    })
  ),
  paging: PagingSchema,
});

const isText = Schema.is(Schema.String);

// How many comments one look reads: Instagram's most.
const commentsPerLook = "50";

const clockSkew = Duration.minutes(1);

const instantOf = (written: string | undefined) =>
  Option.fromUndefinedOr(written).pipe(
    Option.flatMap((text) => DateTime.make(text))
  );

// Whether the comments read hold every one the attempt may have made:
// there is no page after them, or the oldest was written before it began.
const completeSince = (
  post: OutgoingPost,
  listed: readonly ListedComment[],
  hasNext: boolean
): Option.Option<readonly ListedComment[]> => {
  if (!hasNext) {
    return Option.some(listed);
  }

  const since = DateTime.subtractDuration(post.startedAt, clockSkew);
  const oldest = listed.at(-1);

  return oldest !== undefined &&
    Option.exists(oldest.writtenAt, (at) => DateTime.isLessThan(at, since))
    ? Option.some(listed)
    : Option.none();
};

type GraphCalls = Effect.Success<ReturnType<typeof graphCalls>>;

interface MetaCommentOptions {
  readonly api: MetaHttp;
  readonly calls: GraphCalls;
  /** A node's edge on the host the account is reached through. */
  readonly node: (
    on: PublishingAccount,
    id: PlatformPostId,
    edge: string
  ) => URL;
}

/**
 * What Meta refusing a comment means: as a post's (`graphRefusal`), but a
 * permission the token lacks (code 10, 200 to 299), or a role the person
 * lost, refuses this comment alone, as does a 401 or 403 without Meta's
 * error code, which proves nothing of the token. The post is live with the same token,
 * so the channel is never marked to reconnect for it: the part fails as
 * `permissionDenied`, which a member reads.
 */
const commentRefusal: typeof graphRefusal = (call, refusal) =>
  refusal._tag === "token" && (refusal.permission || !refusal.coded)
    ? new BadRequest({ code: "permissionDenied" })
    : graphRefusal(call, refusal);

const commentOf =
  ({ api, calls, node }: MetaCommentOptions) =>
  (post: OutgoingPost, root: PlatformPostId) =>
    calls.commit(
      post,
      api,
      (auth: GraphAuth, on): HttpClientRequest.HttpClientRequest =>
        formPost(node(on, root, "comments"), { ...auth, message: post.text }),
      CommentMadeSchema,
      ({ id }) => Effect.succeed(commentPublished(id)),
      ({ id }) => commentPublished(id),
      commentRefusal
    );

/** A first comment under a Facebook Page's post, as the Page. */
export const facebookCommentCalls = (
  options: MetaCommentOptions
): CommentCalls => ({
  comment: commentOf(options),
  list: (post, root) =>
    options.calls
      .step(
        post,
        options.api,
        "read",
        (auth, on) =>
          query(options.node(on, root, "comments"), {
            ...auth,
            fields: "id,from{id},message,created_time",
            filter: "toplevel",
            limit: commentsPerLook,
            order: "reverse_chronological",
          }),
        FacebookCommentsSchema
      )
      .pipe(
        Effect.map(({ data, paging }) =>
          completeSince(
            post,
            data.map((comment) => ({
              fromAccount: comment.from?.id === post.accountId,
              id: comment.id,
              text: comment.message ?? "",
              writtenAt: instantOf(comment.created_time),
            })),
            paging?.next !== undefined
          )
        ),
        Effect.orElseSucceed(() => Option.none())
      ),
  platform: "facebook",
});

/** A first comment under an Instagram post, as the account. */
export const instagramCommentCalls = (
  options: MetaCommentOptions
): CommentCalls => ({
  comment: commentOf(options),
  list: (post, root) =>
    options.calls
      .step(
        post,
        options.api,
        "read",
        (auth, on) =>
          query(options.node(on, root, "comments"), {
            ...auth,
            fields: "id,text,timestamp,from{id},user",
            limit: commentsPerLook,
          }),
        InstagramCommentsSchema
      )
      .pipe(
        Effect.map(({ data, paging }) =>
          completeSince(
            post,
            data.map((comment) => {
              const { user: named } = comment;

              const user =
                named === undefined || isText(named) ? named : named.id;

              return {
                fromAccount:
                  comment.from?.id === post.accountId ||
                  user === post.accountId,
                id: comment.id,
                text: comment.text ?? "",
                writtenAt: instantOf(comment.timestamp),
              };
            }),
            paging?.next !== undefined
          )
        ),
        Effect.orElseSucceed(() => Option.none())
      ),
  platform: "instagram",
});
