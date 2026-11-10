import { Duration, Effect, Option, Schema } from "effect";
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
  PublicationSteps,
  Readiness,
  StepTiming,
} from "#publishing/application/publication-steps.ts";
import type { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import {
  commitUnanswered,
  unanswered,
} from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { Published } from "#shared/domain/publish-result.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";
import {
  formBoundary,
  multipartBody,
} from "#shared/infrastructure/platforms/multipart-stream.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { streamedBody } from "#shared/infrastructure/platforms/public-http.ts";

import { mediaRefusal, statusRefusal } from "./mastodon-refusal.ts";

// Reading an answer's body fails with these.
type AnswerError = HttpClientError.HttpClientError | Schema.SchemaError;

/** The HTTP client the adapter sends through: the public one. */
export type MastodonHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

export interface MastodonClientOptions {
  /** For API calls. */
  readonly api: MastodonHttp;
  /**
   * How an account's server is reached from its host: `https:`, or `http:`
   * for tests against a local fake (the outbound guard refuses it
   * otherwise).
   */
  readonly scheme: "http:" | "https:";
  readonly timing?: StepTiming;
  /** For media uploads, which take longer. */
  readonly uploads: MastodonHttp;
}

// Mastodon keeps an Idempotency-Key for an hour; resending with it is
// trusted for a little less, so the key cannot lapse during the resend.
const idempotencyWindow = Duration.minutes(50);

// How often to ask whether a video or a large image is processed.
const processingPoll = Duration.seconds(3);

// The channels context names a Mastodon account `<id>@<host>`.
const accountPattern = /^[^@\s]+@(?<host>[^@\s/]+)$/u;

const MediaAttachmentSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  url: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

const StatusSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  uri: Schema.String,
  url: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

// What the instance accepts, from /api/v2/instance; every field optional,
// as servers differ.
const InstanceSchema = Schema.Struct({
  configuration: Schema.Struct({
    media_attachments: Schema.Struct({
      image_size_limit: Schema.optionalKey(Schema.Number),
      supported_mime_types: Schema.optionalKey(Schema.Array(Schema.String)),
      video_size_limit: Schema.optionalKey(Schema.Number),
    }),
  }),
});

type MediaLimits =
  (typeof InstanceSchema.Type)["configuration"]["media_attachments"];

/** The media of a post on the instance: every id, and those processing. */
interface MastodonMedia {
  readonly mediaIds: readonly string[];
  readonly pending: readonly string[];
}

const readinessOf = (media: MastodonMedia): Readiness<MastodonMedia> =>
  media.pending.length === 0
    ? { _tag: "ready", prepared: media }
    : { _tag: "processing", pollAfter: processingPoll, prepared: media };

// Refused before upload when the instance says it would refuse it.
const checkLimits = (
  limits: Option.Option<MediaLimits>,
  media: PublishableMedia
): Effect.Effect<void, MediaRejected> => {
  if (Option.isNone(limits)) {
    return Effect.void;
  }

  const {
    image_size_limit: imageLimit,
    supported_mime_types: types,
    video_size_limit: videoLimit,
  } = limits.value;

  if (types !== undefined && !types.includes(media.contentType)) {
    return Effect.fail(new MediaRejected({ code: "unsupportedType" }));
  }

  const limit = media.kind === "image" ? imageLimit : videoLimit;

  return limit !== undefined && media.byteSize > limit
    ? Effect.fail(new MediaRejected({ code: "tooLarge" }))
    : Effect.void;
};

/**
 * Publishes on a Mastodon instance: uploads each image or video with
 * POST /api/v2/media, waits for those the instance processes (202, then
 * GET /api/v1/media/:id until 200), and posts with POST /api/v1/statuses
 * under the attempt's Idempotency-Key. An unknown outcome is confirmed by
 * sending the post again with that key, which the instance answers with the
 * post it made, if it did, within the hour.
 */
export const mastodonClient = Effect.fn("MastodonClient.make")(
  function* mastodonClient(options: MastodonClientOptions) {
    const credentials = yield* PlatformCredentials;
    const media = yield* MediaForPublishing;
    const { api, scheme, uploads } = options;

    const instanceOf = (post: OutgoingPost) => {
      const host = accountPattern.exec(post.accountId)?.groups?.["host"];

      return host === undefined
        ? Effect.fail(new BadRequest({ code: "unknownInstance" }))
        : Effect.succeed(new URL(`${scheme}//${host}`));
    };

    // Sends a request with the channel's token, renewed once if refused.
    // `answer` reads what came back.
    const sent =
      (
        post: OutgoingPost,
        client: MastodonHttp,
        request: (
          token: Redacted.Redacted
        ) => HttpClientRequest.HttpClientRequest
      ) =>
      <A, E>(
        answer: (
          response: HttpClientResponse.HttpClientResponse
        ) => Effect.Effect<A, E>
      ) =>
        credentials.withToken(post.channelId, ({ accessToken }) =>
          client.execute(request(accessToken)).pipe(Effect.flatMap(answer))
        );

    // An upload, or a look at one: without an answer, nothing that matters
    // happened.
    const mediaCall = <A>(
      post: OutgoingPost,
      client: MastodonHttp,
      request: (
        token: Redacted.Redacted
      ) => HttpClientRequest.HttpClientRequest,
      answer: (
        response: HttpClientResponse.HttpClientResponse
      ) => Effect.Effect<A, AnswerError | PublishFailure | TokenRejected>
    ) =>
      sent(
        post,
        client,
        request
      )((response) =>
        answer(response).pipe(
          Effect.catchTags({
            HttpClientError: unanswered,
            SchemaError: unanswered,
          })
        )
      ).pipe(
        Effect.catchTags({
          HttpClientError: unanswered,
          OutboundRequestRefused: unanswered,
        })
      );

    // The post itself: without an answer, it may be live.
    const statusCall = (
      post: OutgoingPost,
      request: (
        token: Redacted.Redacted
      ) => HttpClientRequest.HttpClientRequest,
      answer: (
        response: HttpClientResponse.HttpClientResponse
      ) => Effect.Effect<
        Published,
        AnswerError | OutcomeUnknown | PublishFailure | TokenRejected
      >
    ) =>
      sent(
        post,
        api,
        request
      )((response) =>
        answer(response).pipe(
          Effect.catchTags({
            HttpClientError: commitUnanswered,
            SchemaError: commitUnanswered,
          })
        )
      ).pipe(
        Effect.catchTags({
          HttpClientError: commitUnanswered,
          OutboundRequestRefused: commitUnanswered,
        })
      );

    // The instance's media limits, when it says; none if it does not
    // answer, and the upload then finds out.
    const limitsOf = (instance: URL) =>
      api.get(new URL("/api/v2/instance", instance)).pipe(
        Effect.flatMap((response) =>
          response.status === 200
            ? HttpClientResponse.schemaBodyJson(InstanceSchema)(response).pipe(
                Effect.map(({ configuration }) =>
                  Option.some(configuration.media_attachments)
                )
              )
            : Effect.succeed(Option.none<MediaLimits>())
        ),
        Effect.orElseSucceed(() => Option.none<MediaLimits>())
      );

    const upload = Effect.fn("MastodonClient.upload")(function* upload(
      post: OutgoingPost,
      instance: URL,
      limits: Option.Option<MediaLimits>,
      attachment: MediaAttachment
    ) {
      const described = yield* media.describe(
        post.workspaceId,
        attachment.mediaId
      );

      yield* checkLimits(limits, described);

      // The file's turn among the large uploads is waited for before the
      // request opens: an instance, or a proxy before it, times out a
      // request whose body does not come.
      return yield* Effect.scoped(
        Effect.gen(function* sendingFile() {
          const bytes = yield* media.held(post.workspaceId, attachment.mediaId);

          // The form is streamed: the file's bytes pass from the store to the
          // instance as they are read, never held whole.
          const form = multipartBody({
            boundary: formBoundary(post.idempotencyKey),
            fields:
              attachment.altText.trim() === ""
                ? []
                : [{ name: "description", value: attachment.altText }],
            file: {
              byteSize: described.byteSize,
              bytes,
              contentType: described.contentType,
              fileName: described.fileName,
              name: "file",
            },
          });

          return yield* mediaCall(
            post,
            uploads,
            (token) =>
              HttpClientRequest.post(new URL("/api/v2/media", instance)).pipe(
                HttpClientRequest.bearerToken(token),
                streamedBody(form.bytes, form)
              ),
            (response) =>
              response.status === 200 || response.status === 202
                ? HttpClientResponse.schemaBodyJson(MediaAttachmentSchema)(
                    response
                  ).pipe(
                    Effect.map(({ id }) => ({
                      id,
                      processing: response.status === 202,
                    }))
                  )
                : mediaRefusal(response)
          );
        })
      );
    });

    const prepare = Effect.fn("MastodonClient.prepare")(function* prepare(
      post: OutgoingPost
    ) {
      const instance = yield* instanceOf(post);

      if (post.media.length === 0) {
        return readinessOf({ mediaIds: [], pending: [] });
      }

      const limits = yield* limitsOf(instance);

      // One at a time, in the post's order.
      const uploaded = yield* Effect.forEach(
        post.media,
        (attachment) => upload(post, instance, limits, attachment),
        { concurrency: 1 }
      );

      return readinessOf({
        mediaIds: uploaded.map(({ id }) => id),
        pending: uploaded.flatMap(({ id, processing }) =>
          processing ? [id] : []
        ),
      });
    });

    // 206 while the instance processes the file, 200 once it is done.
    const isProcessing = (post: OutgoingPost, instance: URL, mediaId: string) =>
      mediaCall(
        post,
        api,
        (token) =>
          HttpClientRequest.get(
            new URL(`/api/v1/media/${encodeURIComponent(mediaId)}`, instance)
          ).pipe(HttpClientRequest.bearerToken(token)),
        (response) => {
          if (response.status === 206) {
            return Effect.succeed(true);
          }

          if (response.status === 200) {
            return Effect.succeed(false);
          }

          // The instance could not process the file.
          return response.status === 422
            ? Effect.fail(new MediaRejected({ code: "processingFailed" }))
            : mediaRefusal(response);
        }
      );

    const poll = Effect.fn("MastodonClient.poll")(function* poll(
      post: OutgoingPost,
      prepared: MastodonMedia
    ) {
      const instance = yield* instanceOf(post);

      const pending = yield* Effect.forEach(
        prepared.pending,
        (mediaId) =>
          isProcessing(post, instance, mediaId).pipe(
            Effect.map((processing) => (processing ? [mediaId] : []))
          ),
        { concurrency: 1 }
      );

      return readinessOf({ ...prepared, pending: pending.flat() });
    });

    const commit = Effect.fn("MastodonClient.commit")(function* commit(
      post: OutgoingPost,
      prepared: MastodonMedia
    ) {
      const instance = yield* instanceOf(post);

      return yield* statusCall(
        post,
        (token) =>
          HttpClientRequest.post(new URL("/api/v1/statuses", instance)).pipe(
            HttpClientRequest.bearerToken(token),
            HttpClientRequest.setHeader("Idempotency-Key", post.idempotencyKey),
            // A part after the first replies to the part before it, which
            // makes the thread; the key keeps a resent reply a single one.
            HttpClientRequest.bodyJsonUnsafe(
              Option.match(post.replyTo, {
                onNone: () => ({
                  media_ids: prepared.mediaIds,
                  status: post.text,
                }),
                onSome: ({ parent }) => ({
                  in_reply_to_id: parent,
                  media_ids: prepared.mediaIds,
                  status: post.text,
                }),
              })
            )
          ),
        (response) =>
          response.status === 200
            ? HttpClientResponse.schemaBodyJson(StatusSchema)(response).pipe(
                Effect.map(({ id, uri, url }): Published => ({
                  _tag: "published",
                  permalink: url ?? uri,
                  platformPostId: PlatformPostIdSchema.make(id),
                }))
              )
            : statusRefusal(response)
      );
    });

    const steps: PublicationSteps<MastodonMedia> = {
      commit,
      confirmation: { _tag: "resend", window: idempotencyWindow },
      platform: "mastodon",
      poll,
      prepare,
    };

    return sequenced(steps, options.timing ?? defaultStepTiming);
  }
);
