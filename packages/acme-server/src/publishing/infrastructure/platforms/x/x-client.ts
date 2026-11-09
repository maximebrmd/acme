import {
  DateTime,
  Duration,
  Effect,
  Option,
  Schedule,
  Schema,
  Stream,
} from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { MediaForPublishing } from "#publishing/application/media-for-publishing.ts";
import type { PublishableMedia } from "#publishing/application/media-for-publishing.ts";
import type { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import {
  defaultStepTiming,
  sequenced,
} from "#publishing/application/publication-steps.ts";
import type {
  LookUp,
  PublicationSteps,
  Readiness,
  StepTiming,
} from "#publishing/application/publication-steps.ts";
import type { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { inParts } from "#publishing/infrastructure/platforms/byte-parts.ts";
import {
  codeOf,
  commitUnanswered,
  unanswered,
} from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { Published } from "#shared/domain/publish-result.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

import { isSameText } from "./x-post-match.ts";
import { mediaRefusal, postRefusal } from "./x-refusal.ts";
import type { XRefusal } from "./x-refusal.ts";

/** The HTTP client the adapter sends through: the public one. */
export type XHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

export interface XClientOptions {
  /** For API calls. */
  readonly api: XHttp;
  /** The API's origin: `https://api.x.com`, or a fake's in tests. */
  readonly apiUrl: URL;
  readonly timing?: StepTiming;
  /** For media uploads, which take longer. */
  readonly uploads: XHttp;
}

// Reading an answer's body fails with these.
type AnswerError = HttpClientError.HttpClientError | Schema.SchemaError;

// X advises appending at most 5 MB at a time: parts of 4 MiB stay under it.
const partSize = 4 * 1024 * 1024;

// The wait X suggests before looking at a video again, when it does not.
const defaultPoll = Duration.seconds(5);

// An appended part that failed for now is sent again a couple of times
// under its own index, which X takes once, before the upload starts over.
const partRetry = { schedule: Schedule.exponential("500 millis"), times: 2 };

// How far before the attempt the confirmation searches, for clocks that
// disagree a little.
const clockSkew = Duration.minutes(2);

// The account's recent posts a confirmation reads: one page, the newest.
const recentPosts = 20;

// What X calls each kind of file: images up to 5 MB, GIFs up to 15 MB,
// videos as the account may post them.
const categoryOf = (media: PublishableMedia) => {
  if (media.kind === "video") {
    return Option.some("tweet_video");
  }

  if (media.contentType === "image/gif") {
    return Option.some("tweet_gif");
  }

  return ["image/jpeg", "image/png", "image/webp"].includes(media.contentType)
    ? Option.some("tweet_image")
    : Option.none<string>();
};

const UploadSchema = Schema.Struct({
  data: Schema.Struct({
    id: Schema.NonEmptyString,
    media_key: Schema.optionalKey(Schema.String),
  }),
});

const ProcessingSchema = Schema.Struct({
  check_after_secs: Schema.optionalKey(Schema.Number),
  error: Schema.optionalKey(
    Schema.Struct({ name: Schema.optionalKey(Schema.String) })
  ),
  state: Schema.String,
});

type Processing = typeof ProcessingSchema.Type;

const FinalizedSchema = Schema.Struct({
  data: Schema.Struct({
    id: Schema.NonEmptyString,
    processing_info: Schema.optionalKey(ProcessingSchema),
  }),
});

const CreatedSchema = Schema.Struct({
  data: Schema.Struct({ id: Schema.NonEmptyString }),
});

const RecentPostsSchema = Schema.Struct({
  data: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        attachments: Schema.optionalKey(
          Schema.Struct({
            media_keys: Schema.optionalKey(Schema.Array(Schema.String)),
          })
        ),
        id: Schema.NonEmptyString,
        text: Schema.String,
      })
    )
  ),
});

/** A file X processes, and how long it asked to wait before looking. */
interface Pending {
  readonly mediaId: string;
  readonly wait: Duration.Duration;
}

/** The media of a post on X: every id, and those still processing. */
interface XMedia {
  readonly mediaIds: readonly string[];
  readonly pending: readonly Pending[];
}

/** What POST /2/tweets takes of a post. */
interface NewPost {
  media?: { readonly media_ids: readonly string[] };
  text?: string;
}

const isSuccess = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

const okOr =
  <A, I>(schema: Schema.Codec<A, I>) =>
  (
    response: HttpClientResponse.HttpClientResponse
  ): Effect.Effect<A, AnswerError | PublishFailure | TokenRejected> =>
    isSuccess(response)
      ? HttpClientResponse.schemaBodyJson(schema)(response)
      : mediaRefusal(response);

const acknowledged = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<void, PublishFailure | TokenRejected> =>
  isSuccess(response) ? Effect.void : mediaRefusal(response);

const readinessOf = (media: XMedia): Readiness<XMedia> => {
  if (media.pending.length === 0) {
    return { _tag: "ready", prepared: media };
  }

  // The longest wait X asked for, a second at least.
  let pollAfter = Duration.seconds(1);

  for (const { wait } of media.pending) {
    pollAfter = Duration.max(pollAfter, wait);
  }

  return { _tag: "processing", pollAfter, prepared: media };
};

// Where a file stands once X says how its processing goes: none when it is
// done, a wait when it is not, a refusal when it failed.
const pendingOf = (
  mediaId: string,
  processing: Option.Option<Processing>
): Effect.Effect<Option.Option<Pending>, MediaRejected> => {
  if (Option.isNone(processing) || processing.value.state === "succeeded") {
    return Effect.succeed(Option.none());
  }

  const { check_after_secs: after, error, state } = processing.value;

  if (state === "failed") {
    return Effect.fail(
      new MediaRejected({
        code: codeOf(Option.fromUndefinedOr(error?.name), "processingFailed"),
      })
    );
  }

  return Effect.succeed(
    Option.some({
      mediaId,
      wait:
        after === undefined || after <= 0
          ? defaultPoll
          : Duration.seconds(after),
    })
  );
};

// X takes times in RFC 3339 without fractions of a second.
const rfc3339 = (instant: DateTime.Utc) =>
  DateTime.formatIso(instant).replace(/\.\d+Z$/u, "Z");

const publishedAs = (id: string): Published => ({
  _tag: "published",
  permalink: `https://x.com/i/status/${encodeURIComponent(id)}`,
  platformPostId: PlatformPostIdSchema.make(id),
});

/**
 * Publishes on X with API v2: each image, GIF or video goes up in parts
 * through POST /2/media/upload/initialize, /append and /finalize, with its
 * alt text set through /2/media/metadata; a video X processes is polled
 * (GET /2/media/upload, command STATUS) as long as X asks; then POST
 * /2/tweets makes the post.
 *
 * X has no idempotency key. A post whose answer was lost is looked for among
 * the account's recent posts since the attempt started, by its text and its
 * number of files: found, it is published; not found proves nothing, as X
 * may not list it yet, so it is never sent again and ends unconfirmed.
 */
export const xClient = Effect.fn("XClient.make")(function* xClient(
  options: XClientOptions
) {
  const credentials = yield* PlatformCredentials;
  const media = yield* MediaForPublishing;
  const { api, apiUrl, uploads } = options;

  // Sends a request with the channel's token, renewed once if refused.
  // Without an answer, nothing anyone sees happened.
  const mediaCall = <A>(
    post: OutgoingPost,
    client: XHttp,
    request: (token: Redacted.Redacted) => HttpClientRequest.HttpClientRequest,
    answer: (
      response: HttpClientResponse.HttpClientResponse
    ) => Effect.Effect<A, AnswerError | PublishFailure | TokenRejected>
  ) =>
    credentials.withToken(post.channelId, ({ accessToken }) =>
      client.execute(request(accessToken)).pipe(
        Effect.flatMap((response) =>
          answer(response).pipe(
            Effect.catchTags({
              HttpClientError: unanswered,
              SchemaError: unanswered,
            })
          )
        ),
        Effect.catchTags({
          HttpClientError: unanswered,
          OutboundRequestRefused: unanswered,
        })
      )
    );

  const mediaUrl = (path: string) => new URL(`/2/media/upload${path}`, apiUrl);

  const append =
    (post: OutgoingPost, mediaId: string) =>
    (bytes: Uint8Array, index: number) => {
      const form = new FormData();

      form.append("segment_index", String(index));
      form.append("media", new Blob([bytes]), "media");

      return mediaCall(
        post,
        uploads,
        (token) =>
          HttpClientRequest.post(
            mediaUrl(`/${encodeURIComponent(mediaId)}/append`)
          ).pipe(
            HttpClientRequest.bearerToken(token),
            HttpClientRequest.bodyFormData(form)
          ),
        acknowledged
      ).pipe(
        Effect.retry({
          ...partRetry,
          while: (failure) => failure._tag === "PlatformUnavailable",
        })
      );
    };

  const describeAlt = (post: OutgoingPost, mediaId: string, altText: string) =>
    altText.trim() === ""
      ? Effect.void
      : mediaCall(
          post,
          api,
          (token) =>
            HttpClientRequest.post(new URL("/2/media/metadata", apiUrl)).pipe(
              HttpClientRequest.bearerToken(token),
              HttpClientRequest.bodyJsonUnsafe({
                id: mediaId,
                metadata: { alt_text: { text: altText } },
              })
            ),
          acknowledged
        );

  const upload = Effect.fn("XClient.upload")(function* upload(
    post: OutgoingPost,
    attachment: MediaAttachment,
    described: PublishableMedia
  ) {
    const category = categoryOf(described);

    if (Option.isNone(category)) {
      return yield* new MediaRejected({ code: "unsupportedType" });
    }

    const { data: initialized } = yield* mediaCall(
      post,
      api,
      (token) =>
        HttpClientRequest.post(mediaUrl("/initialize")).pipe(
          HttpClientRequest.bearerToken(token),
          HttpClientRequest.bodyJsonUnsafe({
            media_category: category.value,
            media_type: described.contentType,
            total_bytes: described.byteSize,
          })
        ),
      okOr(UploadSchema)
    );

    const mediaId = initialized.id;

    yield* media.open(post.workspaceId, attachment.mediaId).pipe(
      inParts(() => Math.min(partSize, described.byteSize)),
      Stream.mapEffect(append(post, mediaId)),
      Stream.runDrain
    );

    const { data: finalized } = yield* mediaCall(
      post,
      api,
      (token) =>
        HttpClientRequest.post(
          mediaUrl(`/${encodeURIComponent(mediaId)}/finalize`)
        ).pipe(HttpClientRequest.bearerToken(token)),
      okOr(FinalizedSchema)
    );

    // X describes images and GIFs; a video's alt text it may not take,
    // which is no reason to hold the post back.
    yield* described.kind === "video"
      ? describeAlt(post, mediaId, attachment.altText).pipe(
          Effect.catchTag("MediaRejected", ({ code }) =>
            Effect.logWarning("X did not take a video's alt text").pipe(
              Effect.annotateLogs({ channelId: post.channelId, code })
            )
          )
        )
      : describeAlt(post, mediaId, attachment.altText);

    return {
      mediaId,
      pending: yield* pendingOf(
        mediaId,
        Option.fromUndefinedOr(finalized.processing_info)
      ),
    };
  });

  const prepare = Effect.fn("XClient.prepare")(function* prepare(
    post: OutgoingPost
  ) {
    if (post.media.length === 0) {
      return readinessOf({ mediaIds: [], pending: [] });
    }

    const described = yield* Effect.forEach(
      post.media,
      (attachment) =>
        media
          .describe(post.workspaceId, attachment.mediaId)
          .pipe(Effect.map((found) => ({ attachment, described: found }))),
      { concurrency: 1 }
    );

    // A post shows up to four images, or one GIF, or one video.
    const alone = described.some(
      (item) =>
        item.described.kind === "video" ||
        item.described.contentType === "image/gif"
    );

    if (alone && described.length > 1) {
      return yield* new MediaRejected({ code: "mixedMedia" });
    }

    const uploaded = yield* Effect.forEach(
      described,
      (item) => upload(post, item.attachment, item.described),
      { concurrency: 1 }
    );

    return readinessOf({
      mediaIds: uploaded.map(({ mediaId }) => mediaId),
      pending: uploaded.flatMap(({ pending }) => Option.toArray(pending)),
    });
  });

  const statusOf = (post: OutgoingPost, mediaId: string) =>
    mediaCall(
      post,
      api,
      (token) =>
        HttpClientRequest.get(mediaUrl("")).pipe(
          HttpClientRequest.setUrlParams({
            command: "STATUS",
            media_id: mediaId,
          }),
          HttpClientRequest.bearerToken(token)
        ),
      okOr(FinalizedSchema)
    ).pipe(
      Effect.flatMap(({ data }) =>
        pendingOf(mediaId, Option.fromUndefinedOr(data.processing_info))
      )
    );

  const poll = Effect.fn("XClient.poll")(function* poll(
    post: OutgoingPost,
    prepared: XMedia
  ) {
    const pending = yield* Effect.forEach(
      prepared.pending,
      ({ mediaId }) => statusOf(post, mediaId),
      { concurrency: 1 }
    );

    return readinessOf({
      ...prepared,
      pending: pending.flatMap((still) => Option.toArray(still)),
    });
  });

  const commit = Effect.fn("XClient.commit")(function* commit(
    post: OutgoingPost,
    prepared: XMedia
  ) {
    // A post may be its files alone: then it has no text field at all.
    const body: NewPost = {};

    if (post.text.trim() !== "") {
      body.text = post.text;
    }

    if (prepared.mediaIds.length > 0) {
      body.media = { media_ids: prepared.mediaIds };
    }

    return yield* credentials.withToken(post.channelId, ({ accessToken }) =>
      api
        .execute(
          HttpClientRequest.post(new URL("/2/tweets", apiUrl)).pipe(
            HttpClientRequest.bearerToken(accessToken),
            HttpClientRequest.bodyJsonUnsafe(body)
          )
        )
        .pipe(
          Effect.flatMap(
            (
              response
            ): Effect.Effect<
              Published,
              AnswerError | OutcomeUnknown | XRefusal
            > =>
              isSuccess(response)
                ? HttpClientResponse.schemaBodyJson(CreatedSchema)(
                    response
                  ).pipe(Effect.map(({ data }) => publishedAs(data.id)))
                : postRefusal(response)
          ),
          Effect.catchTags({
            HttpClientError: commitUnanswered,
            OutboundRequestRefused: commitUnanswered,
            SchemaError: commitUnanswered,
          })
        )
    );
  });

  // Looks for the attempt's post among the account's recent ones: the same
  // text, as X shows it, with as many files. Not finding it settles
  // nothing.
  const lookUp = (post: OutgoingPost): Effect.Effect<LookUp, PublishFailure> =>
    mediaCall(
      post,
      api,
      (token) =>
        HttpClientRequest.get(
          new URL(
            `/2/users/${encodeURIComponent(post.accountId)}/tweets`,
            apiUrl
          )
        ).pipe(
          HttpClientRequest.setUrlParams({
            exclude: "replies,retweets",
            max_results: recentPosts,
            start_time: rfc3339(
              DateTime.subtractDuration(post.startedAt, clockSkew)
            ),
            "tweet.fields": "attachments",
          }),
          HttpClientRequest.bearerToken(token)
        ),
      okOr(RecentPostsSchema)
    ).pipe(
      Effect.map(({ data = [] }): LookUp => {
        const found = data.find(
          ({ attachments, text }) =>
            isSameText(post.text, text) &&
            (attachments?.media_keys?.length ?? 0) === post.media.length
        );

        return found === undefined
          ? { _tag: "unknown" }
          : { _tag: "found", published: publishedAs(found.id) };
      }),
      Effect.orElseSucceed((): LookUp => ({ _tag: "unknown" }))
    );

  const steps: PublicationSteps<XMedia> = {
    commit,
    confirmation: { _tag: "lookUp", lookUp },
    platform: "x",
    poll,
    prepare,
  };

  return sequenced(steps, options.timing ?? defaultStepTiming);
});
