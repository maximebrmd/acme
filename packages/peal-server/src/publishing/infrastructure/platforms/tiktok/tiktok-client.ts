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
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

import { MediaForPublishing } from "#publishing/application/media-for-publishing.ts";
import type { PublishableMedia } from "#publishing/application/media-for-publishing.ts";
import type { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import type {
  OutgoingPost,
  PlatformClient,
} from "#publishing/application/platform-client.ts";
import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import { PublicationProgress } from "#publishing/application/publication-progress.ts";
import { defaultStepTiming } from "#publishing/application/publication-steps.ts";
import type { StepTiming } from "#publishing/application/publication-steps.ts";
import type { TikTokCreator } from "#publishing/domain/tiktok-creator.ts";
import { TikTokOptions } from "#publishing/domain/tiktok-options.ts";
import type { TikTokPrivacyLevel } from "#publishing/domain/tiktok-options.ts";
import { inParts } from "#publishing/infrastructure/platforms/byte-parts.ts";
import {
  commitUnanswered,
  unanswered,
} from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type {
  Published,
  PublishResult,
  UnconfirmedReason,
} from "#shared/domain/publish-result.ts";
import {
  tiktokAnswer,
  tiktokErrorCodeOf,
} from "#shared/infrastructure/platforms/tiktok-api.ts";

import { queryCreator } from "./tiktok-creator-info.ts";
import type { TikTokHttp } from "./tiktok-creator-info.ts";
import {
  cappedFor,
  processingFailure,
  tiktokRefusal,
} from "./tiktok-refusal.ts";
import type { TikTokCall, TikTokRefusal } from "./tiktok-refusal.ts";

export interface TikTokClientOptions {
  /** For API calls. */
  readonly api: TikTokHttp;
  /** The API's origin: `https://open.tiktokapis.com`, or a fake's in tests. */
  readonly apiUrl: URL;
  /**
   * The URL prefix the operator verified for the app at TikTok, under which
   * the media store serves files (`TIKTOK_MEDIA_URL_PREFIX`): TikTok then
   * pulls videos from it, and photos, which it only pulls. None, or a
   * media URL outside it: videos go up in chunks, photos cannot go out.
   */
  readonly pullFrom: Option.Option<URL>;
  readonly timing?: StepTiming;
  /** For media uploads, which take longer. */
  readonly uploads: TikTokHttp;
}

// Chunks of 10 MB, as TikTok's own example: each between its 5 MB floor
// and 64 MB ceiling, the last one up to twice as large (its ceiling is
// 128 MB), and a 1 GiB video in 107 of them, short of its 1,000.
const chunkSize = 10_000_000;

/** How a video of `size` bytes goes up: TikTok's `source_info` figures. */
export const chunkPlanOf = (size: number) => {
  const count = Math.max(1, Math.floor(size / chunkSize));

  return {
    chunkSize: size <= chunkSize ? size : chunkSize,
    count,
    lastSize: size - chunkSize * (count - 1),
  };
};

// A chunk TikTok did not answer is sent again, twice at most, as TikTok
// asks ("You should retry submitting this chunk"), a second apart.
const chunkTries = 3;

const chunkPause = Duration.seconds(1);

// A step recorded after the request it follows, as the publish_id TikTok
// gave: the post goes on if the journal cannot keep it, after a few tries.
const recordRetry = {
  schedule: Schedule.exponential("200 millis"),
  times: 3,
};

// How long TikTok takes media from Peal's store: their URLs last this
// long, past TikTok's one-hour download.
const pullUrlLifetime = Duration.hours(2);

// The first wait before looking at a post's status, doubling up to the
// timing's longest.
const firstPoll = Duration.seconds(3);

// A public post's id comes once TikTok's moderation passed it, usually
// within a minute of its publishing: this long is waited for it.
const idWait = Duration.minutes(2);

const tiktokPublicPost = (
  kind: PostKind,
  id: string,
  username: Option.Option<string>
): Published => ({
  _tag: "published",
  ...Option.match(username, {
    onNone: () => ({}),
    onSome: (name) => ({
      permalink: `https://www.tiktok.com/@${encodeURIComponent(name)}/${kind}/${encodeURIComponent(id)}`,
    }),
  }),
  platformPostId: PlatformPostIdSchema.make(id),
});

// A post TikTok published without an id anyone sees, as one only its
// creator sees: it is known by its publish_id.
const privatePost = (publishId: string): Published => ({
  _tag: "published",
  platformPostId: PlatformPostIdSchema.make(publishId),
});

/** What a post of TikTok's shows: one video, or photos. */
type PostKind = "photo" | "video";

/**
 * How far a TikTok call got, as the journal keeps it (persisted contract:
 * add members, never rename or remove one):
 *
 * - `pulling`: a PULL_FROM_URL init is about to go, which makes the post
 *   live once TikTok has the media. No answer: whether it went is unknown.
 * - `pulled`: TikTok took it, under `publishId`.
 * - `uploading`: a FILE_UPLOAD began under `publishId`; nothing goes live
 *   until its last chunk is up.
 * - `finishing`: the last chunk is about to go, after which TikTok
 *   publishes on its own.
 */
export const TikTokProgressSchema = Schema.Union([
  Schema.TaggedStruct("pulling", { kind: Schema.Literals(["photo", "video"]) }),
  Schema.TaggedStruct("pulled", {
    kind: Schema.Literals(["photo", "video"]),
    publishId: Schema.NonEmptyString,
  }),
  Schema.TaggedStruct("uploading", { publishId: Schema.NonEmptyString }),
  Schema.TaggedStruct("finishing", { publishId: Schema.NonEmptyString }),
]);

export type TikTokProgress = typeof TikTokProgressSchema.Type;

const ProgressJson = Schema.toCodecJson(TikTokProgressSchema);

const encodeProgress = Schema.encodeEffect(ProgressJson);

const decodeProgress = Schema.decodeUnknownOption(ProgressJson);

const InitSchema = tiktokAnswer(
  Schema.Struct({
    publish_id: Schema.NonEmptyString,
    upload_url: Schema.optionalKey(Schema.String),
  })
);

const StatusSchema = tiktokAnswer(
  Schema.Struct({
    fail_reason: Schema.optionalKey(Schema.String),
    status: Schema.String,
  })
);

// The ids of a published post, as the status lists them: int64s, which a
// JSON number does not hold exactly, so they are read from the text.
const postIdList = /"publicaly_available_post_id"\s*:\s*\[(?<ids>[^\]]*)\]/u;

const postIdsIn = (body: string): readonly string[] =>
  Array.from(
    (postIdList.exec(body)?.groups?.["ids"] ?? "").matchAll(/\d+/gu),
    ([id]) => id
  );

/** What sending a chunk came to. */
type ChunkAnswer =
  | { readonly _tag: "taken" }
  // TikTok answered that it would not take it: nothing goes live.
  | { readonly _tag: "refused"; readonly failure: PublishFailure }
  // No answer that says: TikTok may have taken it.
  | { readonly _tag: "unanswered" };

const taken: ChunkAnswer = { _tag: "taken" };

const chunkUnanswered: ChunkAnswer = { _tag: "unanswered" };

// What a refused chunk means: one TikTok could not read, or an upload it
// no longer has (its URL lasts an hour) or that went out of step. The
// upload starts over in a later attempt.
const chunkRefusal = (status: number): ChunkAnswer => ({
  _tag: "refused",
  failure:
    status === 400
      ? new MediaRejected({ code: "invalid_file_upload" })
      : new PlatformUnavailable(),
});

/** What sending a pulled post's init came to. */
type PullAnswer =
  | { readonly _tag: "sent"; readonly publishId: Option.Option<string> }
  | { readonly _tag: "unknown"; readonly reason: UnconfirmedReason };

/** Where a post TikTok is processing stands. */
type Status =
  | { readonly _tag: "processing" }
  | {
      readonly _tag: "complete";
      readonly postIds: readonly string[];
    }
  | { readonly _tag: "failed"; readonly failure: PublishFailure };

const isSuccess = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

// Reading an answer's body fails with these.
type AnswerError = HttpClientError.HttpClientError | Schema.SchemaError;

const answerOf =
  <A, I>(call: TikTokCall, schema: Schema.Codec<A, I>) =>
  (
    response: HttpClientResponse.HttpClientResponse
  ): Effect.Effect<A, AnswerError | TikTokRefusal> =>
    tiktokErrorCodeOf(response).pipe(
      Effect.flatMap((code): Effect.Effect<A, AnswerError | TikTokRefusal> =>
        isSuccess(response) && Option.contains(code, "ok")
          ? HttpClientResponse.schemaBodyJson(schema)(response)
          : tiktokRefusal(call, response)
      )
    );

// A call without a usable answer: the post may be live after one that
// makes it so; after any other, nothing anyone sees happened.
const unreadable =
  (call: TikTokCall) =>
  (
    error: Parameters<typeof unanswered>[0]
  ): Effect.Effect<never, BadRequest | OutcomeUnknown | PlatformUnavailable> =>
    call === "post" ? commitUnanswered(error) : unanswered(error);

const mediaTypes: ReadonlySet<string> = new Set([
  "video/mp4",
  "video/quicktime",
]);

const photoTypes: ReadonlySet<string> = new Set(["image/jpeg", "image/webp"]);

// What TikTok takes of the post's media: one video, or photos.
const kindOf = (
  described: readonly PublishableMedia[]
): Effect.Effect<PostKind, BadRequest | MediaRejected> => {
  const videos = described.filter(({ kind }) => kind === "video");

  if (described.length === 0) {
    return Effect.fail(new BadRequest({ code: "mediaRequired" }));
  }

  if (videos.length > 0 && described.length > 1) {
    return Effect.fail(new MediaRejected({ code: "mixedMedia" }));
  }

  if (videos.length === 1) {
    return mediaTypes.has(videos[0]?.contentType ?? "")
      ? Effect.succeed("video")
      : Effect.fail(new MediaRejected({ code: "file_format_check_failed" }));
  }

  return described.every(({ contentType }) => photoTypes.has(contentType))
    ? Effect.succeed("photo")
    : Effect.fail(new MediaRejected({ code: "file_format_check_failed" }));
};

// Whether TikTok may pull `url`: under the prefix verified for the app.
const isUnder = (prefix: Option.Option<URL>, url: string) =>
  Option.exists(prefix, (verified) => url.startsWith(verified.href));

const logged = (post: OutgoingPost) =>
  Effect.annotateLogs({ channelId: post.channelId, platform: "tiktok" });

type Json = typeof Schema.Json.Type;

/** A request body TikTok takes, as JSON. */
interface JsonBody {
  readonly [field: string]: Json;
}

// The post's text on TikTok: a video's caption, or a photo post's
// description (its title, of 90 characters, is left out).
const textFields = (post: OutgoingPost, kind: PostKind): JsonBody => {
  if (post.text.trim() === "") {
    return {};
  }

  return kind === "video" ? { title: post.text } : { description: post.text };
};

/**
 * What the post says on TikTok besides its media: the audience the
 * creator chose, interactions off unless they turned them on (and off
 * whatever they chose where their settings turn them off), and the
 * disclosures, which only commercial content makes.
 */
const postInfo = (
  post: OutgoingPost,
  kind: PostKind,
  chosen: TikTokOptions,
  creator: TikTokCreator,
  privacyLevel: TikTokPrivacyLevel
): JsonBody => {
  const commercial = chosen.commercialContent === true;

  const comments = {
    disable_comment: chosen.disableComment !== false || creator.commentDisabled,
  };

  const interactions: JsonBody =
    kind === "video"
      ? {
          ...comments,
          disable_duet: chosen.disableDuet !== false || creator.duetDisabled,
          disable_stitch:
            chosen.disableStitch !== false || creator.stitchDisabled,
          is_aigc: chosen.aiGenerated === true,
        }
      : comments;

  return {
    ...textFields(post, kind),
    ...interactions,
    brand_content_toggle: commercial && chosen.brandContent === true,
    brand_organic_toggle: commercial && chosen.brandOrganic === true,
    privacy_level: privacyLevel,
  };
};

// The post's TikTok options, which scheduling made sure it has.
const optionsOf = (
  post: OutgoingPost
): Effect.Effect<TikTokOptions, BadRequest> =>
  post.options.pipe(
    Option.filter(Schema.is(TikTokOptions)),
    Option.match({
      onNone: () => Effect.fail(new BadRequest({ code: "optionsMissing" })),
      onSome: (chosen) => Effect.succeed(chosen),
    })
  );

/**
 * Publishes on TikTok with the Content Posting API's direct post, as the
 * creator chose in the post's TikTok options:
 *
 * 1. Reads the creator's settings (creator info), and refuses what they
 *    forbid now: an audience the account no longer offers, a video longer
 *    than they may post, or a creator who cannot post today.
 * 2. A video goes up in 10 MB chunks streamed from the media store
 *    (FILE_UPLOAD), or, when the store serves it under the URL prefix
 *    verified for the app, TikTok pulls it (PULL_FROM_URL), as its
 *    guidelines prefer for media already on a server. Photos, up to 35,
 *    TikTok only pulls (content/init).
 * 3. Polls the post's status until TikTok publishes it
 *    (PUBLISH_COMPLETE) or fails it, whose `fail_reason` is the refusal.
 *
 * TikTok keeps no idempotency key, and nothing finds a post by what Peal
 * sent, so every step that can make the post live is journaled first
 * (PublicationProgress), and the `publish_id` as soon as TikTok gives it. A
 * resumed run polls the journaled `publish_id`; one whose PULL_FROM_URL
 * init went without an answer is unconfirmed, never sent again. A
 * FILE_UPLOAD goes live only once its last chunk is up, so a run stopped
 * before that starts over, harmlessly.
 */
export const tiktokClient = Effect.fn("TikTokClient.make")(
  function* tiktokClient(options: TikTokClientOptions) {
    const credentials = yield* PlatformCredentials;
    const media = yield* MediaForPublishing;
    const progress = yield* PublicationProgress;
    const { api, apiUrl, pullFrom, uploads } = options;
    const timing = options.timing ?? defaultStepTiming;
    const readCreator = queryCreator({ api, apiUrl });

    // A call with the channel's token, renewed once if refused.
    const call = <A, I>(
      post: OutgoingPost,
      kind: TikTokCall,
      request: (
        token: Redacted.Redacted
      ) => HttpClientRequest.HttpClientRequest,
      schema: Schema.Codec<A, I>
    ) =>
      credentials.withToken(post.channelId, ({ accessToken }) =>
        api.execute(request(accessToken)).pipe(
          Effect.flatMap((response) =>
            answerOf(
              kind,
              schema
            )(response).pipe(
              Effect.flatMap((answer) =>
                response.text.pipe(Effect.map((text) => ({ answer, text })))
              ),
              Effect.catchTags({
                HttpClientError: unreadable(kind),
                SchemaError: unreadable(kind),
              })
            )
          ),
          Effect.catchTags({
            HttpClientError: unreadable(kind),
            OutboundRequestRefused: unreadable(kind),
          })
        )
      );

    const apiPost =
      (path: string, body: JsonBody) => (token: Redacted.Redacted) =>
        HttpClientRequest.post(new URL(path, apiUrl)).pipe(
          HttpClientRequest.bearerToken(token),
          HttpClientRequest.bodyJsonUnsafe(body)
        );

    // Notes a step before the request it stands for: when the journal
    // cannot keep it, the request is not sent.
    const noteBefore = (post: OutgoingPost, step: TikTokProgress) =>
      encodeProgress(step).pipe(
        Effect.orDie,
        Effect.flatMap((json) => progress.record(post.idempotencyKey, json)),
        Effect.catchTag("DatabaseError", (failure) =>
          Effect.logWarning(
            "Could not journal a TikTok step: nothing was sent",
            failure
          ).pipe(
            logged(post),
            Effect.andThen(Effect.fail(new PlatformUnavailable()))
          )
        )
      );

    // Notes what TikTok answered, as its publish_id: the post goes on if
    // the journal cannot keep it.
    const noteAfter = (post: OutgoingPost, step: TikTokProgress) =>
      encodeProgress(step).pipe(
        Effect.orDie,
        Effect.flatMap((json) => progress.record(post.idempotencyKey, json)),
        Effect.retry(recordRetry),
        Effect.catchTag("DatabaseError", (failure) =>
          Effect.logWarning(
            "Could not journal a TikTok publish_id",
            failure
          ).pipe(logged(post))
        )
      );

    const creatorFor = (post: OutgoingPost) =>
      credentials.withToken(post.channelId, ({ accessToken }) =>
        readCreator(accessToken)
      );

    // The creator, if they can post as the options say now.
    const readyCreator = Effect.fn("TikTokClient.creator")(function* ready(
      post: OutgoingPost,
      chosen: TikTokOptions,
      described: readonly PublishableMedia[]
    ) {
      const posting = yield* creatorFor(post);

      if (posting._tag === "blocked") {
        yield* Effect.logWarning("A TikTok creator cannot post now").pipe(
          logged(post),
          Effect.annotateLogs({ reason: posting.reason })
        );

        return yield* posting.reason === "banned"
          ? new BadRequest({ code: "spam_risk_user_banned_from_posting" })
          : cappedFor();
      }

      const { creator } = posting;

      const { privacyLevel } = chosen;

      if (
        privacyLevel === undefined ||
        !creator.privacyLevels.includes(privacyLevel)
      ) {
        return yield* new BadRequest({ code: "privacy_level_option_mismatch" });
      }

      // In whole milliseconds, as scheduling compared them.
      const tooLong = described.some(({ duration }) =>
        Option.exists(
          Option.all([duration, creator.maxVideoDuration]),
          ([length, maximum]) =>
            Math.round(Duration.toMillis(length)) >
            Math.round(Duration.toMillis(maximum))
        )
      );

      if (tooLong) {
        return yield* new MediaRejected({ code: "duration_check_failed" });
      }

      return { creator, privacyLevel };
    });

    // Looks at the post's status once.
    const statusOf = (post: OutgoingPost, publishId: string) =>
      call(
        post,
        "read",
        apiPost("/v2/post/publish/status/fetch/", { publish_id: publishId }),
        StatusSchema
      ).pipe(
        Effect.map(({ answer, text }): Status => {
          const status = answer.data?.status ?? "";

          if (status === "PUBLISH_COMPLETE") {
            return { _tag: "complete", postIds: postIdsIn(text) };
          }

          if (status === "FAILED") {
            return {
              _tag: "failed",
              failure: processingFailure(
                Option.fromUndefinedOr(answer.data?.fail_reason)
              ),
            };
          }

          return { _tag: "processing" };
        })
      );

    // Waits until TikTok published the post or failed it. Whatever else a
    // look finds, the post may be live: it ends unconfirmed past the
    // processing limit, never refused.
    const awaitPublished = Effect.fn("TikTokClient.awaitPublished")(
      function* awaitPublished(
        post: OutgoingPost,
        publishId: string,
        kind: PostKind,
        username: Option.Option<string>,
        reason: UnconfirmedReason
      ) {
        const chosen = post.options.pipe(
          Option.filter(Schema.is(TikTokOptions))
        );

        const onlyMe = Option.exists(
          chosen,
          ({ privacyLevel }) => privacyLevel === "SELF_ONLY"
        );

        let wait = firstPoll;
        let waited = Duration.zero;
        let completedFor = Option.none<Duration.Duration>();

        while (Duration.isLessThanOrEqualTo(waited, timing.processingLimit)) {
          yield* Effect.sleep(Duration.min(wait, timing.longestPoll));
          waited = Duration.sum(waited, wait);
          wait = Duration.min(Duration.times(wait, 2), Duration.minutes(1));

          const looked = yield* statusOf(post, publishId).pipe(Effect.result);

          if (looked._tag === "Failure") {
            // Not answered, refused, or slowed down: look again later.
            continue;
          }

          const status = looked.success;

          if (status._tag === "failed") {
            yield* Effect.logWarning("TikTok failed a post").pipe(
              logged(post),
              Effect.annotateLogs({ failure: status.failure._tag })
            );

            return yield* status.failure;
          }

          if (status._tag === "complete") {
            const [id] = status.postIds;

            if (id !== undefined) {
              return tiktokPublicPost(kind, id, username);
            }

            // A public post's id waits on moderation: a while, not hours.
            const now = waited;
            const since = Option.getOrElse(completedFor, () => now);

            completedFor = Option.some(since);

            if (
              onlyMe ||
              Duration.isGreaterThan(Duration.subtract(waited, since), idWait)
            ) {
              return privatePost(publishId);
            }
          }
        }

        if (Option.isSome(completedFor)) {
          return privatePost(publishId);
        }

        yield* Effect.logWarning(
          "TikTok did not finish publishing a post in time"
        ).pipe(logged(post));

        const unconfirmed: PublishResult = { _tag: "unconfirmed", reason };

        return unconfirmed;
      }
    );

    // Sends one chunk, again while TikTok does not answer, `tries` times
    // at most.
    const putChunk = (
      uploadUrl: string,
      described: PublishableMedia,
      bytes: Uint8Array,
      first: number,
      tries: number = chunkTries
    ): Effect.Effect<ChunkAnswer> =>
      uploads
        .execute(
          HttpClientRequest.put(uploadUrl).pipe(
            HttpClientRequest.setHeader(
              "content-range",
              `bytes ${first}-${first + bytes.length - 1}/${described.byteSize}`
            ),
            HttpClientRequest.bodyUint8Array(bytes, described.contentType)
          )
        )
        .pipe(
          Effect.map((response) => {
            if (isSuccess(response)) {
              return taken;
            }

            return response.status >= 500
              ? chunkUnanswered
              : chunkRefusal(response.status);
          }),
          Effect.orElseSucceed(() => chunkUnanswered),
          Effect.flatMap((answer) =>
            answer._tag === "unanswered" && tries > 1
              ? Effect.sleep(Duration.min(chunkPause, timing.longestPoll)).pipe(
                  Effect.andThen(
                    putChunk(uploadUrl, described, bytes, first, tries - 1)
                  )
                )
              : Effect.succeed(answer)
          )
        );

    // The last chunk: refused on its first try, nothing goes live. Sent
    // without an answer, TikTok may publish, which only its status tells.
    const putLastChunk = (
      uploadUrl: string,
      described: PublishableMedia,
      bytes: Uint8Array,
      first: number
    ) =>
      putChunk(uploadUrl, described, bytes, first, 1).pipe(
        Effect.flatMap((answer): Effect.Effect<void, PublishFailure> =>
          Match.valueTags(answer, {
            refused: ({ failure }) => Effect.fail(failure),
            taken: () => Effect.void,
            unanswered: () =>
              putChunk(uploadUrl, described, bytes, first, chunkTries - 1).pipe(
                Effect.asVoid
              ),
          })
        )
      );

    // A video up in chunks, then TikTok's processing.
    const uploadVideo = Effect.fn("TikTokClient.uploadVideo")(
      function* uploadVideo(
        post: OutgoingPost,
        info: JsonBody,
        described: PublishableMedia,
        creator: TikTokCreator
      ) {
        const plan = chunkPlanOf(described.byteSize);

        const { answer } = yield* call(
          post,
          "upload",
          apiPost("/v2/post/publish/video/init/", {
            post_info: info,
            source_info: {
              chunk_size: plan.chunkSize,
              source: "FILE_UPLOAD",
              total_chunk_count: plan.count,
              video_size: described.byteSize,
            },
          }),
          InitSchema
        );

        const publishId = answer.data?.publish_id;
        const uploadUrl = answer.data?.upload_url;

        if (publishId === undefined || uploadUrl === undefined) {
          return yield* new PlatformUnavailable();
        }

        yield* noteAfter(post, { _tag: "uploading", publishId });

        const last = plan.count - 1;

        // Each chunk but the last, in turn; the last one is kept. A store
        // that sends more bytes than the file has stops the upload before
        // its last chunk, as one that sends fewer does below.
        const lastChunk = yield* media
          .open(post.workspaceId, described.mediaId)
          .pipe(
            inParts((index) => (index < last ? plan.chunkSize : plan.lastSize)),
            Stream.zipWithIndex,
            Stream.mapEffect(([bytes, index]) =>
              index > last
                ? Effect.fail(new PlatformUnavailable())
                : Effect.succeed([bytes, index] as const)
            ),
            Stream.mapEffect(([bytes, index]) =>
              index < last
                ? putChunk(
                    uploadUrl,
                    described,
                    bytes,
                    index * plan.chunkSize
                  ).pipe(
                    Effect.flatMap((chunk) =>
                      Match.valueTags(chunk, {
                        refused: ({ failure }) => Effect.fail(failure),
                        taken: () => Effect.succeed(Option.none<Uint8Array>()),
                        unanswered: () =>
                          Effect.fail(new PlatformUnavailable()),
                      })
                    )
                  )
                : Effect.succeed(Option.some(bytes))
            ),
            Stream.runFold(
              () => Option.none<Uint8Array>(),
              (kept, chunk) => Option.orElse(chunk, () => kept)
            )
          );

        // The store sent fewer bytes than the file has: the last chunk would
        // not end the upload, nor match what TikTok was told.
        if (
          Option.isNone(lastChunk) ||
          lastChunk.value.length !== plan.lastSize
        ) {
          return yield* new PlatformUnavailable();
        }

        // From here on, TikTok may publish: only its status tells.
        yield* noteBefore(post, { _tag: "finishing", publishId });
        yield* putLastChunk(
          uploadUrl,
          described,
          lastChunk.value,
          last * plan.chunkSize
        );

        return yield* awaitPublished(
          post,
          publishId,
          "video",
          Option.some(creator.username).pipe(
            Option.filter((name) => name !== "")
          ),
          "noResponse"
        );
      }
    );

    // A post TikTok pulls, which goes live with its init.
    const pulled = Effect.fn("TikTokClient.pulled")(function* pulled(
      post: OutgoingPost,
      kind: PostKind,
      path: string,
      body: JsonBody,
      creator: TikTokCreator
    ) {
      yield* noteBefore(post, { _tag: "pulling", kind });

      const sent = yield* call(
        post,
        "post",
        apiPost(path, body),
        InitSchema
      ).pipe(
        Effect.map(({ answer }): PullAnswer => ({
          _tag: "sent",
          publishId: Option.fromUndefinedOr(answer.data?.publish_id),
        })),
        Effect.catchTag("OutcomeUnknown", ({ reason }) =>
          Effect.succeed<PullAnswer>({ _tag: "unknown", reason })
        )
      );

      const publishId =
        sent._tag === "sent"
          ? Option.getOrUndefined(sent.publishId)
          : undefined;

      if (publishId === undefined) {
        yield* Effect.logWarning(
          "TikTok did not answer a post it may have taken"
        ).pipe(logged(post));

        const unconfirmed: PublishResult = {
          _tag: "unconfirmed",
          reason: sent._tag === "unknown" ? sent.reason : "unreadableResponse",
        };

        return unconfirmed;
      }

      yield* noteAfter(post, { _tag: "pulled", kind, publishId });

      return yield* awaitPublished(
        post,
        publishId,
        kind,
        Option.some(creator.username).pipe(
          Option.filter((name) => name !== "")
        ),
        "noResponse"
      );
    });

    // The media's address TikTok may pull, if the store serves it under the
    // verified prefix.
    const pullUrlOf = (post: OutgoingPost, described: PublishableMedia) =>
      Option.isNone(pullFrom)
        ? Effect.succeed(Option.none<string>())
        : media
            .publicUrl(post.workspaceId, described.mediaId, pullUrlLifetime)
            .pipe(
              Effect.map((url) =>
                isUnder(pullFrom, url) ? Option.some(url) : Option.none()
              )
            );

    const publishWith = Effect.fn("TikTokClient.publishWith")(
      function* publishWith(post: OutgoingPost, chosen: TikTokOptions) {
        const described = yield* Effect.forEach(
          post.media,
          ({ mediaId }) => media.describe(post.workspaceId, mediaId),
          { concurrency: 1 }
        );

        const kind = yield* kindOf(described);

        const { creator, privacyLevel } = yield* readyCreator(
          post,
          chosen,
          described
        );

        const info = postInfo(post, kind, chosen, creator, privacyLevel);

        if (kind === "photo") {
          const urls = yield* Effect.all(
            described.map((photo) => pullUrlOf(post, photo))
          );

          const photos = urls.flatMap((url) => Option.toArray(url));

          if (photos.length !== described.length) {
            yield* Effect.logError(
              "TikTok takes photos only from a verified address: set TIKTOK_MEDIA_URL_PREFIX to the media store's public URL, verified for the app"
            ).pipe(logged(post));

            return yield* new BadRequest({ code: "url_ownership_unverified" });
          }

          return yield* pulled(
            post,
            "photo",
            "/v2/post/publish/content/init/",
            {
              is_aigc: chosen.aiGenerated === true,
              media_type: "PHOTO",
              post_info: info,
              post_mode: "DIRECT_POST",
              source_info: {
                photo_cover_index: 0,
                photo_images: photos,
                source: "PULL_FROM_URL",
              },
            },
            creator
          );
        }

        const [video] = described;

        if (video === undefined) {
          return yield* new BadRequest({ code: "mediaRequired" });
        }

        const pullUrl = yield* pullUrlOf(post, video);

        return yield* Option.match(pullUrl, {
          onNone: () => uploadVideo(post, info, video, creator),
          onSome: (url) =>
            pulled(
              post,
              "video",
              "/v2/post/publish/video/init/",
              {
                post_info: info,
                source_info: { source: "PULL_FROM_URL", video_url: url },
              },
              creator
            ),
        });
      }
    );

    const publish = (post: OutgoingPost) =>
      optionsOf(post).pipe(
        Effect.flatMap((chosen) => publishWith(post, chosen)),
        Effect.catchTag("OutcomeUnknown", ({ reason }) =>
          Effect.succeed<PublishResult>({ _tag: "unconfirmed", reason })
        ),
        Effect.withSpan("Publishing.tiktok.publish")
      );

    const interrupted: PublishResult = {
      _tag: "unconfirmed",
      reason: "interrupted",
    };

    // The username for a published post's address, if TikTok tells it.
    const usernameFor = (post: OutgoingPost) =>
      creatorFor(post).pipe(
        Effect.map((posting) =>
          posting._tag === "ready" && posting.creator.username !== ""
            ? Option.some(posting.creator.username)
            : Option.none<string>()
        ),
        Effect.orElseSucceed(() => Option.none<string>())
      );

    // Carries on from what the earlier run journaled.
    const resumeFrom = (
      post: OutgoingPost,
      step: Option.Option<TikTokProgress>
    ): Effect.Effect<PublishResult, PublishFailure> =>
      Option.match(step, {
        // Nothing that can make the post live was sent.
        onNone: () => publish(post),
        onSome: (recorded) =>
          Match.valueTags(recorded, {
            finishing: ({ publishId }) =>
              usernameFor(post).pipe(
                Effect.flatMap((username) =>
                  awaitPublished(
                    post,
                    publishId,
                    "video",
                    username,
                    "interrupted"
                  )
                )
              ),
            pulled: ({ kind, publishId }) =>
              usernameFor(post).pipe(
                Effect.flatMap((username) =>
                  awaitPublished(post, publishId, kind, username, "interrupted")
                )
              ),
            // Its answer was lost: TikTok finds no post by what Peal sent.
            pulling: () => Effect.succeed(interrupted),
            // Its last chunk never went: nothing goes live.
            uploading: () => publish(post),
          }),
      });

    const resume = (post: OutgoingPost) =>
      progress.read(post.idempotencyKey).pipe(
        Effect.matchEffect({
          onFailure: () => Effect.succeed(interrupted),
          onSuccess: (found) => {
            if (found._tag === "unknownCall") {
              return Effect.succeed(interrupted);
            }

            const step = found.recorded.pipe(Option.flatMap(decodeProgress));

            // Something the journal holds that this release cannot read.
            if (Option.isSome(found.recorded) && Option.isNone(step)) {
              return Effect.succeed(interrupted);
            }

            return resumeFrom(post, step);
          },
        }),
        Effect.withSpan("Publishing.tiktok.resume")
      );

    const client: PlatformClient = { platform: "tiktok", publish, resume };

    return client;
  }
);
