import { DateTime, Duration, Effect, Option, Schema } from "effect";
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
import { PinterestOptions } from "#publishing/domain/pinterest-options.ts";
import {
  commitUnanswered,
  unanswered,
} from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
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

import { isSamePin } from "./pinterest-pin-match.ts";
import { refused } from "./pinterest-refusal.ts";
import type { PinterestRefusal } from "./pinterest-refusal.ts";

/** The HTTP client the adapter sends through: the public one. */
export type PinterestHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

export interface PinterestClientOptions {
  /** For API calls. */
  readonly api: PinterestHttp;
  /** The API's origin: `https://api.pinterest.com`, or its Sandbox's. */
  readonly apiUrl: URL;
  readonly timing?: StepTiming;
  /** For a video's upload, which takes longer. */
  readonly uploads: PinterestHttp;
}

// Reading an answer's body fails with these.
type AnswerError = HttpClientError.HttpClientError | Schema.SchemaError;

// Pinterest fetches a Pin's images itself, while it makes the Pin.
const mediaUrlLifetime = Duration.hours(2);

// Pinterest's guide: processing normally takes a few seconds.
const pollAfter = Duration.seconds(5);

// How far before the attempt the confirmation looks, for clocks that
// disagree a little.
const clockSkew = Duration.minutes(2);

// The board's Pins a confirmation reads: a few pages, as Pinterest does
// not say in which order it lists them.
const pinsPerPage = 100;

const confirmationPages = 3;

// The images a Pin takes: JPEG and PNG, as Pinterest's product specs say.
const imageTypes: ReadonlySet<string> = new Set(["image/jpeg", "image/png"]);

// The videos it takes: MP4 and QuickTime (.mov).
const videoTypes: ReadonlySet<string> = new Set([
  "video/mp4",
  "video/quicktime",
]);

// The most images a Pin shows: a carousel's five.
const maxImages = 5;

// media/create's answer: where to POST the file, and the form fields to
// send with it.
const RegisteredSchema = Schema.Struct({
  media_id: Schema.NonEmptyString,
  upload_parameters: Schema.Record(Schema.String, Schema.String),
  upload_url: Schema.NonEmptyString,
});

// media/get's answer: registered, processing, succeeded or failed.
const MediaStatusSchema = Schema.Struct({ status: Schema.String });

const CreatedSchema = Schema.Struct({ id: Schema.NonEmptyString });

// A Pin, as the lists of a board's Pins show it.
const ListedPinSchema = Schema.Struct({
  created_at: Schema.optionalKey(Schema.NullOr(Schema.String)),
  description: Schema.optionalKey(Schema.NullOr(Schema.String)),
  id: Schema.NonEmptyString,
  link: Schema.optionalKey(Schema.NullOr(Schema.String)),
  media: Schema.optionalKey(
    Schema.NullOr(
      Schema.Struct({ media_type: Schema.optionalKey(Schema.String) })
    )
  ),
  title: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

const PinsSchema = Schema.Struct({
  bookmark: Schema.optionalKey(Schema.NullOr(Schema.String)),
  items: Schema.Array(ListedPinSchema),
});

/** A Pin's video on Pinterest: none for a Pin of images. */
interface PinterestMedia {
  readonly videoId: Option.Option<string>;
}

/** What pins/create takes of a Pin's media. */
type MediaSource =
  | { readonly source_type: "image_url"; readonly url: string }
  | {
      readonly items: readonly { readonly url: string }[];
      readonly source_type: "multiple_image_urls";
    }
  | {
      readonly cover_image_key_frame_time: number;
      readonly media_id: string;
      readonly source_type: "video_id";
    };

/** What pins/create takes of a Pin. */
interface NewPin {
  alt_text?: string;
  readonly board_id: string;
  board_section_id?: string;
  description?: string;
  dominant_color?: string;
  link?: string;
  readonly media_source: MediaSource;
  title?: string;
}

const isSuccess = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

const okOr =
  <A, I>(schema: Schema.Codec<A, I>, about: "media" | "pin") =>
  (
    response: HttpClientResponse.HttpClientResponse
  ): Effect.Effect<A, AnswerError | PinterestRefusal> =>
    isSuccess(response)
      ? HttpClientResponse.schemaBodyJson(schema)(response)
      : refused(response, about);

const publishedAs = (id: string): Published => ({
  _tag: "published",
  permalink: `https://www.pinterest.com/pin/${encodeURIComponent(id)}/`,
  platformPostId: PlatformPostIdSchema.make(id),
});

const optionsOf = (post: OutgoingPost) =>
  post.options.pipe(Option.filter(Schema.is(PinterestOptions)));

// The board the Pin goes to. Scheduling refuses a post without one.
const boardOf = (post: OutgoingPost) =>
  optionsOf(post).pipe(
    Option.flatMap(({ boardId }) => Option.fromUndefinedOr(boardId)),
    Option.match({
      onNone: () => Effect.fail(new BadRequest({ code: "boardMissing" })),
      onSome: Effect.succeed,
    })
  );

// What a Pin's media must be: one video alone, or up to five images, in
// the formats Pinterest takes.
const checked = (
  described: readonly PublishableMedia[]
): Effect.Effect<readonly PublishableMedia[], MediaRejected> => {
  if (described.length === 0) {
    return Effect.fail(new MediaRejected({ code: "mediaRequired" }));
  }

  const videos = described.filter(({ kind }) => kind === "video");

  if (
    (videos.length > 0 && described.length > 1) ||
    described.length > maxImages
  ) {
    return Effect.fail(new MediaRejected({ code: "mixedMedia" }));
  }

  return described.every(({ contentType, kind }) =>
    (kind === "video" ? videoTypes : imageTypes).has(contentType)
  )
    ? Effect.succeed(described)
    : Effect.fail(new MediaRejected({ code: "unsupportedType" }));
};

const mediaTypeOf = (post: OutgoingPost, hasVideo: boolean) => {
  if (hasVideo) {
    return "video";
  }

  return post.media.length > 1 ? "multiple_images" : "image";
};

/**
 * Publishes on Pinterest with API v5, as Pins. An image Pin is one request:
 * POST /v5/pins with the address Pinterest fetches the image from, or 2 to
 * 5 of them for a carousel. A video is registered first (POST /v5/media),
 * sent to the address the answer gives with its form fields, as one
 * request that declares its length, then polled (GET /v5/media/{id}) until
 * Pinterest has processed it; its cover is the frame at the second the
 * options name. The Pin's description is the post's text, its alt text the
 * first file's.
 *
 * Pinterest has no idempotency key. A Pin whose answer was lost is looked
 * for among the Pins of its board, or of its section, made since the
 * attempt started, by its title, description, link and kind of media:
 * found, it is published; not found proves nothing, as Pinterest may not
 * list it yet, so it is never sent again and ends unconfirmed.
 */
export const pinterestClient = Effect.fn("PinterestClient.make")(
  function* pinterestClient(options: PinterestClientOptions) {
    const credentials = yield* PlatformCredentials;
    const media = yield* MediaForPublishing;
    const { api, apiUrl, uploads } = options;

    // Sends a request with the channel's token, renewed once if refused.
    // Without an answer, nothing anyone sees happened.
    const call = <A>(
      post: OutgoingPost,
      request: (
        token: Redacted.Redacted
      ) => HttpClientRequest.HttpClientRequest,
      answer: (
        response: HttpClientResponse.HttpClientResponse
      ) => Effect.Effect<A, AnswerError | PublishFailure | TokenRejected>
    ) =>
      credentials.withToken(post.channelId, ({ accessToken }) =>
        api.execute(request(accessToken)).pipe(
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

    const described = (post: OutgoingPost) =>
      Effect.forEach(
        post.media,
        ({ mediaId }) => media.describe(post.workspaceId, mediaId),
        { concurrency: 1 }
      ).pipe(Effect.flatMap(checked));

    // Registers the video, then sends its bytes where Pinterest said, with
    // the form fields it gave: the address is an object store's, which
    // takes no token and answers 204.
    const upload = Effect.fn("PinterestClient.upload")(function* upload(
      post: OutgoingPost,
      video: PublishableMedia
    ) {
      const registered = yield* call(
        post,
        (token) =>
          HttpClientRequest.post(new URL("/v5/media", apiUrl)).pipe(
            HttpClientRequest.bearerToken(token),
            HttpClientRequest.bodyJsonUnsafe({ media_type: "video" })
          ),
        okOr(RegisteredSchema, "media")
      );

      const destination = URL.parse(registered.upload_url);

      if (destination === null) {
        return yield* new PlatformUnavailable();
      }

      // The file's turn among the large uploads is waited for before the
      // request opens, as the store times out a request whose body does not
      // come. The form is streamed, the fields first, in Pinterest's order,
      // then the file: its bytes pass from the media store to Pinterest's
      // as they are read, never held whole, with the length the store
      // needs (`streamedBody`).
      const status = yield* Effect.scoped(
        Effect.gen(function* sendingFile() {
          const bytes = yield* media.held(post.workspaceId, video.mediaId);

          const form = multipartBody({
            boundary: formBoundary(post.idempotencyKey),
            fields: Object.entries(registered.upload_parameters).map(
              ([name, value]) => ({ name, value })
            ),
            file: {
              byteSize: video.byteSize,
              bytes,
              contentType: video.contentType,
              fileName: video.fileName,
              name: "file",
            },
          });

          const response = yield* uploads.execute(
            HttpClientRequest.post(destination).pipe(
              streamedBody(form.bytes, {
                contentLength: form.contentLength,
                contentType: form.contentType,
              })
            )
          );

          return response.status;
        })
      ).pipe(
        Effect.catchTags({
          HttpClientError: () => Effect.fail(new PlatformUnavailable()),
          OutboundRequestRefused: unanswered,
        })
      );

      if (status >= 500 || status === 429) {
        return yield* new PlatformUnavailable();
      }

      // The store refused the form or the file: nothing a retry changes.
      if (status < 200 || status >= 300) {
        return yield* new MediaRejected({ code: `upload${status}` });
      }

      return registered.media_id;
    });

    const prepare = Effect.fn("PinterestClient.prepare")(function* prepare(
      post: OutgoingPost
    ) {
      yield* boardOf(post);

      const files = yield* described(post);
      const video = files.find(({ kind }) => kind === "video");

      if (video === undefined) {
        const ready: Readiness<PinterestMedia> = {
          _tag: "ready",
          prepared: { videoId: Option.none() },
        };

        return ready;
      }

      const processing: Readiness<PinterestMedia> = {
        _tag: "processing",
        pollAfter,
        prepared: { videoId: Option.some(yield* upload(post, video)) },
      };

      return processing;
    });

    const poll = Effect.fn("PinterestClient.poll")(function* poll(
      post: OutgoingPost,
      prepared: PinterestMedia
    ) {
      const ready: Readiness<PinterestMedia> = { _tag: "ready", prepared };

      if (Option.isNone(prepared.videoId)) {
        return ready;
      }

      const videoId = prepared.videoId.value;

      const { status } = yield* call(
        post,
        (token) =>
          HttpClientRequest.get(
            new URL(`/v5/media/${encodeURIComponent(videoId)}`, apiUrl)
          ).pipe(HttpClientRequest.bearerToken(token)),
        okOr(MediaStatusSchema, "media")
      );

      if (status === "succeeded") {
        return ready;
      }

      if (status === "failed") {
        return yield* new MediaRejected({ code: "processingFailed" });
      }

      const processing: Readiness<PinterestMedia> = {
        _tag: "processing",
        pollAfter,
        prepared,
      };

      return processing;
    });

    const sourceOf = Effect.fn("PinterestClient.source")(function* sourceOf(
      post: OutgoingPost,
      prepared: PinterestMedia
    ) {
      if (Option.isSome(prepared.videoId)) {
        const video: MediaSource = {
          cover_image_key_frame_time: optionsOf(post).pipe(
            Option.flatMap(({ coverSecond }) =>
              Option.fromUndefinedOr(coverSecond)
            ),
            Option.getOrElse(() => 0)
          ),
          media_id: prepared.videoId.value,
          source_type: "video_id",
        };

        return video;
      }

      const urls = yield* Effect.forEach(
        post.media,
        ({ mediaId }) =>
          media.publicUrl(post.workspaceId, mediaId, mediaUrlLifetime),
        { concurrency: 1 }
      );

      const [first] = urls;

      if (first === undefined) {
        return yield* new MediaRejected({ code: "mediaRequired" });
      }

      const images: MediaSource =
        urls.length === 1
          ? { source_type: "image_url", url: first }
          : {
              items: urls.map((url) => ({ url })),
              source_type: "multiple_image_urls",
            };

      return images;
    });

    const pinOf = Effect.fn("PinterestClient.pin")(function* pinOf(
      post: OutgoingPost,
      prepared: PinterestMedia
    ) {
      const chosen = Option.getOrUndefined(optionsOf(post));

      const pin: NewPin = {
        board_id: yield* boardOf(post),
        media_source: yield* sourceOf(post, prepared),
      };

      const altText = post.media[0]?.altText.trim() ?? "";

      if (altText !== "") {
        pin.alt_text = altText;
      }

      if (post.text.trim() !== "") {
        pin.description = post.text;
      }

      if (chosen?.boardSectionId !== undefined) {
        pin.board_section_id = chosen.boardSectionId;
      }

      if (chosen?.dominantColor !== undefined) {
        pin.dominant_color = chosen.dominantColor;
      }

      if (chosen?.link !== undefined) {
        pin.link = chosen.link;
      }

      if (chosen?.title !== undefined && chosen.title.trim() !== "") {
        pin.title = chosen.title;
      }

      return pin;
    });

    const commit = Effect.fn("PinterestClient.commit")(function* commit(
      post: OutgoingPost,
      prepared: PinterestMedia
    ) {
      const pin = yield* pinOf(post, prepared);

      return yield* credentials.withToken(post.channelId, ({ accessToken }) =>
        api
          .execute(
            HttpClientRequest.post(new URL("/v5/pins", apiUrl)).pipe(
              HttpClientRequest.bearerToken(accessToken),
              HttpClientRequest.bodyJsonUnsafe(pin)
            )
          )
          .pipe(
            Effect.flatMap(
              (
                response
              ): Effect.Effect<
                Published,
                AnswerError | OutcomeUnknown | PinterestRefusal
              > =>
                isSuccess(response)
                  ? HttpClientResponse.schemaBodyJson(CreatedSchema)(
                      response
                    ).pipe(Effect.map(({ id }) => publishedAs(id)))
                  : refused(response, "pin")
            ),
            Effect.catchTags({
              HttpClientError: commitUnanswered,
              OutboundRequestRefused: commitUnanswered,
              SchemaError: commitUnanswered,
            })
          )
      );
    });

    // Looks for the attempt's Pin among those of its board, or of its
    // section: made since the attempt started, with the same title,
    // description, link and kind of media. Not finding it settles nothing.
    const lookUp = (
      post: OutgoingPost
    ): Effect.Effect<LookUp, PublishFailure> =>
      Effect.gen(function* lookingUp() {
        const chosen = Option.getOrUndefined(optionsOf(post));
        const boardId = yield* boardOf(post);
        const since = DateTime.subtractDuration(post.startedAt, clockSkew);
        const files = yield* described(post);

        const sent = {
          description: post.text,
          link: chosen?.link ?? "",
          mediaType: mediaTypeOf(
            post,
            files.some(({ kind }) => kind === "video")
          ),
          since,
          title: chosen?.title ?? "",
        };

        const board = `/v5/boards/${encodeURIComponent(boardId)}`;

        const path =
          chosen?.boardSectionId === undefined
            ? `${board}/pins`
            : `${board}/sections/${encodeURIComponent(chosen.boardSectionId)}/pins`;

        let bookmark = Option.none<string>();

        for (let read = 0; read < confirmationPages; read += 1) {
          const cursor = bookmark;

          const page = yield* call(
            post,
            (token) =>
              HttpClientRequest.get(new URL(path, apiUrl)).pipe(
                HttpClientRequest.setUrlParams({
                  page_size: String(pinsPerPage),
                  ...Option.match(cursor, {
                    onNone: () => ({}),
                    onSome: (next) => ({ bookmark: next }),
                  }),
                }),
                HttpClientRequest.bearerToken(token)
              ),
            okOr(PinsSchema, "pin")
          );

          const found = page.items.find((pin) =>
            isSamePin(sent, {
              createdAt: Option.fromNullishOr(pin.created_at),
              description: pin.description ?? "",
              link: pin.link ?? "",
              mediaType: Option.fromNullishOr(pin.media?.media_type),
              title: pin.title ?? "",
            })
          );

          if (found !== undefined) {
            const answer: LookUp = {
              _tag: "found",
              published: publishedAs(found.id),
            };

            return answer;
          }

          bookmark = Option.fromNullishOr(page.bookmark).pipe(
            Option.filter((next) => next !== "")
          );

          if (Option.isNone(bookmark)) {
            break;
          }
        }

        const unknown: LookUp = { _tag: "unknown" };

        return unknown;
      }).pipe(Effect.orElseSucceed((): LookUp => ({ _tag: "unknown" })));

    const steps: PublicationSteps<PinterestMedia> = {
      commit,
      confirmation: { _tag: "lookUp", lookUp },
      platform: "pinterest",
      poll,
      prepare,
    };

    return sequenced(steps, options.timing ?? defaultStepTiming);
  }
);
