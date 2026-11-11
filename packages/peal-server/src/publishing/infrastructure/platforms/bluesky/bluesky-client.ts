import { DateTime, Duration, Effect, Option, Schema, Stream } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

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
import { BlueskyOptions } from "#publishing/domain/bluesky-options.ts";
import type { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { platformRefusalCodes } from "#publishing/domain/own-refusals.ts";
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
import type {
  PlatformPostId,
  Published,
} from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";
import { sessionOf } from "#shared/infrastructure/platforms/bluesky/bluesky-session.ts";
import type { BlueskySession } from "#shared/infrastructure/platforms/bluesky/bluesky-session.ts";
import { dpopSender } from "#shared/infrastructure/platforms/bluesky/dpop.ts";
import type { BlueskyHttp } from "#shared/infrastructure/platforms/bluesky/dpop.ts";
import {
  FacetSchema,
  facetsOf,
} from "#shared/infrastructure/platforms/bluesky/facets.ts";
import { recordKeyOf } from "#shared/infrastructure/platforms/bluesky/record-key.ts";
import { streamedBody } from "#shared/infrastructure/platforms/public-http.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";

import {
  errorNameOf,
  mediaRefusal,
  recordRefusal,
  XrpcErrorSchema,
} from "./bluesky-refusal.ts";

export interface BlueskyClientOptions {
  /** For calls to the PDS and the video service. */
  readonly api: BlueskyHttp;
  readonly timing?: StepTiming;
  /** For uploads of images and videos, which take longer. */
  readonly uploads: BlueskyHttp;
  /** The service that processes videos before they are posted. */
  readonly videoService: URL;
}

const postCollection = "app.bsky.feed.post";

// From the lexicons: images of at most 2,000,000 bytes, four to a post;
// one MP4 video of at most 300,000,000 bytes, alone.
const maxImageBytes = 2_000_000;

const maxVideoBytes = 300_000_000;

// How often to ask the video service how a job is going.
const videoPoll = Duration.seconds(2);

// A service token for the video service lasts half an hour, as Bluesky's
// guide advises: long enough for the upload.
const serviceTokenLifetime = Duration.minutes(30);

const BlobRefSchema = Schema.Struct({
  $type: Schema.Literal("blob"),
  mimeType: Schema.String,
  ref: Schema.Struct({ $link: Schema.String }),
  size: Schema.Number,
});

type BlobRef = typeof BlobRefSchema.Type;

const UploadedBlobSchema = Schema.Struct({ blob: BlobRefSchema });

const ServiceAuthSchema = Schema.Struct({ token: Schema.NonEmptyString });

const JobStatusSchema = Schema.Struct({
  blob: Schema.optionalKey(BlobRefSchema),
  error: Schema.optionalKey(Schema.String),
  failureCode: Schema.optionalKey(Schema.String),
  jobId: Schema.String,
  state: Schema.String,
});

type JobStatus = typeof JobStatusSchema.Type;

// The lexicon wraps the status in `jobStatus`; the service has answered
// uploads with it bare.
const JobAnswerSchema = Schema.Union([
  Schema.Struct({ jobStatus: JobStatusSchema }),
  JobStatusSchema,
]);

const CreatedSchema = Schema.Struct({
  cid: Schema.String,
  uri: Schema.NonEmptyString,
});

const StoredRecordSchema = Schema.Struct({
  value: Schema.Struct({ createdAt: Schema.String, text: Schema.String }),
});

// A record named with the hash of what it holds, as a reply names the
// posts it answers (com.atproto.repo.strongRef).
const StrongRefSchema = Schema.Struct({
  cid: Schema.NonEmptyString,
  uri: Schema.NonEmptyString,
});

type StrongRef = typeof StrongRefSchema.Type;

// What a reply answers: the thread's first post and the post just above.
const ReplySchema = Schema.Struct({
  parent: StrongRefSchema,
  root: StrongRefSchema,
});

type Reply = typeof ReplySchema.Type;

// Reading an answer's body fails with these.
type AnswerError = HttpClientError.HttpClientError | Schema.SchemaError;

// The body of a 200 as `schema`, or what the refusal means.
const okOr =
  <A, I>(schema: Schema.Codec<A, I>) =>
  (
    response: HttpClientResponse.HttpClientResponse
  ): Effect.Effect<A, AnswerError | PublishFailure | TokenRejected> =>
    response.status === 200
      ? HttpClientResponse.schemaBodyJson(schema)(response)
      : mediaRefusal(response);

const AspectRatioSchema = Schema.Struct({
  height: Schema.Int,
  width: Schema.Int,
});

type AspectRatio = Option.Option<typeof AspectRatioSchema.Type>;

// The post's record and its embeds, as the lexicons write them: optional
// fields are Options here, left out of the JSON when empty.
const ImageSchema = Schema.Struct({
  alt: Schema.String,
  aspectRatio: Schema.OptionFromOptionalKey(AspectRatioSchema),
  image: BlobRefSchema,
});

type BlueskyImage = typeof ImageSchema.Type;

const ImagesEmbedSchema = Schema.Struct({
  $type: Schema.Literal("app.bsky.embed.images"),
  images: Schema.Array(ImageSchema),
});

const VideoEmbedSchema = Schema.Struct({
  $type: Schema.Literal("app.bsky.embed.video"),
  alt: Schema.OptionFromOptionalKey(Schema.String),
  aspectRatio: Schema.OptionFromOptionalKey(AspectRatioSchema),
  video: BlobRefSchema,
});

// The author's own labels on what a post shows
// (`com.atproto.label.defs#selfLabels`).
const SelfLabelsSchema = Schema.Struct({
  $type: Schema.Literal("com.atproto.label.defs#selfLabels"),
  values: Schema.Array(Schema.Struct({ val: Schema.String })),
});

const PostRecordSchema = Schema.Struct({
  $type: Schema.Literal(postCollection),
  createdAt: Schema.String,
  embed: Schema.OptionFromOptionalKey(
    Schema.Union([ImagesEmbedSchema, VideoEmbedSchema])
  ),
  facets: Schema.OptionFromOptionalKey(Schema.Array(FacetSchema)),
  labels: Schema.OptionFromOptionalKey(SelfLabelsSchema),
  langs: Schema.OptionFromOptionalKey(Schema.Array(Schema.String)),
  reply: Schema.OptionFromOptionalKey(ReplySchema),
  text: Schema.String,
});

const encodeRecord = Schema.encodeSync(PostRecordSchema);

type Embed = typeof PostRecordSchema.Type.embed;

interface BlueskyVideo {
  readonly alt: string;
  readonly aspectRatio: AspectRatio;
  // Once the video service has stored the processed video on the PDS.
  readonly blob: Option.Option<BlobRef>;
  readonly jobId: string;
}

/** The media of a post on the PDS: images, or one video. */
interface BlueskyMedia {
  readonly images: readonly BlueskyImage[];
  readonly video: Option.Option<BlueskyVideo>;
}

const noMedia: BlueskyMedia = { images: [], video: Option.none() };

const jobStatusOf = (answer: typeof JobAnswerSchema.Type): JobStatus =>
  "jobStatus" in answer ? answer.jobStatus : answer;

// The video as the job left it: ready once the service gives the blob,
// even for a video it had processed before (`already_exists`).
const videoReadiness = (
  video: Omit<BlueskyVideo, "blob" | "jobId">,
  status: JobStatus
): Effect.Effect<Readiness<BlueskyMedia>, MediaRejected> => {
  if (status.blob !== undefined) {
    return Effect.succeed({
      _tag: "ready",
      prepared: {
        images: [],
        video: Option.some({
          ...video,
          blob: Option.some(status.blob),
          jobId: status.jobId,
        }),
      },
    });
  }

  if (status.state === "JOB_STATE_FAILED") {
    const reason = Option.fromUndefinedOr(status.failureCode).pipe(
      Option.orElse(() => Option.fromUndefinedOr(status.error))
    );

    return Effect.fail(
      new MediaRejected({ code: codeOf(reason, "processingFailed") })
    );
  }

  return Effect.succeed({
    _tag: "processing",
    pollAfter: videoPoll,
    prepared: {
      images: [],
      video: Option.some({
        ...video,
        blob: Option.none(),
        jobId: status.jobId,
      }),
    },
  });
};

// What the video service answered when it did not take the video: busy,
// down, or refusing it (an unverified email, a daily limit, a bad file).
const videoServiceRefusal = (response: HttpClientResponse.HttpClientResponse) =>
  Effect.gen(function* refusing() {
    if (response.status === 429) {
      const retryAfter = retryAfterOf(response.headers, yield* DateTime.now);

      return yield* Option.isSome(retryAfter)
        ? new RateLimited({ retryAfter: retryAfter.value })
        : new RateLimited({});
    }

    if (response.status >= 500) {
      return yield* new PlatformUnavailable();
    }

    const error = yield* errorNameOf(response);

    return yield* new MediaRejected({
      code: codeOf(error, `http${response.status}`),
    });
  });

// How the video service answered an upload or a look at its job.
const jobAnswer = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<
  JobStatus,
  AnswerError | MediaRejected | PlatformUnavailable | RateLimited
> =>
  // A video the service processed before comes back with 409 and the blob
  // it made then.
  response.status === 200 || response.status === 409
    ? HttpClientResponse.schemaBodyJson(JobAnswerSchema)(response).pipe(
        Effect.map(jobStatusOf)
      )
    : videoServiceRefusal(response);

const aspectRatioOf = (media: PublishableMedia): AspectRatio =>
  media.dimensions;

const embedOf = (media: BlueskyMedia): Embed => {
  if (Option.isSome(media.video)) {
    const { alt, aspectRatio, blob } = media.video.value;

    return blob.pipe(
      Option.map((video) => ({
        $type: "app.bsky.embed.video" as const,
        alt: Option.some(alt).pipe(Option.filter((text) => text !== "")),
        aspectRatio,
        video,
      }))
    );
  }

  return media.images.length === 0
    ? Option.none()
    : Option.some({
        $type: "app.bsky.embed.images" as const,
        images: media.images,
      });
};

const isBluesky = Schema.is(BlueskyOptions);

/**
 * What the post's options put in each part's record: its languages, and
 * its label on a part with media, as a label describes what is shown.
 */
const optionFieldsOf = (post: OutgoingPost, hasMedia: boolean) => {
  const chosen = post.options.pipe(Option.filter(isBluesky));

  return {
    labels: chosen.pipe(
      Option.flatMap(({ contentLabel }) =>
        Option.fromUndefinedOr(contentLabel)
      ),
      Option.filter(() => hasMedia),
      Option.map((label) => ({
        $type: "com.atproto.label.defs#selfLabels" as const,
        values: [{ val: label }],
      }))
    ),
    langs: chosen.pipe(
      Option.flatMap(({ languages }) => Option.fromUndefinedOr(languages)),
      Option.filter((languages) => languages.length > 0)
    ),
  };
};

/** A post's public address on the Bluesky app. */
const permalinkOf = (did: string, recordKey: string) =>
  `https://bsky.app/profile/${did}/post/${recordKey}`;

/**
 * Publishes on Bluesky, through the account's PDS, with the session's
 * DPoP-bound token: images go up with com.atproto.repo.uploadBlob; a video
 * goes to the video service with a service token the PDS signs, which
 * processes it and stores it on the PDS while the job is polled; then
 * com.atproto.repo.createRecord makes the post, under a record key chosen
 * from the attempt. The key makes the outcome definite: the post is read
 * back with com.atproto.repo.getRecord, and a second create with the key
 * is refused.
 */
export const blueskyClient = Effect.fn("BlueskyClient.make")(
  function* blueskyClient(options: BlueskyClientOptions) {
    const credentials = yield* PlatformCredentials;
    const media = yield* MediaForPublishing;
    const { api, uploads, videoService } = options;
    const dpop = yield* dpopSender(api);
    const dpopUploads = yield* dpopSender(uploads);

    const withSession = <A, E>(
      post: OutgoingPost,
      use: (session: BlueskySession) => Effect.Effect<A, E>
    ) =>
      credentials.withToken(post.channelId, ({ accessToken }) =>
        sessionOf(accessToken).pipe(Effect.flatMap(use))
      );

    // Anything unreadable, or unanswered, is the server being down, for
    // calls that change nothing anyone sees.
    const mediaUnanswered = {
      HttpClientError: unanswered,
      OutboundRequestRefused: unanswered,
      SchemaError: unanswered,
    } as const;

    const uploadImage = Effect.fn("BlueskyClient.uploadImage")(
      function* uploadImage(
        post: OutgoingPost,
        attachment: MediaAttachment,
        described: PublishableMedia
      ) {
        if (!described.contentType.startsWith("image/")) {
          return yield* new MediaRejected({ code: "unsupportedType" });
        }

        if (described.byteSize > maxImageBytes) {
          return yield* new MediaRejected({ code: "tooLarge" });
        }

        const bytes = yield* Stream.mkUint8Array(
          media.open(post.workspaceId, attachment.mediaId)
        );

        const uploaded = yield* withSession(post, (session) =>
          dpopUploads
            .send(
              session,
              HttpClientRequest.post(
                new URL("/xrpc/com.atproto.repo.uploadBlob", session.pds)
              ).pipe(
                HttpClientRequest.bodyUint8Array(bytes, described.contentType)
              )
            )
            .pipe(
              Effect.flatMap(okOr(UploadedBlobSchema)),
              Effect.catchTags(mediaUnanswered)
            )
        );

        const image: BlueskyImage = {
          alt: attachment.altText,
          aspectRatio: aspectRatioOf(described),
          image: uploaded.blob,
        };

        return image;
      }
    );

    // A token the PDS signs for the video service to store the video on
    // the PDS in the account's name.
    const serviceToken = (session: BlueskySession) =>
      DateTime.now.pipe(
        Effect.flatMap((now) =>
          dpop.send(
            session,
            HttpClientRequest.get(
              new URL("/xrpc/com.atproto.server.getServiceAuth", session.pds)
            ).pipe(
              HttpClientRequest.setUrlParams({
                aud: `did:web:${encodeURIComponent(session.pds.host)}`,
                exp: Math.floor(
                  DateTime.toEpochMillis(
                    DateTime.addDuration(now, serviceTokenLifetime)
                  ) / 1000
                ),
                lxm: "com.atproto.repo.uploadBlob",
              })
            )
          )
        ),
        Effect.flatMap(okOr(ServiceAuthSchema)),
        Effect.map(({ token }) => token)
      );

    const uploadVideo = Effect.fn("BlueskyClient.uploadVideo")(
      function* uploadVideo(
        post: OutgoingPost,
        attachment: MediaAttachment,
        described: PublishableMedia
      ) {
        if (described.contentType !== "video/mp4") {
          return yield* new MediaRejected({ code: "unsupportedType" });
        }

        if (described.byteSize > maxVideoBytes) {
          return yield* new MediaRejected({ code: "tooLarge" });
        }

        // Up to 300 MB: streamed from the store to the video service,
        // never held whole.
        // The file's turn among the large uploads is waited for before
        // the request opens, so the video service never waits on an open
        // request for its bytes.
        const status = yield* Effect.scoped(
          media.held(post.workspaceId, attachment.mediaId).pipe(
            Effect.flatMap((bytes) =>
              withSession(post, (session) =>
                serviceToken(session).pipe(
                  Effect.flatMap((token) =>
                    uploads.execute(
                      HttpClientRequest.post(
                        new URL(
                          "/xrpc/app.bsky.video.uploadVideo",
                          videoService
                        )
                      ).pipe(
                        HttpClientRequest.setUrlParams({
                          did: session.did,
                          name: described.fileName,
                        }),
                        HttpClientRequest.bearerToken(token),
                        streamedBody(bytes, {
                          contentLength: described.byteSize,
                          contentType: "video/mp4",
                        })
                      )
                    )
                  ),
                  Effect.flatMap(jobAnswer),
                  Effect.catchTags(mediaUnanswered)
                )
              )
            )
          )
        );

        return yield* videoReadiness(
          {
            alt: attachment.altText,
            aspectRatio: aspectRatioOf(described),
          },
          status
        );
      }
    );

    const prepare = Effect.fn("BlueskyClient.prepare")(function* prepare(
      post: OutgoingPost
    ) {
      if (post.media.length === 0) {
        const ready: Readiness<BlueskyMedia> = {
          _tag: "ready",
          prepared: noMedia,
        };

        return ready;
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

      const hasVideo = described.some(
        (item) => item.described.kind === "video"
      );

      // Bluesky embeds one video, alone, or images.
      if (hasVideo && described.length > 1) {
        return yield* new MediaRejected({ code: "videoWithOtherMedia" });
      }

      if (hasVideo && first !== undefined) {
        return yield* uploadVideo(post, first.attachment, first.described);
      }

      const images = yield* Effect.forEach(
        described,
        (item) => uploadImage(post, item.attachment, item.described),
        { concurrency: 1 }
      );

      const ready: Readiness<BlueskyMedia> = {
        _tag: "ready",
        prepared: { images, video: Option.none() },
      };

      return ready;
    });

    const poll = Effect.fn("BlueskyClient.poll")(function* poll(
      _post: OutgoingPost,
      prepared: BlueskyMedia
    ) {
      const { video } = prepared;

      if (Option.isNone(video) || Option.isSome(video.value.blob)) {
        const ready: Readiness<BlueskyMedia> = { _tag: "ready", prepared };

        return ready;
      }

      const status = yield* api
        .get(new URL("/xrpc/app.bsky.video.getJobStatus", videoService), {
          urlParams: { jobId: video.value.jobId },
        })
        .pipe(Effect.flatMap(jobAnswer), Effect.catchTags(mediaUnanswered));

      return yield* videoReadiness(video.value, status);
    });

    const recordOf = (
      post: OutgoingPost,
      prepared: BlueskyMedia,
      reply: Option.Option<Reply>
    ) => {
      const facets = facetsOf(post.text);
      const embed = embedOf(prepared);

      return encodeRecord({
        $type: postCollection,
        createdAt: DateTime.formatIso(post.startedAt),
        embed,
        facets: facets.length === 0 ? Option.none() : Option.some(facets),
        ...optionFieldsOf(post, Option.isSome(embed)),
        reply,
        text: post.text,
      });
    };

    // A post of the account as a reply names it: its address, with the
    // hash the PDS holds for it now. Reading changes nothing: no answer is
    // the server being down, and a post that is gone can be answered by
    // nothing, so the part is refused before anything is sent.
    const strongRefOf = (post: OutgoingPost, uri: PlatformPostId) =>
      withSession(post, (session) =>
        api
          .get(new URL("/xrpc/com.atproto.repo.getRecord", session.pds), {
            urlParams: {
              collection: postCollection,
              repo: session.did,
              rkey: uri.slice(uri.lastIndexOf("/") + 1),
            },
          })
          .pipe(
            Effect.flatMap(
              (
                response
              ): Effect.Effect<StrongRef, AnswerError | PublishFailure> => {
                if (response.status === 200) {
                  return HttpClientResponse.schemaBodyJson(StrongRefSchema)(
                    response
                  );
                }

                return response.status === 400
                  ? HttpClientResponse.schemaBodyJson(XrpcErrorSchema)(
                      response
                    ).pipe(
                      Effect.flatMap(
                        ({ error }): Effect.Effect<never, PublishFailure> =>
                          Effect.fail(
                            error === "RecordNotFound"
                              ? new BadRequest({
                                  code: platformRefusalCodes.replyTargetGone,
                                })
                              : new PlatformUnavailable()
                          )
                      )
                    )
                  : Effect.fail(new PlatformUnavailable());
              }
            ),
            Effect.catchTags(mediaUnanswered)
          )
      );

    // What the part answers, as its record names it: nothing for the post
    // itself.
    const replyOf = (post: OutgoingPost) =>
      Option.match(post.replyTo, {
        onNone: () => Effect.succeed(Option.none<Reply>()),
        onSome: ({ parent, root }) =>
          Effect.gen(function* naming() {
            const above = yield* strongRefOf(post, parent);

            return Option.some<Reply>({
              parent: above,
              root: parent === root ? above : yield* strongRefOf(post, root),
            });
          }),
      });

    const commit = Effect.fn("BlueskyClient.commit")(function* commit(
      post: OutgoingPost,
      prepared: BlueskyMedia
    ) {
      const recordKey = recordKeyOf(post.startedAt, post.idempotencyKey);
      const reply = yield* replyOf(post);

      return yield* withSession(post, (session) =>
        dpop
          .send(
            session,
            HttpClientRequest.post(
              new URL("/xrpc/com.atproto.repo.createRecord", session.pds)
            ).pipe(
              HttpClientRequest.bodyJsonUnsafe({
                collection: postCollection,
                record: recordOf(post, prepared, reply),
                repo: session.did,
                rkey: recordKey,
              })
            )
          )
          .pipe(
            Effect.flatMap(
              (
                response
              ): Effect.Effect<
                Published,
                | HttpClientError.HttpClientError
                | OutcomeUnknown
                | PublishFailure
                | Schema.SchemaError
                | TokenRejected
              > =>
                response.status === 200
                  ? HttpClientResponse.schemaBodyJson(CreatedSchema)(
                      response
                    ).pipe(
                      Effect.map(({ uri }): Published => ({
                        _tag: "published",
                        permalink: permalinkOf(session.did, recordKey),
                        platformPostId: PlatformPostIdSchema.make(uri),
                      }))
                    )
                  : recordRefusal(response)
            ),
            Effect.catchTags({
              HttpClientError: commitUnanswered,
              OutboundRequestRefused: commitUnanswered,
              SchemaError: commitUnanswered,
            })
          )
      );
    });

    // Reads the attempt's record back from the PDS, by its key. A record
    // there that is not this post (another post took the key, which the key's
    // spread makes all but impossible) settles nothing.
    const lookUp = (post: OutgoingPost) => {
      const recordKey = recordKeyOf(post.startedAt, post.idempotencyKey);
      const createdAt = DateTime.formatIso(post.startedAt);

      return withSession(post, (session) =>
        api
          .get(new URL("/xrpc/com.atproto.repo.getRecord", session.pds), {
            urlParams: {
              collection: postCollection,
              repo: session.did,
              rkey: recordKey,
            },
          })
          .pipe(
            Effect.flatMap(
              (
                response
              ): Effect.Effect<
                LookUp,
                HttpClientError.HttpClientError | Schema.SchemaError
              > => {
                if (response.status === 200) {
                  return HttpClientResponse.schemaBodyJson(StoredRecordSchema)(
                    response
                  ).pipe(
                    Effect.map(({ value }): LookUp =>
                      value.createdAt === createdAt && value.text === post.text
                        ? {
                            _tag: "found",
                            published: {
                              _tag: "published",
                              permalink: permalinkOf(session.did, recordKey),
                              platformPostId: PlatformPostIdSchema.make(
                                `at://${session.did}/${postCollection}/${recordKey}`
                              ),
                            },
                          }
                        : { _tag: "unknown" }
                    )
                  );
                }

                return response.status === 400
                  ? HttpClientResponse.schemaBodyJson(XrpcErrorSchema)(
                      response
                    ).pipe(
                      Effect.map(({ error }): LookUp =>
                        error === "RecordNotFound"
                          ? { _tag: "absent" }
                          : { _tag: "unknown" }
                      )
                    )
                  : Effect.succeed<LookUp>({ _tag: "unknown" });
              }
            ),
            Effect.orElseSucceed((): LookUp => ({ _tag: "unknown" }))
          )
      );
    };

    const steps: PublicationSteps<BlueskyMedia> = {
      commit,
      confirmation: { _tag: "lookUp", lookUp },
      platform: "bluesky",
      poll,
      prepare,
    };

    return sequenced(steps, options.timing ?? defaultStepTiming);
  }
);
