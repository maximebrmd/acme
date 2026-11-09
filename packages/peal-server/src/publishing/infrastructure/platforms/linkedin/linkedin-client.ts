import {
  Duration,
  Effect,
  Match,
  Option,
  Schedule,
  Schema,
  Stream,
} from "effect";
import type { Redacted } from "effect";
import { Headers, HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { MediaForPublishing } from "#publishing/application/media-for-publishing.ts";
import type { PublishableMedia } from "#publishing/application/media-for-publishing.ts";
import { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
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
import { inParts } from "#publishing/infrastructure/platforms/byte-parts.ts";
import {
  codeOf,
  commitUnanswered,
  unanswered,
} from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { Published } from "#shared/domain/publish-result.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

import { mediaRefusal, postRefusal } from "./linkedin-refusal.ts";
import type { LinkedInRefusal } from "./linkedin-refusal.ts";
import { littleTextOf } from "./little-text.ts";

/** The HTTP client the adapter sends through: the public one. */
export type LinkedInHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

export interface LinkedInClientOptions {
  /** For API calls. */
  readonly api: LinkedInHttp;
  /** The API's origin: `https://api.linkedin.com`, or a fake's in tests. */
  readonly apiUrl: URL;
  readonly timing?: StepTiming;
  /** For uploads of images and videos, which take longer. */
  readonly uploads: LinkedInHttp;
  /** The API version every call names (`Linkedin-Version`). */
  readonly version: string;
}

// Reading an answer's body fails with these.
type AnswerError = HttpClientError.HttpClientError | Schema.SchemaError;

const imageTypes: ReadonlySet<string> = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
]);

// From the Videos API: MP4 files of 75 KB to 500 MB, read as 75,000 bytes
// at least, so Peal never refuses one LinkedIn takes. Both limits are in the
// platform rules, which refuse a post when it is scheduled; this check
// stays for a post scheduled before they did.
const minVideoBytes = 75_000;

// How often to ask whether a video is processed.
const videoPoll = Duration.seconds(5);

// When the member's token may not read videos back, how many times to wait
// before posting anyway: about half a minute, which processing usually takes.
const blindPolls = 6;

// An upload part that failed for now is sent again a couple of times: the
// same bytes to the same URL, before the whole upload starts over.
const partRetry = { schedule: Schedule.exponential("500 millis"), times: 2 };

const ImageUploadSchema = Schema.Struct({
  value: Schema.Struct({
    image: Schema.NonEmptyString,
    uploadUrl: Schema.NonEmptyString,
  }),
});

const UploadInstructionSchema = Schema.Struct({
  firstByte: Schema.Int,
  lastByte: Schema.Int,
  uploadUrl: Schema.NonEmptyString,
});

type UploadInstruction = typeof UploadInstructionSchema.Type;

const VideoUploadSchema = Schema.Struct({
  value: Schema.Struct({
    uploadInstructions: Schema.NonEmptyArray(UploadInstructionSchema),
    uploadToken: Schema.String,
    video: Schema.NonEmptyString,
  }),
});

const VideoSchema = Schema.Struct({
  processingFailureReason: Schema.optionalKey(Schema.String),
  status: Schema.String,
});

/** An image on LinkedIn, ready to show in a post. */
interface LinkedInImage {
  readonly altText: string;
  readonly id: string;
}

/** What a post shows on LinkedIn, once uploaded. */
type LinkedInMedia =
  | { readonly _tag: "text" }
  | { readonly _tag: "images"; readonly images: readonly LinkedInImage[] }
  // `unread` counts the waits while the token could not read it back.
  | { readonly _tag: "video"; readonly unread: number; readonly video: string };

const ready = (prepared: LinkedInMedia): Readiness<LinkedInMedia> => ({
  _tag: "ready",
  prepared,
});

const processing = (prepared: LinkedInMedia): Readiness<LinkedInMedia> => ({
  _tag: "processing",
  pollAfter: videoPoll,
  prepared,
});

const isSuccess = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

// The body of a success as `schema`, or what the refusal means.
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

// The parts of a video upload, in order: they must cover the file, each
// starting where the last ended.
const partsOf = (
  instructions: readonly UploadInstruction[],
  byteSize: number
): Option.Option<readonly UploadInstruction[]> => {
  const sorted = instructions.toSorted(
    (left, right) => left.firstByte - right.firstByte
  );

  const contiguous = sorted.every(
    (part, index) =>
      part.lastByte >= part.firstByte &&
      part.firstByte ===
        (index === 0 ? 0 : (sorted[index - 1]?.lastByte ?? -1) + 1)
  );

  return contiguous && sorted.at(-1)?.lastByte === byteSize - 1
    ? Option.some(sorted)
    : Option.none();
};

const sizeOfPart = (part: UploadInstruction) =>
  part.lastByte - part.firstByte + 1;

// A post's URN, as `urn:li:share:<id>` or `urn:li:ugcPost:<id>`.
const postUrnPattern = /^urn:li:[A-Za-z]+:[\w-]+$/u;

// The member a post is by: the channels context keeps their OpenID Connect
// subject, which their person URN takes.
const authorOf = (post: OutgoingPost) => `urn:li:person:${post.accountId}`;

// The post's page, which takes its URN as it is.
const publishedAs = (urn: string): Published =>
  postUrnPattern.test(urn)
    ? {
        _tag: "published",
        permalink: `https://www.linkedin.com/feed/update/${urn}/`,
        platformPostId: PlatformPostIdSchema.make(urn),
      }
    : { _tag: "published", platformPostId: PlatformPostIdSchema.make(urn) };

// An image's alt text, left out when it has none.
const altTextOf = (altText: string) =>
  altText.trim() === "" ? {} : { altText };

const imagesContent = (images: readonly LinkedInImage[]) => {
  const [only, ...others] = images;

  if (only !== undefined && others.length === 0) {
    return { content: { media: { id: only.id, ...altTextOf(only.altText) } } };
  }

  return {
    content: {
      multiImage: {
        images: images.map(({ altText, id }) => ({
          id,
          ...altTextOf(altText),
        })),
      },
    },
  };
};

// What the post shows besides its text: one image, several, or a video.
const contentOf = (prepared: LinkedInMedia) =>
  Match.valueTags(prepared, {
    images: ({ images }) => imagesContent(images),
    text: () => ({}),
    video: ({ video }) => ({ content: { media: { id: video } } }),
  });

/**
 * Publishes as a LinkedIn member, on the versioned REST API: images go up
 * through the Images API (initializeUpload, then the bytes to the URL it
 * gives), a video through the Videos API in the parts it asks for, whose
 * ETags finalize it, then processing is polled; the post itself is one
 * POST /rest/posts, whose id comes back in `x-restli-id`.
 *
 * LinkedIn has no idempotency key, and a member's token may not read posts
 * back (`r_member_social` is closed), so a post whose answer was lost is
 * unconfirmed at once: the member checks LinkedIn.
 */
export const linkedinClient = Effect.fn("LinkedInClient.make")(
  function* linkedinClient(options: LinkedInClientOptions) {
    const credentials = yield* PlatformCredentials;
    const media = yield* MediaForPublishing;
    const { api, apiUrl, uploads, version } = options;

    // A call to the REST API, as the member, in the pinned version.
    const rest = (
      request: HttpClientRequest.HttpClientRequest,
      token: Redacted.Redacted
    ) =>
      request.pipe(
        HttpClientRequest.bearerToken(token),
        HttpClientRequest.setHeaders({
          "Linkedin-Version": version,
          "X-Restli-Protocol-Version": "2.0.0",
        })
      );

    // Upload URLs come in LinkedIn's answers: the member's token goes to
    // LinkedIn's own hosts only.
    const uploadUrlOf = (value: string): Effect.Effect<URL, MediaRejected> => {
      const url = URL.parse(value);

      const linkedin =
        url !== null &&
        (url.origin === apiUrl.origin ||
          (url.protocol === "https:" &&
            (url.hostname === "linkedin.com" ||
              url.hostname.endsWith(".linkedin.com"))));

      return linkedin
        ? Effect.succeed(url)
        : Effect.fail(new MediaRejected({ code: "uploadUrlNotAllowed" }));
    };

    // Sends a request with the channel's token. `answer` reads what came
    // back; without an answer, nothing anyone sees happened.
    const mediaCall = <A>(
      post: OutgoingPost,
      client: LinkedInHttp,
      request: (
        token: Redacted.Redacted
      ) => HttpClientRequest.HttpClientRequest,
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

    const uploadImage = Effect.fn("LinkedInClient.uploadImage")(
      function* uploadImage(
        post: OutgoingPost,
        attachment: MediaAttachment,
        described: PublishableMedia
      ) {
        if (!imageTypes.has(described.contentType)) {
          return yield* new MediaRejected({ code: "unsupportedType" });
        }

        const { value } = yield* mediaCall(
          post,
          api,
          (token) =>
            rest(
              HttpClientRequest.post(new URL("/rest/images", apiUrl)).pipe(
                HttpClientRequest.setUrlParam("action", "initializeUpload"),
                HttpClientRequest.bodyJsonUnsafe({
                  initializeUploadRequest: { owner: authorOf(post) },
                })
              ),
              token
            ),
          okOr(ImageUploadSchema)
        );

        const uploadUrl = yield* uploadUrlOf(value.uploadUrl);

        const bytes = yield* Stream.mkUint8Array(
          media.open(post.workspaceId, attachment.mediaId)
        );

        yield* mediaCall(
          post,
          uploads,
          (token) =>
            HttpClientRequest.put(uploadUrl).pipe(
              HttpClientRequest.bearerToken(token),
              HttpClientRequest.bodyUint8Array(
                bytes,
                "application/octet-stream"
              )
            ),
          acknowledged
        );

        const image: LinkedInImage = {
          altText: attachment.altText,
          id: value.image,
        };

        return image;
      }
    );

    // One part of a video, to the presigned URL LinkedIn gave for it: its
    // ETag names it when the upload is finalized.
    const uploadPart = (part: UploadInstruction, bytes: Uint8Array) =>
      uploadUrlOf(part.uploadUrl).pipe(
        Effect.flatMap((url) =>
          uploads.execute(
            HttpClientRequest.put(url).pipe(
              HttpClientRequest.bodyUint8Array(
                bytes,
                "application/octet-stream"
              )
            )
          )
        ),
        Effect.flatMap((response): Effect.Effect<string, PublishFailure> => {
          if (isSuccess(response)) {
            return Option.match(Headers.get(response.headers, "etag"), {
              onNone: () => Effect.fail(new PlatformUnavailable()),
              onSome: Effect.succeed,
            });
          }

          // A presigned URL refused or expired, or LinkedIn busy: a new
          // upload gets new URLs. Any other refusal is about the file.
          return response.status >= 500 ||
            [401, 403, 408, 409, 429].includes(response.status)
            ? Effect.fail(new PlatformUnavailable())
            : Effect.fail(
                new MediaRejected({ code: `http${response.status}` })
              );
        }),
        Effect.catchTags({
          HttpClientError: unanswered,
          OutboundRequestRefused: unanswered,
        }),
        Effect.retry({
          ...partRetry,
          while: (failure) => failure._tag === "PlatformUnavailable",
        })
      );

    const uploadVideo = Effect.fn("LinkedInClient.uploadVideo")(
      function* uploadVideo(
        post: OutgoingPost,
        attachment: MediaAttachment,
        described: PublishableMedia
      ) {
        if (described.contentType !== "video/mp4") {
          return yield* new MediaRejected({ code: "unsupportedType" });
        }

        if (described.byteSize < minVideoBytes) {
          return yield* new MediaRejected({ code: "tooSmall" });
        }

        const { value } = yield* mediaCall(
          post,
          api,
          (token) =>
            rest(
              HttpClientRequest.post(new URL("/rest/videos", apiUrl)).pipe(
                HttpClientRequest.setUrlParam("action", "initializeUpload"),
                HttpClientRequest.bodyJsonUnsafe({
                  initializeUploadRequest: {
                    fileSizeBytes: described.byteSize,
                    owner: authorOf(post),
                    uploadCaptions: false,
                    uploadThumbnail: false,
                  },
                })
              ),
              token
            ),
          okOr(VideoUploadSchema)
        );

        const parts = partsOf(value.uploadInstructions, described.byteSize);

        if (Option.isNone(parts)) {
          return yield* new PlatformUnavailable();
        }

        const plan = parts.value;
        const last = plan.at(-1);

        if (last === undefined) {
          return yield* new PlatformUnavailable();
        }

        const lastSize = sizeOfPart(last);

        const etags = yield* media
          .open(post.workspaceId, attachment.mediaId)
          .pipe(
            inParts((index) => {
              const part = plan[index];

              return part === undefined ? lastSize : sizeOfPart(part);
            }),
            Stream.mapEffect((bytes, index) => {
              const part = plan[index];

              // The file is longer than LinkedIn was told.
              return part === undefined || bytes.length !== sizeOfPart(part)
                ? Effect.fail(new MediaRejected({ code: "sizeMismatch" }))
                : uploadPart(part, bytes);
            }),
            Stream.runCollect
          );

        if (etags.length !== plan.length) {
          return yield* new MediaRejected({ code: "sizeMismatch" });
        }

        yield* mediaCall(
          post,
          api,
          (token) =>
            rest(
              HttpClientRequest.post(new URL("/rest/videos", apiUrl)).pipe(
                HttpClientRequest.setUrlParam("action", "finalizeUpload"),
                HttpClientRequest.bodyJsonUnsafe({
                  finalizeUploadRequest: {
                    uploadToken: value.uploadToken,
                    uploadedPartIds: etags,
                    video: value.video,
                  },
                })
              ),
              token
            ),
          acknowledged
        );

        return processing({ _tag: "video", unread: 0, video: value.video });
      }
    );

    const prepare = Effect.fn("LinkedInClient.prepare")(function* prepare(
      post: OutgoingPost
    ) {
      if (post.media.length === 0) {
        return ready({ _tag: "text" });
      }

      const described = yield* Effect.forEach(
        post.media,
        (attachment) =>
          media
            .describe(post.workspaceId, attachment.mediaId)
            .pipe(Effect.map((found) => ({ attachment, described: found }))),
        { concurrency: 1 }
      );

      const [first] = described;

      // A post shows one video alone, or images.
      if (described.some((item) => item.described.kind === "video")) {
        return described.length === 1 && first !== undefined
          ? yield* uploadVideo(post, first.attachment, first.described)
          : yield* new MediaRejected({ code: "videoWithOtherMedia" });
      }

      const images = yield* Effect.forEach(
        described,
        (item) => uploadImage(post, item.attachment, item.described),
        { concurrency: 1 }
      );

      return ready({ _tag: "images", images });
    });

    // A video's processing: AVAILABLE once done. A member's token may be
    // refused reading it (403): then the post waits a little, and goes out
    // as if it were, LinkedIn refusing it for now if it was not.
    const poll = Effect.fn("LinkedInClient.poll")(function* poll(
      post: OutgoingPost,
      prepared: LinkedInMedia
    ) {
      if (prepared._tag !== "video") {
        return ready(prepared);
      }

      const found = yield* mediaCall(
        post,
        api,
        (token) =>
          rest(
            HttpClientRequest.get(
              new URL(
                `/rest/videos/${encodeURIComponent(prepared.video)}`,
                apiUrl
              )
            ),
            token
          ),
        (response) =>
          response.status === 403
            ? Effect.succeed(Option.none<typeof VideoSchema.Type>())
            : okOr(VideoSchema)(response).pipe(Effect.map(Option.some))
      );

      if (Option.isNone(found)) {
        return prepared.unread + 1 >= blindPolls
          ? ready(prepared)
          : processing({ ...prepared, unread: prepared.unread + 1 });
      }

      const { processingFailureReason: reason, status } = found.value;

      if (status === "AVAILABLE") {
        return ready(prepared);
      }

      if (status === "PROCESSING_FAILED") {
        return yield* new MediaRejected({
          code: codeOf(Option.fromUndefinedOr(reason), "processingFailed"),
        });
      }

      return processing(prepared);
    });

    const commit = Effect.fn("LinkedInClient.commit")(function* commit(
      post: OutgoingPost,
      prepared: LinkedInMedia
    ) {
      return yield* credentials.withToken(post.channelId, ({ accessToken }) =>
        api
          .execute(
            rest(
              HttpClientRequest.post(new URL("/rest/posts", apiUrl)).pipe(
                HttpClientRequest.bodyJsonUnsafe({
                  author: authorOf(post),
                  commentary: littleTextOf(post.text),
                  distribution: {
                    feedDistribution: "MAIN_FEED",
                    targetEntities: [],
                    thirdPartyDistributionChannels: [],
                  },
                  isReshareDisabledByAuthor: false,
                  lifecycleState: "PUBLISHED",
                  visibility: "PUBLIC",
                  ...contentOf(prepared),
                })
              ),
              accessToken
            )
          )
          .pipe(
            Effect.flatMap(
              (response): Effect.Effect<Published, LinkedInRefusal> => {
                if (!isSuccess(response)) {
                  return postRefusal(response);
                }

                // Created (201): the post's URN is in the header.
                return Option.match(
                  Headers.get(response.headers, "x-restli-id").pipe(
                    Option.map((urn) => urn.trim()),
                    Option.filter((urn) => urn !== "")
                  ),
                  {
                    onNone: () =>
                      Effect.fail(
                        new OutcomeUnknown({ reason: "unreadableResponse" })
                      ),
                    onSome: (urn) => Effect.succeed(publishedAs(urn)),
                  }
                );
              }
            ),
            Effect.catchTags({
              HttpClientError: commitUnanswered,
              OutboundRequestRefused: commitUnanswered,
            })
          )
      );
    });

    const steps: PublicationSteps<LinkedInMedia> = {
      commit,
      confirmation: { _tag: "none" },
      platform: "linkedin",
      poll,
      prepare,
    };

    return sequenced(steps, options.timing ?? defaultStepTiming);
  }
);
