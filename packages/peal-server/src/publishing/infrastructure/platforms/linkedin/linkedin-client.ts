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
import type {
  OutgoingPost,
  PlatformClient,
} from "#publishing/application/platform-client.ts";
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
import { RecordedPosts } from "#publishing/application/recorded-posts.ts";
import type { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { inParts } from "#publishing/infrastructure/platforms/byte-parts.ts";
import { withFirstComments } from "#publishing/infrastructure/platforms/first-comment.ts";
import {
  codeOf,
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
import { isOrganization } from "#shared/infrastructure/platforms/linkedin-rest.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { streamedBody } from "#shared/infrastructure/platforms/public-http.ts";

import { authorUrnOf } from "./linkedin-author.ts";
import { pageLookUp } from "./linkedin-confirmation.ts";
import { linkedinDocuments } from "./linkedin-documents.ts";
import { linkedinCommentCalls } from "./linkedin-first-comment.ts";
import { documentTitleOf, linkOf, postBodyOf } from "./linkedin-post-body.ts";
import type { LinkedInLink } from "./linkedin-post-body.ts";
import { mediaRefusal, postRefusal } from "./linkedin-refusal.ts";
import type { LinkedInRefusal } from "./linkedin-refusal.ts";

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
  // A link shown as a card, under an image of the post's when it has one.
  | {
      readonly _tag: "article";
      readonly link: LinkedInLink;
      readonly thumbnail: Option.Option<LinkedInImage>;
    }
  | { readonly _tag: "images"; readonly images: readonly LinkedInImage[] }
  // A PDF, shown page by page under its title. `unread` counts the waits
  // while the token could not read it back.
  | {
      readonly _tag: "document";
      readonly document: string;
      readonly title: string;
      readonly unread: number;
    }
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

// Who a post and its uploads are by: the member, or the page.
const authorOf = (post: OutgoingPost) => authorUrnOf(post.accountId);

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

// An article: LinkedIn reads no page itself, so the title, and the
// description and thumbnail when there are any, come with the address.
const articleContent = (
  link: LinkedInLink,
  thumbnail: Option.Option<LinkedInImage>
) => ({
  content: {
    article: {
      source: link.source,
      title: link.title,
      ...Option.match(link.description, {
        onNone: () => ({}),
        onSome: (description) => ({ description }),
      }),
      ...Option.match(thumbnail, {
        onNone: () => ({}),
        onSome: ({ id }) => ({ thumbnail: id }),
      }),
    },
  },
});

// What the post shows besides its text: one image, several, a video, or a
// link's card.
const contentOf = (prepared: LinkedInMedia) =>
  Match.valueTags(prepared, {
    article: ({ link, thumbnail }) => articleContent(link, thumbnail),
    document: ({ document, title }) => ({
      content: { media: { id: document, title } },
    }),
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
 * It posts as the channel's account: a member (`urn:li:person:`), or a
 * company page (`urn:li:organization:`, the account's id), whose uploads
 * are the page's own. The target's options say who sees the post, whether
 * it can be reshared, which pages its text names, and a link to show as a
 * card (LinkedIn's article, with one image of the post as its thumbnail).
 * A PDF goes up through the Documents API and shows alone, page by page,
 * under the title the options give or its file's name.
 *
 * LinkedIn has no idempotency key, and a member's token may not read posts
 * back (`r_member_social` is closed), so a member's post whose answer was
 * lost is unconfirmed at once: the member checks LinkedIn. A page's token
 * reads the page's posts (`r_organization_social`): the post is looked for
 * among them, and is unconfirmed only when it is not found.
 */
export const linkedinClient = Effect.fn("LinkedInClient.make")(
  function* linkedinClient(options: LinkedInClientOptions) {
    const credentials = yield* PlatformCredentials;
    const media = yield* MediaForPublishing;
    const recorded = yield* RecordedPosts;
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

    const documents = linkedinDocuments({
      api,
      apiUrl,
      credentials,
      media,
      uploads,
      version,
    });

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

        // Streamed from the store to LinkedIn, never held whole, once the
        // file has its turn: the request opens with its bytes ready.
        yield* Effect.scoped(
          media.held(post.workspaceId, attachment.mediaId).pipe(
            Effect.flatMap((bytes) =>
              mediaCall(
                post,
                uploads,
                (token) =>
                  HttpClientRequest.put(uploadUrl).pipe(
                    HttpClientRequest.bearerToken(token),
                    streamedBody(bytes, {
                      contentLength: described.byteSize,
                      contentType: "application/octet-stream",
                    })
                  ),
                acknowledged
              )
            )
          )
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

    // A link's card takes one image at most, as its thumbnail: a post
    // cannot show a link beside a video or several images.
    const prepareArticle = Effect.fn("LinkedInClient.prepareArticle")(
      function* prepareArticle(post: OutgoingPost, link: LinkedInLink) {
        const [attachment, ...others] = post.media;

        if (attachment === undefined) {
          return ready({ _tag: "article", link, thumbnail: Option.none() });
        }

        const described = yield* media.describe(
          post.workspaceId,
          attachment.mediaId
        );

        if (others.length > 0 || described.kind !== "image") {
          return yield* new BadRequest({ code: "linkWithMedia" });
        }

        const thumbnail = yield* uploadImage(post, attachment, described);

        return ready({
          _tag: "article",
          link,
          thumbnail: Option.some(thumbnail),
        });
      }
    );

    const prepare = Effect.fn("LinkedInClient.prepare")(function* prepare(
      post: OutgoingPost
    ) {
      const link = linkOf(post);

      if (Option.isSome(link)) {
        return yield* prepareArticle(post, link.value);
      }

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

      // A post shows one document alone.
      if (described.some((item) => item.described.kind === "document")) {
        if (described.length !== 1 || first === undefined) {
          return yield* new MediaRejected({ code: "documentWithOtherMedia" });
        }

        const document = yield* documents.upload(
          post,
          first.attachment,
          first.described
        );

        return processing({
          _tag: "document",
          document,
          title: documentTitleOf(post, first.described.fileName),
          unread: 0,
        });
      }

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
      if (prepared._tag === "document") {
        const status = yield* documents.status(post, prepared.document);

        if (Option.isNone(status)) {
          return prepared.unread + 1 >= blindPolls
            ? ready(prepared)
            : processing({ ...prepared, unread: prepared.unread + 1 });
        }

        if (status.value === "PROCESSING_FAILED") {
          return yield* new MediaRejected({ code: "processingFailed" });
        }

        return status.value === "AVAILABLE"
          ? ready(prepared)
          : processing(prepared);
      }

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
                HttpClientRequest.bodyJsonUnsafe(
                  postBodyOf(post, contentOf(prepared))
                )
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

    const stepsWith = (
      confirmation: PublicationSteps<LinkedInMedia>["confirmation"]
    ): PublicationSteps<LinkedInMedia> => ({
      commit,
      confirmation,
      platform: "linkedin",
      poll,
      prepare,
    });

    const timing = options.timing ?? defaultStepTiming;

    // A member's token may not read posts back: nothing confirms theirs.
    const asMember = sequenced(stepsWith({ _tag: "none" }), timing);

    // A page's can: a post whose answer was lost is looked for among the
    // page's newest.
    const asPage = sequenced(
      stepsWith({
        _tag: "lookUp",
        lookUp: pageLookUp({
          api,
          apiUrl,
          credentials,
          published: publishedAs,
          recorded,
          version,
        }),
      }),
      timing
    );

    const clientFor = (post: OutgoingPost) =>
      isOrganization(post.accountId) ? asPage : asMember;

    const client: PlatformClient = {
      platform: "linkedin",
      publish: (post) => clientFor(post).publish(post),
      resume: (post) => clientFor(post).resume(post),
    };

    // A page's first comment goes under its post, as the page.
    return withFirstComments(
      client,
      linkedinCommentCalls({ api, apiUrl, credentials, rest }),
      timing
    );
  }
);
