import {
  DateTime,
  Duration,
  Effect,
  Option,
  Ref,
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
import { PlatformQuota } from "#publishing/application/platform-quota.ts";
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
import { UploadSessions } from "#publishing/application/upload-sessions.ts";
import type { UploadSession } from "#publishing/application/upload-sessions.ts";
import { dailyLimitCodes } from "#publishing/domain/own-refusals.ts";
import {
  maxYouTubeThumbnailByteSize,
  YouTubeOptions,
  youTubeThumbnailTypes,
} from "#publishing/domain/youtube-options.ts";
import {
  fromByte,
  inParts,
} from "#publishing/infrastructure/platforms/byte-parts.ts";
import { withFirstComments } from "#publishing/infrastructure/platforms/first-comment.ts";
import {
  codeOf,
  unanswered,
} from "#publishing/infrastructure/platforms/platform-exchange.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { Published } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { googleReasonOf } from "#shared/infrastructure/platforms/google-refusal.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { streamedBody } from "#shared/infrastructure/platforms/public-http.ts";
import {
  quotaDayOf,
  untilQuotaReset,
} from "#shared/infrastructure/platforms/youtube-quota-day.ts";

import { youtubeCommentCalls } from "./youtube-first-comment.ts";
import { refusalOf } from "./youtube-refusal.ts";
import type { Refused } from "./youtube-refusal.ts";
import { defaultDailyThumbnails } from "./youtube-settings.ts";

/** The HTTP client the adapter sends through: the public one. */
export type YouTubeHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

export interface YouTubeClientOptions {
  /** For API calls. */
  readonly api: YouTubeHttp;
  /** The API's origin: `https://www.googleapis.com`, or a fake's in tests. */
  readonly apiUrl: URL;
  /** The bytes of each part but the last: a multiple of 256 KiB. */
  readonly chunkSize?: number;
  /** The custom thumbnails the server sets a day (`thumbnailsBucket`). */
  readonly dailyThumbnails?: number;
  /** The units of the Video Uploads quota bucket the server spends a day. */
  readonly dailyUploads: number;
  readonly timing?: StepTiming;
  /** For the video's bytes, which take longer. */
  readonly uploads: YouTubeHttp;
}

/** The quota bucket videos.insert is charged to, one unit a call. */
export const uploadsBucket = "youtube.videoUploads";

/**
 * The server's own ledger of thumbnails.set, one unit a thumbnail, by
 * Pacific day: each call costs about 50 units of the project's general
 * quota, which Peal does not count otherwise.
 */
export const thumbnailsBucket = "thumbnails:youtube";

const kibibytes256 = 256 * 1024;

// 8 MiB: large parts upload faster, and one at a time stays in memory.
const defaultChunkSize = 32 * kibibytes256;

// The first wait for a video's processing, doubled up to `longestPoll`.
const firstPoll = Duration.seconds(5);

// How many times one run resumes an interrupted upload before giving up.
const maxResumes = 8;

const videoTypes: ReadonlySet<string> = new Set([
  "video/mp4",
  "video/quicktime",
]);

const VideoSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  status: Schema.optionalKey(
    Schema.Struct({
      failureReason: Schema.optionalKey(Schema.String),
      privacyStatus: Schema.optionalKey(Schema.String),
      rejectionReason: Schema.optionalKey(Schema.String),
      uploadStatus: Schema.optionalKey(Schema.String),
    })
  ),
});

type Video = typeof VideoSchema.Type;

const VideosSchema = Schema.Struct({
  items: Schema.optionalKey(Schema.Array(VideoSchema)),
});

const videoOf = HttpClientResponse.schemaBodyJson(VideoSchema);

const videosOf = HttpClientResponse.schemaBodyJson(VideosSchema);

/** What a post needs before its bytes go: its options and its video. */
interface Prepared {
  readonly options: YouTubeOptions;
  readonly video: PublishableMedia;
}

// Where an upload stands, as YouTube answers about its session.
type Standing =
  | { readonly _tag: "incomplete"; readonly next: number }
  | { readonly _tag: "made"; readonly video: Video }
  | { readonly _tag: "expired" }
  | { readonly _tag: "refused"; readonly refused: Refused }
  | { readonly _tag: "unknown" };

const unknown: Standing = { _tag: "unknown" };

const expired: Standing = { _tag: "expired" };

const incomplete = (next: number): Standing => ({ _tag: "incomplete", next });

const rangePattern = /^bytes=0-(?<last>\d+)$/u;

// The next byte YouTube waits for, from a 308's `Range`: none received
// when it has none.
const nextByteOf = (response: HttpClientResponse.HttpClientResponse) =>
  Headers.get(response.headers, "range").pipe(
    Option.flatMapNullishOr(
      (range) => rangePattern.exec(range.trim())?.groups?.["last"]
    ),
    Option.map((last) => Number(last) + 1),
    Option.getOrElse(() => 0)
  );

const isMade = (status: number) => status === 200 || status === 201;

// A refusal of the upload itself, rather than of the moment (a rate limit,
// a quota, an outage): the session's own last word.
const isDecisive = (failure: Refused["failure"]) =>
  failure._tag === "BadRequest" || failure._tag === "MediaRejected";

const isGone = (status: number) => status === 404 || status === 410;

// Whether YouTube made the video private, although asked for more.
const keptPrivateOf = (
  privacy: string | undefined,
  options: Option.Option<YouTubeOptions>
): boolean =>
  privacy === "private" &&
  Option.exists(
    options,
    (chosen) => (chosen.privacy ?? "public") !== "private"
  );

const publishedAs = (
  video: Video,
  options: Option.Option<YouTubeOptions>,
  privacy = video.status?.privacyStatus
): Published => {
  const live: Published = {
    _tag: "published",
    permalink: `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`,
    platformPostId: PlatformPostIdSchema.make(video.id),
  };

  return keptPrivateOf(privacy, options)
    ? { ...live, keptPrivate: true }
    : live;
};

// The journal not answering: nothing more is sent for now.
const journalDown = (error: DatabaseError) =>
  Effect.logWarning("An upload's journal could not be written", error).pipe(
    Effect.andThen(Effect.fail(new PlatformUnavailable()))
  );

const journaled = <A, R>(effect: Effect.Effect<A, DatabaseError, R>) =>
  effect.pipe(Effect.catch(journalDown));

// The video exists whatever the journal says: a resumed run asks the
// session.
const unrecorded = (error: DatabaseError) =>
  Effect.logWarning("An uploaded video could not be journaled", error);

const authorized = (
  request: HttpClientRequest.HttpClientRequest,
  token: Redacted.Redacted
) => request.pipe(HttpClientRequest.bearerToken(token));

// The upload got lost: the video may exist once its last part left.
const lost = (finalSent: Ref.Ref<boolean>) =>
  Ref.get(finalSent).pipe(
    Effect.flatMap(
      (sent): Effect.Effect<never, OutcomeUnknown | PlatformUnavailable> =>
        sent
          ? Effect.fail(new OutcomeUnknown({ reason: "noResponse" }))
          : Effect.fail(new PlatformUnavailable())
    )
  );

// YouTube refused the video once processed: rejected for its length (a
// channel Google has not verified takes 15 minutes), or for its content
// (a duplicate, a copyright claim, the terms of use…).
const rejectionOf = (reason: string | undefined) =>
  reason === "length"
    ? new MediaRejected({ code: "length" })
    : new BadRequest({
        code: codeOf(Option.fromUndefinedOr(reason), "rejected"),
      });

const youtubeOptionsOf = (post: OutgoingPost) =>
  post.options.pipe(Option.filter(Schema.is(YouTubeOptions)));

// The image types thumbnails.set takes, of those the library stores.
const thumbnailTypes: ReadonlySet<string> = new Set(youTubeThumbnailTypes);

// What videos.insert is given of the options: each field only when it was
// chosen, so a video without them is sent as before. The parts named are
// those the metadata holds.
const metadataOf = (post: OutgoingPost, chosen: YouTubeOptions) => {
  const snippet = new Map<string, unknown>([
    ["description", post.text],
    ["title", chosen.title ?? ""],
  ]);

  if (chosen.categoryId !== undefined) {
    snippet.set("categoryId", chosen.categoryId);
  }

  if (chosen.defaultLanguage !== undefined) {
    snippet.set("defaultLanguage", chosen.defaultLanguage);
  }

  if (chosen.tags !== undefined && chosen.tags.length > 0) {
    snippet.set("tags", chosen.tags);
  }

  const status = new Map<string, unknown>([
    ["containsSyntheticMedia", chosen.containsSyntheticMedia ?? false],
    ["privacyStatus", chosen.privacy ?? "public"],
    ["selfDeclaredMadeForKids", chosen.madeForKids ?? false],
  ]);

  if (chosen.embeddable !== undefined) {
    status.set("embeddable", chosen.embeddable);
  }

  if (chosen.license !== undefined) {
    status.set("license", chosen.license);
  }

  if (chosen.publicStatsViewable !== undefined) {
    status.set("publicStatsViewable", chosen.publicStatsViewable);
  }

  const metadata = {
    snippet: Object.fromEntries(snippet),
    status: Object.fromEntries(status),
  };

  // The recording date is a datetime to YouTube (ISO 8601): the day's
  // start, in UTC.
  return chosen.recordingDate === undefined
    ? { metadata, parts: "snippet,status" }
    : {
        metadata: {
          ...metadata,
          recordingDetails: {
            recordingDate: `${chosen.recordingDate}T00:00:00.000Z`,
          },
        },
        parts: "snippet,status,recordingDetails",
      };
};

/**
 * Publishes a video on a YouTube channel with videos.insert: the post's
 * text is its description, and the target's YouTube options its title,
 * privacy (public unless chosen), made-for-kids answer, tags, category,
 * whether subscribers hear of it (yes unless chosen) and whether it holds
 * synthetic media (no unless chosen).
 *
 * The bytes go up through YouTube's resumable upload protocol, streamed
 * from the media store in parts of `chunkSize`, one in memory at a time.
 * The session YouTube opens is journaled (`UploadSessions`) and committed
 * before any byte is sent, and so is the moment the last part leaves: a
 * part that fails, or a run found in flight, asks the session where it
 * stands (a PUT of `Content-Range: bytes *\/size`), resumes from the byte it waits
 * for (308), or takes the video it made (200, 201). An expired session
 * (404) starts again only while no last part was ever sent. Once made, the
 * video's processing is polled to `processed`; `failed` and `rejected` end
 * the attempt with YouTube's reason; anything else leaves it published,
 * since the video exists.
 *
 * Each upload spends a unit of the server's Video Uploads quota first
 * (`PlatformQuota`, by Pacific day): past `dailyUploads`, or when YouTube
 * answers `quotaExceeded` or `uploadLimitExceeded`, the attempt waits for
 * the next Pacific midnight as a RateLimited with that code.
 */
export const youtubeClient = Effect.fn("YouTubeClient.make")(
  function* youtubeClient(options: YouTubeClientOptions) {
    const credentials = yield* PlatformCredentials;
    const media = yield* MediaForPublishing;
    const sessions = yield* UploadSessions;
    const quota = yield* PlatformQuota;
    const { api, apiUrl, dailyUploads, uploads } = options;
    const dailyThumbnails = options.dailyThumbnails ?? defaultDailyThumbnails;
    const timing = options.timing ?? defaultStepTiming;
    const chunkSize = options.chunkSize ?? defaultChunkSize;

    if (chunkSize <= 0 || chunkSize % kibibytes256 !== 0) {
      return yield* Effect.die("YouTube parts must be multiples of 256 KiB");
    }

    // The pause before asking a session again, shortened by the timing.
    const askAgain = Schedule.exponential(
      Duration.min(Duration.seconds(1), timing.longestPoll)
    );

    // A refusal, after counting the day's quota spent when YouTube said so.
    const refused = (refusal: Refused) =>
      (refusal.quotaSpent
        ? DateTime.now.pipe(
            Effect.flatMap((now) =>
              quota.exhaust({
                allowance: dailyUploads,
                bucket: uploadsBucket,
                day: quotaDayOf(now),
              })
            ),
            Effect.ignore
          )
        : Effect.void
      ).pipe(Effect.andThen(Effect.fail(refusal.failure)));

    // A refusal a session gave, outside any call with the token: a token
    // refused there was refused after renewing it already.
    const settled = (refusal: Refused) =>
      refused(
        refusal.failure._tag === "TokenRejected"
          ? { ...refusal, failure: new TokenExpired() }
          : refusal
      ).pipe(
        Effect.catchTag("TokenRejected", () => Effect.fail(new TokenExpired()))
      );

    // Upload sessions come in YouTube's answers: the token goes to Google's
    // own hosts only.
    const sessionUrlOf = (value: string): Effect.Effect<URL, BadRequest> => {
      const url = URL.parse(value);

      const google =
        url !== null &&
        (url.origin === apiUrl.origin ||
          (url.protocol === "https:" &&
            (url.hostname === "googleapis.com" ||
              url.hostname.endsWith(".googleapis.com"))));

      return google
        ? Effect.succeed(url)
        : Effect.fail(new BadRequest({ code: "uploadUrlNotAllowed" }));
    };

    // Asks the session where the upload stands. Never fails: a session
    // that cannot be asked, after a few tries, is `unknown`.
    const ask = (post: OutgoingPost, url: URL, size: number) =>
      credentials
        .withToken(post.channelId, ({ accessToken }) =>
          uploads
            .execute(
              authorized(
                HttpClientRequest.put(url).pipe(
                  HttpClientRequest.setHeader(
                    "content-range",
                    `bytes */${size}`
                  ),
                  HttpClientRequest.bodyUint8Array(
                    new Uint8Array(0),
                    "application/octet-stream"
                  )
                ),
                accessToken
              )
            )
            .pipe(
              Effect.flatMap((response) => {
                if (response.status === 308) {
                  return Effect.succeed(incomplete(nextByteOf(response)));
                }

                if (isMade(response.status)) {
                  return videoOf(response).pipe(
                    Effect.map((video): Standing => ({ _tag: "made", video })),
                    Effect.orElseSucceed(() => unknown)
                  );
                }

                if (isGone(response.status)) {
                  return Effect.succeed(expired);
                }

                if (response.status >= 500) {
                  return Effect.succeed(unknown);
                }

                return refusalOf(response).pipe(
                  Effect.flatMap((refusal) => {
                    if (refusal.failure._tag === "TokenRejected") {
                      return Effect.fail(refusal.failure);
                    }

                    // A rate limit on the question says nothing of the
                    // upload: only YouTube's word on the video settles it.
                    return Effect.succeed<Standing>(
                      isDecisive(refusal.failure)
                        ? { _tag: "refused", refused: refusal }
                        : unknown
                    );
                  })
                );
              }),
              Effect.catchTags({
                HttpClientError: () => Effect.succeed(unknown),
                OutboundRequestRefused: () => Effect.succeed(unknown),
              })
            )
        )
        .pipe(
          Effect.orElseSucceed(() => unknown),
          Effect.repeat({
            schedule: askAgain,
            times: 3,
            while: (standing) => standing._tag === "unknown",
          })
        );

    // Sends one part. A part YouTube did not answer, or failed on, makes
    // the run ask the session; a refusal of the part is YouTube's last
    // word on the upload.
    const sendPart = (
      post: OutgoingPost,
      url: URL,
      offset: number,
      bytes: Uint8Array,
      size: number
    ) =>
      credentials.withToken(post.channelId, ({ accessToken }) =>
        uploads
          .execute(
            authorized(
              HttpClientRequest.put(url).pipe(
                HttpClientRequest.setHeader(
                  "content-range",
                  `bytes ${offset}-${offset + bytes.length - 1}/${size}`
                ),
                HttpClientRequest.bodyUint8Array(
                  bytes,
                  "application/octet-stream"
                )
              ),
              accessToken
            )
          )
          .pipe(
            Effect.flatMap((response) => {
              if (response.status === 308) {
                return Effect.succeed(incomplete(nextByteOf(response)));
              }

              if (isMade(response.status)) {
                return videoOf(response).pipe(
                  Effect.map((video): Standing => ({ _tag: "made", video })),
                  Effect.orElseSucceed(() => unknown)
                );
              }

              if (isGone(response.status)) {
                return Effect.succeed(expired);
              }

              if (response.status >= 500) {
                return Effect.succeed(unknown);
              }

              return refusalOf(response).pipe(
                Effect.flatMap((refusal) =>
                  refusal.failure._tag === "TokenRejected"
                    ? Effect.fail(refusal.failure)
                    : Effect.succeed<Standing>({
                        _tag: "refused",
                        refused: refusal,
                      })
                )
              );
            }),
            Effect.catchTags({
              HttpClientError: (error) =>
                error.reason._tag === "EncodeError" ||
                error.reason._tag === "InvalidUrlError"
                  ? Effect.die(error)
                  : Effect.succeed(unknown),
              OutboundRequestRefused: () => Effect.succeed(unknown),
            })
          )
      );

    // Streams the file from byte `from`, part by part, until YouTube made
    // the video or a part did not go as planned.
    const sendFrom = Effect.fn("YouTubeClient.sendFrom")(function* sendFrom(
      post: OutgoingPost,
      prepared: Prepared,
      url: URL,
      from: number,
      finalSent: Ref.Ref<boolean>
    ) {
      const size = prepared.video.byteSize;
      const standing = yield* Ref.make<Standing>(incomplete(from));
      let offset = from;
      let stopped = false;

      yield* media.open(post.workspaceId, prepared.video.mediaId).pipe(
        fromByte(from),
        inParts(() => chunkSize),
        Stream.runForEachWhile((bytes) =>
          Effect.gen(function* part() {
            const end = offset + bytes.length;

            // The file is longer than YouTube was told.
            if (end > size) {
              return yield* new MediaRejected({ code: "sizeMismatch" });
            }

            if (end === size) {
              yield* journaled(sessions.finalPartSent(post.idempotencyKey));
              yield* Ref.set(finalSent, true);
            }

            const sent = yield* sendPart(post, url, offset, bytes, size);

            if (sent._tag === "incomplete" && sent.next === end) {
              offset = end;
              yield* Ref.set(standing, sent);

              return true;
            }

            yield* Ref.set(standing, sent);
            stopped = true;

            return false;
          })
        )
      );

      // The file ended before its size: nothing holds its last byte.
      if (!stopped && offset < size) {
        return yield* new MediaRejected({ code: "sizeMismatch" });
      }

      const last = yield* Ref.get(standing);

      // Every part went, and no video came back: ask the session.
      return last._tag === "unknown" || !stopped
        ? yield* ask(post, url, size)
        : last;
    });

    // Uploads from byte `from` until YouTube made the video, resuming
    // where its session says. `expired` when the session no longer is.
    const upload = Effect.fn("YouTubeClient.upload")(function* upload(
      post: OutgoingPost,
      prepared: Prepared,
      url: URL,
      from: number,
      finalSent: Ref.Ref<boolean>
    ) {
      let offset = from;

      for (let turn = 0; turn < maxResumes; turn += 1) {
        const standing = yield* sendFrom(
          post,
          prepared,
          url,
          offset,
          finalSent
        );

        if (standing._tag === "made" || standing._tag === "expired") {
          return standing;
        }

        if (standing._tag === "refused") {
          return yield* settled(standing.refused);
        }

        if (standing._tag === "unknown") {
          return yield* lost(finalSent);
        }

        offset = standing.next;
      }

      return yield* lost(finalSent);
    });

    // Spends a unit of the day's quota, then has YouTube open a session
    // with the video's metadata, journaled before any byte is sent.
    const openSession = Effect.fn("YouTubeClient.openSession")(
      function* openSession(post: OutgoingPost, prepared: Prepared) {
        const now = yield* DateTime.now;
        const { options: chosen, video } = prepared;

        const spent = yield* journaled(
          quota.spend({
            allowance: dailyUploads,
            bucket: uploadsBucket,
            day: quotaDayOf(now),
            units: 1,
          })
        );

        if (!spent) {
          return yield* new RateLimited({
            code: dailyLimitCodes.projectQuota,
            retryAfter: untilQuotaReset(now),
          });
        }

        const { metadata, parts } = metadataOf(post, chosen);

        const location = yield* credentials.withToken(
          post.channelId,
          ({ accessToken }) =>
            api
              .execute(
                authorized(
                  HttpClientRequest.post(
                    new URL("/upload/youtube/v3/videos", apiUrl)
                  ).pipe(
                    HttpClientRequest.setUrlParams({
                      notifySubscribers: String(
                        chosen.notifySubscribers ?? true
                      ),
                      part: parts,
                      uploadType: "resumable",
                    }),
                    HttpClientRequest.setHeaders({
                      "x-upload-content-length": String(video.byteSize),
                      "x-upload-content-type": video.contentType,
                    }),
                    HttpClientRequest.bodyJsonUnsafe(metadata)
                  ),
                  accessToken
                )
              )
              .pipe(
                Effect.flatMap((response) => {
                  if (response.status === 200) {
                    return Option.match(
                      Headers.get(response.headers, "location"),
                      {
                        onNone: () => Effect.fail(new PlatformUnavailable()),
                        onSome: Effect.succeed,
                      }
                    );
                  }

                  return refusalOf(response).pipe(Effect.flatMap(refused));
                }),
                Effect.catchTags({
                  HttpClientError: unanswered,
                  OutboundRequestRefused: unanswered,
                })
              )
        );

        const url = yield* sessionUrlOf(location);

        yield* journaled(
          sessions.open(post.idempotencyKey, {
            byteSize: video.byteSize,
            openedAt: now,
            sessionUrl: url.href,
          })
        );

        return url;
      }
    );

    // The video's state now: found, not listed yet, or no answer.
    const readVideo = (
      post: OutgoingPost,
      id: string
    ): Effect.Effect<Option.Option<Option.Option<Video>>> =>
      credentials
        .withToken(post.channelId, ({ accessToken }) =>
          api
            .execute(
              authorized(
                HttpClientRequest.get(
                  new URL("/youtube/v3/videos", apiUrl)
                ).pipe(HttpClientRequest.setUrlParams({ id, part: "status" })),
                accessToken
              )
            )
            .pipe(
              Effect.flatMap(
                (
                  response
                ): Effect.Effect<
                  Option.Option<Video>,
                  PlatformUnavailable | TokenRejected
                > => {
                  if (response.status === 401) {
                    return Effect.fail(new TokenRejected());
                  }

                  return response.status === 200
                    ? videosOf(response).pipe(
                        Effect.map(({ items }) =>
                          Option.fromUndefinedOr(
                            items?.find((item) => item.id === id)
                          )
                        ),
                        Effect.mapError(() => new PlatformUnavailable())
                      )
                    : Effect.fail(new PlatformUnavailable());
                }
              ),
              Effect.catchTags({
                HttpClientError: () => Effect.fail(new PlatformUnavailable()),
                OutboundRequestRefused: () =>
                  Effect.fail(new PlatformUnavailable()),
              })
            )
        )
        .pipe(Effect.option);

    // Waits for YouTube to process the video. Only its own failure or
    // rejection refuses the post: the video exists, so anything else
    // leaves it published.
    const processed = Effect.fn("YouTubeClient.processed")(function* processed(
      post: OutgoingPost,
      prepared: Prepared,
      made: Video
    ) {
      const chosen = Option.some(prepared.options);
      let latest = made;
      let privacy = made.status?.privacyStatus;
      let waited = Duration.zero;
      let pollAfter = firstPoll;

      for (;;) {
        const status = latest.status ?? {};

        if (status.uploadStatus === "failed") {
          return yield* new MediaRejected({
            code: codeOf(
              Option.fromUndefinedOr(status.failureReason),
              "processingFailed"
            ),
          });
        }

        if (status.uploadStatus === "rejected") {
          return yield* rejectionOf(status.rejectionReason);
        }

        // Processed, or deleted on YouTube since: it went out.
        if (
          status.uploadStatus === "processed" ||
          status.uploadStatus === "deleted"
        ) {
          return publishedAs(latest, chosen, privacy);
        }

        waited = Duration.sum(waited, pollAfter);

        if (Duration.isGreaterThan(waited, timing.processingLimit)) {
          yield* Effect.logWarning(
            "YouTube took too long to process a video: it is left published"
          ).pipe(Effect.annotateLogs({ channelId: post.channelId }));

          return publishedAs(latest, chosen, privacy);
        }

        yield* Effect.sleep(Duration.min(pollAfter, timing.longestPoll));
        pollAfter = Duration.min(
          Duration.times(pollAfter, 2),
          Duration.minutes(1)
        );

        const read = yield* readVideo(post, latest.id);

        if (Option.isNone(read)) {
          return publishedAs(latest, chosen, privacy);
        }

        if (Option.isSome(read.value)) {
          // Keep the privacy the upload answered when the read omits it.
          privacy = read.value.value.status?.privacyStatus ?? privacy;
          latest = read.value.value;
        }
      }
    });

    // Sends the thumbnail to thumbnails.set, streamed from the media store:
    // whether YouTube set it. A refused token is renewed once, by the
    // credentials; any other refusal is YouTube's last word on it.
    const sendThumbnail = (
      post: OutgoingPost,
      videoId: string,
      thumbnail: PublishableMedia
    ) =>
      Effect.scoped(
        media.held(post.workspaceId, thumbnail.mediaId).pipe(
          Effect.flatMap((bytes) =>
            credentials.withToken(post.channelId, ({ accessToken }) =>
              uploads
                .execute(
                  authorized(
                    HttpClientRequest.post(
                      new URL("/upload/youtube/v3/thumbnails/set", apiUrl)
                    ).pipe(
                      HttpClientRequest.setUrlParams({
                        uploadType: "media",
                        videoId,
                      }),
                      streamedBody(bytes, {
                        contentLength: thumbnail.byteSize,
                        contentType: thumbnail.contentType,
                      })
                    ),
                    accessToken
                  )
                )
                .pipe(
                  Effect.flatMap((response) => {
                    if (response.status === 200) {
                      return Effect.succeed(true);
                    }

                    if (response.status === 401) {
                      return Effect.fail(new TokenRejected());
                    }

                    return googleReasonOf(response).pipe(
                      Effect.tap((reason) =>
                        reason.pipe(
                          Option.filter(
                            (named) => named === dailyLimitCodes.projectQuota
                          ),
                          Option.match({
                            onNone: () => Effect.void,
                            onSome: () =>
                              DateTime.now.pipe(
                                Effect.flatMap((now) =>
                                  quota.exhaust({
                                    allowance: dailyThumbnails,
                                    bucket: thumbnailsBucket,
                                    day: quotaDayOf(now),
                                  })
                                ),
                                Effect.ignore
                              ),
                          })
                        )
                      ),
                      Effect.tap((reason) =>
                        Effect.logWarning(
                          "YouTube did not set a video's thumbnail"
                        ).pipe(
                          Effect.annotateLogs({
                            channelId: post.channelId,
                            code: codeOf(reason, `http${response.status}`),
                          })
                        )
                      ),
                      Effect.as(false)
                    );
                  }),
                  Effect.catchTags({
                    HttpClientError: () => Effect.succeed(false),
                    OutboundRequestRefused: () => Effect.succeed(false),
                  })
                )
            )
          )
        )
      );

    // Sets the thumbnail the options name, once the video exists: spends a
    // unit of the server's thumbnails ledger, then sends the image, and
    // journals that it is set, so a resumed run neither sends nor pays for
    // it again. Never fails the post: a channel YouTube does not allow
    // custom thumbnails, an image it refuses, the day's thumbnails spent or
    // the file gone leave the video published with `thumbnailNotSet`.
    const withThumbnail = Effect.fn("YouTubeClient.withThumbnail")(
      function* withThumbnail(post: OutgoingPost, published: Published) {
        const named = youtubeOptionsOf(post).pipe(
          Option.flatMapNullishOr(({ thumbnailMediaId }) => thumbnailMediaId)
        );

        if (Option.isNone(named)) {
          return published;
        }

        const journal = yield* sessions
          .find(post.idempotencyKey)
          .pipe(Effect.orElseSucceed(() => Option.none<UploadSession>()));

        if (Option.exists(journal, ({ thumbnailSet }) => thumbnailSet)) {
          return published;
        }

        const set = yield* Effect.gen(function* settingThumbnail() {
          const thumbnail = yield* media.describe(
            post.workspaceId,
            named.value
          );

          // Scheduling refused another file: one changed since is not sent.
          if (
            !thumbnailTypes.has(thumbnail.contentType) ||
            thumbnail.byteSize > maxYouTubeThumbnailByteSize
          ) {
            return false;
          }

          const now = yield* DateTime.now;

          const spent = yield* quota.spend({
            allowance: dailyThumbnails,
            bucket: thumbnailsBucket,
            day: quotaDayOf(now),
            units: 1,
          });

          if (!spent) {
            yield* Effect.logWarning(
              "The day's YouTube thumbnails are spent: a video is published without its own"
            ).pipe(Effect.annotateLogs({ channelId: post.channelId }));

            return false;
          }

          return yield* sendThumbnail(
            post,
            published.platformPostId,
            thumbnail
          );
        }).pipe(Effect.orElseSucceed(() => false));

        if (!set) {
          return { ...published, thumbnailNotSet: true } satisfies Published;
        }

        yield* sessions
          .thumbnailSet(post.idempotencyKey)
          .pipe(
            Effect.catch((error) =>
              Effect.logWarning("A thumbnail set could not be journaled", error)
            )
          );

        return published;
      }
    );

    const prepare = Effect.fn("YouTubeClient.prepare")(function* prepare(
      post: OutgoingPost
    ) {
      const chosen = youtubeOptionsOf(post);

      // Scheduling refuses this: a target without them never gets here.
      if (
        Option.isNone(chosen) ||
        chosen.value.title === undefined ||
        chosen.value.madeForKids === undefined
      ) {
        return yield* new BadRequest({ code: "optionsMissing" });
      }

      const [only, ...others] = post.media;

      if (only === undefined || others.length > 0) {
        return yield* new MediaRejected({ code: "oneVideoRequired" });
      }

      const video = yield* media.describe(post.workspaceId, only.mediaId);

      if (video.kind !== "video" || !videoTypes.has(video.contentType)) {
        return yield* new MediaRejected({ code: "unsupportedType" });
      }

      const ready: Readiness<Prepared> = {
        _tag: "ready",
        prepared: { options: chosen.value, video },
      };

      return ready;
    });

    const poll = (_post: OutgoingPost, prepared: Prepared) =>
      Effect.succeed<Readiness<Prepared>>({ _tag: "ready", prepared });

    // Records the video the upload made. It exists whatever the journal
    // says: a failure is logged, and a resumed run asks the session.
    const record = (post: OutgoingPost, video: Video) =>
      sessions
        .made(post.idempotencyKey, video.id)
        .pipe(Effect.catch(unrecorded));

    // Uploads the video, resuming the call's journaled session if a run
    // left one, then waits for its processing.
    const commit = Effect.fn("YouTubeClient.commit")(function* commit(
      post: OutgoingPost,
      prepared: Prepared
    ) {
      const size = prepared.video.byteSize;

      const journal: Option.Option<UploadSession> = yield* journaled(
        sessions.find(post.idempotencyKey)
      );

      const finalSent = yield* Ref.make(
        Option.exists(journal, (session) => session.finalPartSent)
      );

      const knownVideo = journal.pipe(Option.flatMap(({ videoId }) => videoId));

      if (Option.isSome(knownVideo)) {
        return yield* withThumbnail(
          post,
          yield* processed(post, prepared, { id: knownVideo.value })
        );
      }

      const journaledUrl = journal.pipe(
        Option.flatMap(({ sessionUrl }) => sessionUrl),
        Option.flatMap((value) => Option.fromNullOr(URL.parse(value)))
      );

      let standing: Standing;

      if (Option.isSome(journaledUrl)) {
        const asked = yield* ask(post, journaledUrl.value, size);

        if (asked._tag === "incomplete") {
          standing = yield* upload(
            post,
            prepared,
            journaledUrl.value,
            asked.next,
            finalSent
          );
        } else if (asked._tag === "refused") {
          return yield* settled(asked.refused);
        } else if (asked._tag === "unknown") {
          return yield* lost(finalSent);
        } else {
          standing = asked;
        }
      } else {
        const url = yield* openSession(post, prepared);

        standing = yield* upload(post, prepared, url, 0, finalSent);
      }

      // An expired session starts again, once, unless its last part ever
      // left: the video may exist then.
      if (standing._tag === "expired") {
        if (yield* Ref.get(finalSent)) {
          return yield* new OutcomeUnknown({ reason: "interrupted" });
        }

        const url = yield* openSession(post, prepared);

        standing = yield* upload(post, prepared, url, 0, finalSent);
      }

      if (standing._tag !== "made") {
        return yield* lost(finalSent);
      }

      yield* record(post, standing.video);

      return yield* withThumbnail(
        post,
        yield* processed(post, prepared, standing.video)
      );
    });

    // Reads the attempt's upload back through its journal: no session is
    // no byte sent; a session that waits for bytes, or that failed, made
    // no video; one that expired after its last part left cannot tell.
    const lookUp = Effect.fn("YouTubeClient.lookUp")(function* lookUp(
      post: OutgoingPost
    ) {
      const chosen = youtubeOptionsOf(post);

      const read = yield* sessions
        .find(post.idempotencyKey)
        .pipe(Effect.option);

      // A journal that cannot be read cannot tell that no byte left.
      if (Option.isNone(read)) {
        const lookedUp: LookUp = { _tag: "unknown" };

        return lookedUp;
      }

      const journal = read.value;

      if (Option.isNone(journal)) {
        const absent: LookUp = { _tag: "absent" };

        return absent;
      }

      const session = journal.value;

      if (Option.isSome(session.videoId)) {
        const found: LookUp = {
          _tag: "found",
          published: yield* withThumbnail(
            post,
            publishedAs({ id: session.videoId.value }, chosen)
          ),
        };

        return found;
      }

      const url = session.sessionUrl.pipe(
        Option.flatMap((value) => Option.fromNullOr(URL.parse(value)))
      );

      if (Option.isNone(url)) {
        const lookedUp: LookUp = { _tag: "unknown" };

        return lookedUp;
      }

      const standing = yield* ask(post, url.value, session.byteSize);

      if (standing._tag === "made") {
        yield* record(post, standing.video);

        const found: LookUp = {
          _tag: "found",
          published: yield* withThumbnail(
            post,
            publishedAs(standing.video, chosen)
          ),
        };

        return found;
      }

      const absent =
        standing._tag === "incomplete" ||
        standing._tag === "refused" ||
        (standing._tag === "expired" && !session.finalPartSent);

      const lookedUp: LookUp = absent
        ? { _tag: "absent" }
        : { _tag: "unknown" };

      return lookedUp;
    });

    const steps: PublicationSteps<Prepared> = {
      commit,
      confirmation: { _tag: "lookUp", lookUp: (post) => lookUp(post) },
      platform: "youtube",
      poll,
      prepare,
    };

    // A first comment goes under the video, as the channel.
    return withFirstComments(
      sequenced(steps, timing),
      youtubeCommentCalls({ api, apiUrl, credentials, refused }),
      timing
    );
  }
);
