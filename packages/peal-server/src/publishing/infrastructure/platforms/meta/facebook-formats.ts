import { Duration, Effect, Option, Redacted, Schema } from "effect";
import { HttpClientRequest } from "effect/http";

import type { PublishableMedia } from "#publishing/application/media-for-publishing.ts";
import { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import type {
  LookUp,
  PublicationSteps,
  Readiness,
  StepTiming,
} from "#publishing/application/publication-steps.ts";
import { FacebookOptions } from "#publishing/domain/facebook-options.ts";
import type { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { Published } from "#shared/domain/publish-result.ts";
import { videoUploadUrl } from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";

import { formPost, query, withText } from "./graph-calls.ts";
import type { GraphAuth, graphCalls, MetaHttp } from "./graph-calls.ts";

// A Page's reels and stories, from Meta's "Reels Publishing API"
// (https://developers.facebook.com/docs/video-api/guides/reels-publishing)
// and "Page Stories API" (https://developers.facebook.com/docs/page-stories-api),
// both read 2026-11-12, with the permissions Peal holds
// (`pages_manage_posts`, `pages_read_engagement`, `pages_show_list`):
//
// - A reel or a video story: `POST /{page-id}/video_reels` (or
//   `video_stories`) with `upload_phase=start` answers a `video_id`; the
//   video is uploaded to `rupload.facebook.com/video-upload/<version>/<video
//   id>` with the headers `Authorization: OAuth <page token>` (the reels
//   guide's example; the stories page shows only `file_url`) and
//   `file_url`, the address Meta fetches it from; `GET /{video-id}?fields=
//   status` says how its upload, processing and publishing stand; the same
//   edge with `upload_phase=finish` and the `video_id` publishes it, a reel
//   with `video_state=PUBLISHED`, its `description` and `title` (the
//   guide's table says the phase "should be `complete`", its example and
//   its enum say `finish`: the example's is used, in `finishPhase`). A
//   reel's finish answers `success` alone; a story's adds its `post_id`.
// - A photo story: the photo uploaded to `/{page-id}/photos` with
//   `published=false`, then `POST /{page-id}/photo_stories` with its
//   `photo_id`, answering `success` and `post_id`. "A photo or video
//   uploaded for a story can not have been used in a previously published
//   post": each run uploads its own.
// - `GET /{page-id}/stories` lists the Page's stories, each with its
//   `post_id` and its `media_id`, "the ID for the video or photo in the
//   story post".
//
// Neither page names a text for a story: none is sent. The reels guide
// says "Reels API is limited to 30 API-published posts within a 24-hour
// moving period" and gives no error code for it: Meta's refusal is kept
// with its code, as any other. Nothing here searches by text, and what
// `prepare` made lives in the run's memory only: a resumed run cannot tell
// whether its reel or story went out, and ends unconfirmed.
//
// Neither page says what the status shows after an accepted finish whose
// publishing has not begun: their samples show `not_started` beside an
// upload done, and the stories page `publish_status: "published"` beside
// it. So the status never rules a post out (nothing is finished twice),
// and only a publishing phase done, or for a story its listing, confirms
// one. A processing error (`processing_phase.error`, the reels guide's
// sample: "Resolution too low") fails the post with MediaRejected,
// whether it shows before the finish or right after it.

/** The finish of a reel's and a video story's upload, as Meta's example writes it. */
export const finishPhase = "finish";

/**
 * How long Peal keeps reading a reel's or a video story's status after its
 * finish, until Meta says its publishing is done or its processing refused
 * it: past it, the post ends unconfirmed (`stillProcessing`), never
 * Published and never sent again.
 */
export const videoPublishingWait = Duration.minutes(10);

/** How often the status is read meanwhile. */
const videoPublishingLook = Duration.seconds(30);

/**
 * The steps' timing for reels and video stories: the confirmations after
 * the finish spread over `videoPublishingWait`.
 */
export const videoStepTiming = (timing: StepTiming): StepTiming => ({
  ...timing,
  confirmDelays: Array.from(
    {
      length: Math.ceil(
        Duration.toMillis(videoPublishingWait) /
          Duration.toMillis(videoPublishingLook)
      ),
    },
    () => videoPublishingLook
  ),
});

/** How often a video's upload is looked at while Meta fetches it. */
const uploadPoll = Duration.seconds(5);

const StartSchema = Schema.Struct({ video_id: Schema.NonEmptyString });

const UploadSchema = Schema.Struct({ success: Schema.Boolean });

// Meta writes a story's post id as a number in its examples, and as a
// string elsewhere: read as text either way (`idText`).
const PostIdSchema = Schema.Union([Schema.NonEmptyString, Schema.Int]);

const idText = (id: string | number | undefined): string | undefined =>
  id === undefined ? undefined : String(id);

const FinishSchema = Schema.Struct({
  post_id: Schema.optionalKey(PostIdSchema),
  success: Schema.Boolean,
});

const PhaseSchema = Schema.Struct({
  publish_status: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(Schema.String),
});

const ProcessingSchema = Schema.Struct({
  error: Schema.optionalKey(Schema.Unknown),
  status: Schema.optionalKey(Schema.String),
});

const VideoStatusSchema = Schema.Struct({
  status: Schema.optionalKey(
    Schema.Struct({
      processing_phase: Schema.optionalKey(ProcessingSchema),
      publishing_phase: Schema.optionalKey(PhaseSchema),
      uploading_phase: Schema.optionalKey(PhaseSchema),
      video_status: Schema.optionalKey(Schema.String),
    })
  ),
});

type VideoStatus = (typeof VideoStatusSchema.Type)["status"];

const PhotoSchema = Schema.Struct({ id: Schema.NonEmptyString });

const StoriesSchema = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      media_id: Schema.optionalKey(PostIdSchema),
      post_id: Schema.optionalKey(PostIdSchema),
    })
  ),
});

/** A reel's or a video story's video, once uploaded. */
export interface UploadedVideo {
  readonly videoId: string;
}

/** What `prepare` made of a story: its photo, or its uploaded video. */
export type StoryMedia =
  | { readonly _tag: "photo"; readonly photoId: string }
  | { readonly _tag: "video"; readonly videoId: string };

// A phase that is done, in either of the spellings Meta's pages use.
const isDone = (status: string | undefined) =>
  status === "complete" || status === "completed";

// Whether Meta's processing refused the video.
const processingFailed = (status: VideoStatus): boolean => {
  const processing = status?.processing_phase;

  return (
    status?.video_status === "error" ||
    processing?.status === "error" ||
    (processing?.error !== undefined && processing.error !== null)
  );
};

// What a video's status says of its upload: refused, expired (a later
// attempt starts again), fetched, or still being fetched. The upload's own
// phase decides: `video_status` says `processing` while it is still in
// progress too (the reels guide's interrupted upload).
const uploadReadiness = <P>(
  status: VideoStatus,
  prepared: P
): Effect.Effect<Readiness<P>, PublishFailure> => {
  const videoStatus = status?.video_status;

  if (videoStatus === "upload_failed") {
    return Effect.fail(new MediaRejected({ code: "uploadFailed" }));
  }

  if (processingFailed(status)) {
    return Effect.fail(new MediaRejected({ code: "processingFailed" }));
  }

  if (videoStatus === "expired") {
    return Effect.fail(new PlatformUnavailable());
  }

  const upload = status?.uploading_phase?.status;

  const uploaded =
    upload === undefined
      ? videoStatus === "upload_complete" || videoStatus === "ready"
      : isDone(upload);

  return Effect.succeed(
    uploaded
      ? { _tag: "ready", prepared }
      : { _tag: "processing", pollAfter: uploadPoll, prepared }
  );
};

// What a video's status says of its publishing, once its finish was
// sent: done, or not known. Never ruled out: Meta's pages show
// `not_started` after an upload, and do not say it means the finish did
// not arrive, so a finish is never sent twice.
const isPublished = (status: VideoStatus): boolean =>
  isDone(status?.publishing_phase?.status);

const published = (postId: string): Published => ({
  _tag: "published",
  platformPostId: PlatformPostIdSchema.make(postId),
});

const videoTitleOf = (post: OutgoingPost) =>
  post.options.pipe(
    Option.filter(Schema.is(FacebookOptions)),
    Option.flatMapNullishOr(({ videoTitle }) => videoTitle),
    Option.getOrElse(() => "")
  );

type Calls = Effect.Success<ReturnType<typeof graphCalls>>;

/** What the reels' and stories' steps are built with. */
export interface FacebookFormatDeps {
  readonly api: MetaHttp;
  readonly calls: Calls;
  /** A file of the post, with its public URL, checked for Facebook. */
  readonly described: (
    post: OutgoingPost,
    attachment: MediaAttachment
  ) => Effect.Effect<
    { readonly media: PublishableMedia; readonly url: string },
    PublishFailure
  >;
  readonly hosts: MetaHosts;
  /** A path of the Page's, as `/video_reels`. */
  readonly page: (post: OutgoingPost, path: string) => URL;
  /** A path of the Graph API, as `/{video-id}`. */
  readonly graph: (path: string) => URL;
  /** For the upload, which Meta makes while the request waits. */
  readonly uploads: MetaHttp;
}

/**
 * The steps of a Page's reels and stories: a reel's video, and a story's
 * photo or video, each uploaded in `prepare`, published by the finish (or
 * `photo_stories`) in `commit`, confirmed by what `prepare` made while the
 * run holds it, and unconfirmed otherwise.
 */
export const facebookFormatSteps = (deps: FacebookFormatDeps) => {
  const { api, calls, hosts, uploads } = deps;
  const { commit: commitCall, step } = calls;

  const onlyFile = Effect.fn("FacebookFormats.onlyFile")(function* onlyFile(
    post: OutgoingPost
  ) {
    const [attachment, ...others] = post.media;

    // The platform rules take one file on a reel and on a story.
    if (attachment === undefined) {
      return yield* new BadRequest({ code: "mediaRequired" });
    }

    if (others.length > 0) {
      return yield* new BadRequest({ code: "tooManyMedia" });
    }

    return yield* deps.described(post, attachment);
  });

  // Makes room for the video on `edge`, then has Meta fetch it from its
  // public URL, the Page's token in the upload's Authorization header.
  const uploadVideo = Effect.fn("FacebookFormats.uploadVideo")(
    function* uploadVideo(
      post: OutgoingPost,
      edge: "/video_reels" | "/video_stories",
      url: string
    ) {
      const { video_id: videoId } = yield* step(
        post,
        api,
        "media",
        (auth) =>
          formPost(deps.page(post, edge), { ...auth, upload_phase: "start" }),
        StartSchema
      );

      yield* step(
        post,
        uploads,
        "media",
        (auth: GraphAuth) =>
          HttpClientRequest.post(videoUploadUrl(hosts, videoId)).pipe(
            HttpClientRequest.setHeaders({
              authorization: `OAuth ${Redacted.value(auth.access_token)}`,
              file_url: url,
            })
          ),
        UploadSchema
      ).pipe(
        Effect.flatMap(({ success }) =>
          success
            ? Effect.void
            : Effect.fail(new MediaRejected({ code: "uploadFailed" }))
        )
      );

      return videoId;
    }
  );

  const statusOf = (post: OutgoingPost, videoId: string) =>
    step(
      post,
      api,
      "read",
      (auth) =>
        query(deps.graph(`/${encodeURIComponent(videoId)}`), {
          ...auth,
          fields: "status",
        }),
      VideoStatusSchema
    ).pipe(Effect.map(({ status }) => status));

  // The finish on `edge`, then the video's status: published, by its post
  // id or, for a reel, its video's, once Meta says its publishing is done;
  // refused when its processing failed. Anything else, a status that
  // cannot be read, a story's finish without its post id or an answer that
  // does not say it succeeded, settles nothing: the lookUp reads on.
  const finish = (
    post: OutgoingPost,
    edge: "/video_reels" | "/video_stories",
    videoId: string,
    params: Readonly<Record<string, string>>
  ) =>
    commitCall(
      post,
      api,
      (auth) =>
        formPost(deps.page(post, edge), {
          ...auth,
          ...params,
          upload_phase: finishPhase,
          video_id: videoId,
        }),
      FinishSchema,
      (answer) => Effect.succeed(answer),
      (answer) => answer
    ).pipe(
      Effect.flatMap(({ post_id: postId, success }) => {
        const id =
          edge === "/video_reels"
            ? (idText(postId) ?? videoId)
            : idText(postId);

        return success && id !== undefined
          ? Effect.succeed(id)
          : Effect.fail(new OutcomeUnknown({ reason: "unreadableResponse" }));
      }),
      Effect.flatMap((id) =>
        statusOf(post, videoId).pipe(
          Effect.map(Option.some),
          Effect.orElseSucceed(() => Option.none<VideoStatus>()),
          Effect.flatMap(
            (
              status
            ): Effect.Effect<Published, MediaRejected | OutcomeUnknown> => {
              if (Option.exists(status, processingFailed)) {
                return Effect.fail(
                  new MediaRejected({ code: "processingFailed" })
                );
              }

              return Option.exists(status, isPublished)
                ? Effect.succeed(published(id))
                : Effect.fail(
                    new OutcomeUnknown({ reason: "stillProcessing" })
                  );
            }
          )
        )
      )
    );

  // The Page's story made of `mediaId`, if it lists one.
  const listedStory = (post: OutgoingPost, mediaId: string) =>
    step(
      post,
      api,
      "read",
      (auth) =>
        query(deps.page(post, "/stories"), {
          ...auth,
          fields: "post_id,media_id",
        }),
      StoriesSchema
    ).pipe(
      Effect.map(({ data }) =>
        Option.fromUndefinedOr(
          idText(
            data.find((listed) => idText(listed.media_id) === mediaId)?.post_id
          )
        )
      )
    );

  // A video's lookUp: refused when its processing failed; a reel found by
  // its status's publishing phase, done; a story by its listing among the
  // Page's stories, under its post id as the finish gives it. Anything else
  // is not known.
  const videoLookUp = (
    post: OutgoingPost,
    videoId: string,
    story: boolean
  ): Effect.Effect<LookUp, PublishFailure> =>
    statusOf(post, videoId).pipe(
      Effect.flatMap((status): Effect.Effect<LookUp, PublishFailure> => {
        if (processingFailed(status)) {
          return Effect.succeed({
            _tag: "refused",
            failure: new MediaRejected({ code: "processingFailed" }),
          });
        }

        if (!story) {
          return Effect.succeed(
            isPublished(status)
              ? { _tag: "found", published: published(videoId) }
              : { _tag: "unknown" }
          );
        }

        return listedStory(post, videoId).pipe(
          Effect.map(
            Option.match({
              onNone: (): LookUp => ({ _tag: "unknown" }),
              onSome: (postId): LookUp => ({
                _tag: "found",
                published: published(postId),
              }),
            })
          )
        );
      })
    );

  const unknown = Effect.succeed<LookUp>({ _tag: "unknown" });

  const reel: PublicationSteps<UploadedVideo> = {
    commit: (post, { videoId }) =>
      finish(
        post,
        "/video_reels",
        videoId,
        withText(
          withText({ video_state: "PUBLISHED" }, "description", post.text),
          "title",
          videoTitleOf(post)
        )
      ),
    // A resumed run holds no video id: it cannot tell.
    confirmation: {
      _tag: "lookUp",
      lookUp: (post, prepared) =>
        Option.match(prepared, {
          onNone: () => unknown,
          onSome: ({ videoId }) => videoLookUp(post, videoId, false),
        }),
    },
    platform: "facebook",
    poll: (post, prepared) =>
      statusOf(post, prepared.videoId).pipe(
        Effect.flatMap((status) => uploadReadiness(status, prepared))
      ),
    prepare: (post) =>
      onlyFile(post).pipe(
        // The platform rules take a video alone on a reel.
        Effect.flatMap(({ media, url }) =>
          media.kind === "video"
            ? uploadVideo(post, "/video_reels", url)
            : Effect.fail(new MediaRejected({ code: "unsupportedType" }))
        ),
        Effect.map((videoId): Readiness<UploadedVideo> => ({
          _tag: "processing",
          pollAfter: Duration.zero,
          prepared: { videoId },
        }))
      ),
  };

  const story: PublicationSteps<StoryMedia> = {
    commit: (post, prepared) =>
      prepared._tag === "video"
        ? finish(post, "/video_stories", prepared.videoId, {})
        : commitCall(
            post,
            api,
            (auth) =>
              formPost(deps.page(post, "/photo_stories"), {
                ...auth,
                photo_id: prepared.photoId,
              }),
            FinishSchema,
            (answer) => Effect.succeed(answer),
            (answer) => answer
          ).pipe(
            Effect.flatMap(({ post_id: postId, success }) =>
              success && postId !== undefined
                ? Effect.succeed(published(String(postId)))
                : Effect.fail(
                    new OutcomeUnknown({ reason: "unreadableResponse" })
                  )
            )
          ),
    // A photo's story is found among the Page's, never ruled out: its
    // photo cannot make a second one. A resumed run holds nothing.
    confirmation: {
      _tag: "lookUp",
      lookUp: (post, prepared) =>
        Option.match(prepared, {
          onNone: () => unknown,
          onSome: (made) =>
            made._tag === "video"
              ? videoLookUp(post, made.videoId, true)
              : listedStory(post, made.photoId).pipe(
                  Effect.map(
                    Option.match({
                      onNone: (): LookUp => ({ _tag: "unknown" }),
                      onSome: (postId): LookUp => ({
                        _tag: "found",
                        published: published(postId),
                      }),
                    })
                  )
                ),
        }),
    },
    platform: "facebook",
    poll: (post, prepared) =>
      prepared._tag === "photo"
        ? Effect.succeed({ _tag: "ready", prepared })
        : statusOf(post, prepared.videoId).pipe(
            Effect.flatMap((status) => uploadReadiness(status, prepared))
          ),
    prepare: Effect.fn("FacebookFormats.prepareStory")(function* prepareStory(
      post: OutgoingPost
    ) {
      const { media, url } = yield* onlyFile(post);

      if (media.kind === "video") {
        const videoId = yield* uploadVideo(post, "/video_stories", url);
        const prepared: StoryMedia = { _tag: "video", videoId };

        return {
          _tag: "processing",
          pollAfter: Duration.zero,
          prepared,
        } satisfies Readiness<StoryMedia>;
      }

      // Unpublished, it shows nowhere until the story uses it.
      const { id } = yield* step(
        post,
        api,
        "media",
        (auth) =>
          formPost(deps.page(post, "/photos"), {
            ...auth,
            published: "false",
            url,
          }),
        PhotoSchema
      );

      const prepared: StoryMedia = { _tag: "photo", photoId: id };

      return { _tag: "ready", prepared } satisfies Readiness<StoryMedia>;
    }),
  };

  return { reel, story };
};
