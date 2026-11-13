import { DateTime, Duration, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { Headers, HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import type { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { commentPublished } from "#publishing/infrastructure/platforms/first-comment.ts";
import type {
  CommentCalls,
  ListedComment,
} from "#publishing/infrastructure/platforms/first-comment.ts";
import { commitUnanswered } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PlatformPostId } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import {
  encodedUrn,
  isLinkedInError,
  isOrganization,
} from "#shared/infrastructure/platforms/linkedin-rest.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";

import { postRefusal } from "./linkedin-refusal.ts";
import type { LinkedInRefusal } from "./linkedin-refusal.ts";

// A first comment under a LinkedIn page's post, as the page, from the
// Comments API (learn.microsoft.com/en-us/linkedin/marketing/
// community-management/shares/comments-api, version 2026-10, read
// 2026-11-14): `POST /rest/socialActions/{postUrn}/comments` with the
// page as `actor`, the post as `object` and `message.text`; the comment's
// URN comes back in the body (`commentUrn`) or its id in `x-restli-id`.
// `GET` on the same path lists the post's comments, by `start` and
// `count`, each with its `actor`, `message.text` and `created.time`.
// LinkedIn documents no idempotency key: a lost answer is looked for among
// them. A member's profile takes no comment (`followUpsThrough`).

/** The HTTP client the adapter sends through: the public one. */
type LinkedInHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

const MadeSchema = Schema.Struct({
  commentUrn: Schema.optionalKey(Schema.String),
});

const CommentsSchema = Schema.Struct({
  elements: Schema.Array(
    Schema.Struct({
      actor: Schema.optionalKey(Schema.String),
      commentUrn: Schema.optionalKey(Schema.String),
      created: Schema.optionalKey(
        Schema.Struct({ time: Schema.optionalKey(Schema.Number) })
      ),
      id: Schema.optionalKey(Schema.String),
      message: Schema.optionalKey(
        Schema.Struct({ text: Schema.optionalKey(Schema.String) })
      ),
    })
  ),
  paging: Schema.optionalKey(
    Schema.Struct({ total: Schema.optionalKey(Schema.Number) })
  ),
});

// The most comments one look reads: a first comment was written minutes
// ago, under a post Peal just published.
const commentsPerLook = 100;

// A list that could not be read whole, which settles nothing.
const unreadable = new BadRequest({ code: "unreadable" });

const isSuccess = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

// LinkedIn's short-term limit on creating comments: the Comments API
// lists a 429 "creation rate limit exceeded for member", a one-minute
// limit; a minute is waited when it names no wait.
const commentThrottle = Duration.minutes(1);

/**
 * What LinkedIn refusing a comment means. Only a 401 in LinkedIn's own
 * words is a refused token, as in the inbox's adapter: the post went live
 * with the same token, and a 403 here is about the page role or the body
 * (the Comments API's tables: a content administrator posts, and is not
 * listed among the roles that comment), never a channel to reconnect. A
 * 401 without LinkedIn's words is a proxy on the way. The rest is read as
 * a post's refusal.
 */
const commentRefusal = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, LinkedInRefusal> => {
  if (response.status === 401) {
    return isLinkedInError(response).pipe(
      Effect.flatMap((own) =>
        Effect.fail(own ? new TokenRejected() : new PlatformUnavailable())
      )
    );
  }

  if (response.status === 403) {
    return Effect.fail(new BadRequest({ code: "permissionDenied" }));
  }

  if (response.status === 429) {
    return DateTime.now.pipe(
      Effect.flatMap((now) =>
        Effect.fail(
          new RateLimited({
            retryAfter: retryAfterOf(response.headers, now).pipe(
              Option.getOrElse(() => commentThrottle)
            ),
          })
        )
      )
    );
  }

  return postRefusal(response);
};

const profileRefused = new BadRequest({
  code: ownRefusalCodes.partsNotSupported,
});

// The comment's URN, as LinkedIn writes it (`urn:li:comment:(<post>,<id>)`),
// also when its answer gives only the bare id in `x-restli-id`: one shape
// for every comment Peal keeps.
const madeOf = (
  response: HttpClientResponse.HttpClientResponse,
  root: PlatformPostId
) =>
  HttpClientResponse.schemaBodyJson(MadeSchema)(response).pipe(
    Effect.map(({ commentUrn }) => Option.fromUndefinedOr(commentUrn)),
    Effect.orElseSucceed(() => Option.none<string>()),
    Effect.flatMap((urn) =>
      urn.pipe(
        Option.map((given) => given.trim()),
        Option.filter((given) => given !== ""),
        Option.orElse(() =>
          Headers.get(response.headers, "x-restli-id").pipe(
            Option.map((id) => id.trim()),
            Option.filter((id) => id !== ""),
            Option.map((id) =>
              id.startsWith("urn:") ? id : `urn:li:comment:(${root},${id})`
            )
          )
        ),
        Option.match({
          onNone: () =>
            Effect.fail(new OutcomeUnknown({ reason: "unreadableResponse" })),
          onSome: (id) => Effect.succeed(commentPublished(id)),
        })
      )
    )
  );

/** A first comment under a LinkedIn page's post, as the page. */
export const linkedinCommentCalls = (options: {
  readonly api: LinkedInHttp;
  readonly apiUrl: URL;
  readonly credentials: PlatformCredentials["Service"];
  readonly rest: (
    request: HttpClientRequest.HttpClientRequest,
    token: Redacted.Redacted
  ) => HttpClientRequest.HttpClientRequest;
}): CommentCalls => {
  const { api, apiUrl, credentials, rest } = options;

  const commentsOf = (root: PlatformPostId) =>
    new URL(`/rest/socialActions/${encodedUrn(root)}/comments`, apiUrl);

  const comment = (post: OutgoingPost, root: PlatformPostId) =>
    isOrganization(post.accountId)
      ? credentials.withToken(post.channelId, ({ accessToken }) =>
          api
            .execute(
              rest(
                HttpClientRequest.post(commentsOf(root)).pipe(
                  HttpClientRequest.bodyJsonUnsafe({
                    actor: post.accountId,
                    message: { text: post.text },
                    object: root,
                  })
                ),
                accessToken
              )
            )
            .pipe(
              Effect.flatMap((response) =>
                isSuccess(response)
                  ? madeOf(response, root)
                  : commentRefusal(response)
              ),
              Effect.catchTags({
                HttpClientError: commitUnanswered,
                OutboundRequestRefused: commitUnanswered,
              })
            )
        )
      : Effect.fail(profileRefused);

  const list = (post: OutgoingPost, root: PlatformPostId) =>
    credentials
      .withToken(post.channelId, ({ accessToken }) =>
        api
          .execute(
            rest(
              HttpClientRequest.get(
                `${commentsOf(root).href}?start=0&count=${String(commentsPerLook)}`
              ),
              accessToken
            )
          )
          .pipe(
            Effect.filterOrFail(isSuccess, () => unreadable),
            Effect.flatMap(HttpClientResponse.schemaBodyJson(CommentsSchema)),
            Effect.mapError(() => unreadable)
          )
      )
      .pipe(
        Effect.map(({ elements, paging }) => {
          const listed: readonly ListedComment[] = elements.map((element) => ({
            fromAccount: element.actor === post.accountId,
            id: element.commentUrn ?? element.id ?? "",
            text: element.message?.text ?? "",
            writtenAt: Option.fromUndefinedOr(element.created?.time).pipe(
              Option.flatMap((time) => DateTime.make(time))
            ),
          }));

          // Whole when LinkedIn's total is met, or the page came short.
          const whole =
            paging?.total === undefined
              ? listed.length < commentsPerLook
              : paging.total <= listed.length;

          return whole ? Option.some(listed) : Option.none();
        }),
        Effect.orElseSucceed(() => Option.none<readonly ListedComment[]>())
      );

  return { comment, list, platform: "linkedin" };
};
