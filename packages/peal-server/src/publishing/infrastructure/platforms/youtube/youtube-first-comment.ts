import { DateTime, Duration, Effect, Option, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import type { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import { commentPublished } from "#publishing/infrastructure/platforms/first-comment.ts";
import type {
  CommentCalls,
  ListedComment,
} from "#publishing/infrastructure/platforms/first-comment.ts";
import { commitUnanswered } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import type {
  PlatformPostId,
  Published,
} from "#shared/domain/publish-result.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

import { refusalOf } from "./youtube-refusal.ts";
import type { Refused, YouTubeRefusal } from "./youtube-refusal.ts";

// A first comment under a YouTube video, as the channel, from the YouTube
// Data API (read 2026-11-14): `commentThreads.insert`
// (developers.google.com/youtube/v3/docs/commentThreads/insert), `part=
// snippet` with `snippet.channelId`, `snippet.videoId` and
// `snippet.topLevelComment.snippet.textOriginal`, scope `youtube.force-
// ssl`, 50 units of the project's quota; `commentThreads.list` by
// `videoId`, `order=time`, 100 a page, each with its author's channel
// (`authorChannelId.value`), its original text and `publishedAt`. YouTube
// takes no idempotency key: a lost answer is looked for among the newest
// threads.

type YouTubeHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

const MadeSchema = Schema.Struct({ id: Schema.String });

const ThreadsSchema = Schema.Struct({
  items: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        snippet: Schema.Struct({
          topLevelComment: Schema.Struct({
            snippet: Schema.Struct({
              authorChannelId: Schema.optionalKey(
                Schema.Struct({ value: Schema.String })
              ),
              publishedAt: Schema.optionalKey(Schema.String),
              textDisplay: Schema.optionalKey(Schema.String),
              textOriginal: Schema.optionalKey(Schema.String),
            }),
          }),
        }),
      })
    )
  ),
  nextPageToken: Schema.optionalKey(Schema.String),
});

// A list that could not be read whole, which settles nothing.
const unreadable = new BadRequest({ code: "unreadable" });

const isSuccess = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

const clockSkew = Duration.minutes(1);

/** A first comment under a YouTube video, as its channel. */
export const youtubeCommentCalls = (options: {
  readonly api: YouTubeHttp;
  readonly apiUrl: URL;
  readonly credentials: PlatformCredentials["Service"];
  /** YouTube's refusal, after counting the day's quota spent when it says so. */
  readonly refused: (refusal: Refused) => Effect.Effect<never, YouTubeRefusal>;
}): CommentCalls => {
  const { api, apiUrl, credentials } = options;

  const threads = new URL("/youtube/v3/commentThreads", apiUrl);

  const comment = (post: OutgoingPost, root: PlatformPostId) =>
    credentials.withToken(post.channelId, ({ accessToken }) =>
      api
        .execute(
          HttpClientRequest.post(threads).pipe(
            HttpClientRequest.setUrlParams({ part: "snippet" }),
            HttpClientRequest.bearerToken(accessToken),
            HttpClientRequest.bodyJsonUnsafe({
              snippet: {
                channelId: post.accountId,
                topLevelComment: { snippet: { textOriginal: post.text } },
                videoId: root,
              },
            })
          )
        )
        .pipe(
          Effect.flatMap(
            (
              response
            ): Effect.Effect<Published, OutcomeUnknown | YouTubeRefusal> => {
              if (isSuccess(response)) {
                return HttpClientResponse.schemaBodyJson(MadeSchema)(
                  response
                ).pipe(
                  Effect.map(({ id }) => commentPublished(id)),
                  Effect.mapError(
                    () => new OutcomeUnknown({ reason: "unreadableResponse" })
                  )
                );
              }

              // YouTube failed on the comment itself: it may be there.
              if (response.status >= 500) {
                return Effect.fail(
                  new OutcomeUnknown({ reason: "noResponse" })
                );
              }

              return refusalOf(response).pipe(Effect.flatMap(options.refused));
            }
          ),
          Effect.catchTags({
            HttpClientError: commitUnanswered,
            OutboundRequestRefused: commitUnanswered,
          })
        )
    );

  const list = (post: OutgoingPost, root: PlatformPostId) =>
    credentials
      .withToken(post.channelId, ({ accessToken }) =>
        api
          .execute(
            HttpClientRequest.get(threads).pipe(
              HttpClientRequest.setUrlParams({
                maxResults: "100",
                order: "time",
                part: "snippet",
                textFormat: "plainText",
                videoId: root,
              }),
              HttpClientRequest.bearerToken(accessToken)
            )
          )
          .pipe(
            Effect.filterOrFail(isSuccess, () => unreadable),
            Effect.flatMap(HttpClientResponse.schemaBodyJson(ThreadsSchema)),
            Effect.mapError(() => unreadable)
          )
      )
      .pipe(
        Effect.map(({ items, nextPageToken }) => {
          const listed: readonly ListedComment[] = (items ?? []).map(
            ({ id, snippet }) => {
              const said = snippet.topLevelComment.snippet;

              return {
                fromAccount: said.authorChannelId?.value === post.accountId,
                id,
                // The original, which YouTube gives the channel for its own.
                text: said.textOriginal ?? said.textDisplay ?? "",
                writtenAt: Option.fromUndefinedOr(said.publishedAt).pipe(
                  Option.flatMap((at) => DateTime.make(at))
                ),
              };
            }
          );

          // Newest first: whole when no page follows, or when the oldest
          // read was written before the attempt began.
          const since = DateTime.subtractDuration(post.startedAt, clockSkew);
          const oldest = listed.at(-1);

          const whole =
            nextPageToken === undefined ||
            (oldest !== undefined &&
              Option.exists(oldest.writtenAt, (at) =>
                DateTime.isLessThan(at, since)
              ));

          return whole ? Option.some(listed) : Option.none();
        }),
        Effect.orElseSucceed(() => Option.none<readonly ListedComment[]>())
      );

  return { comment, list, platform: "youtube" };
};
