import { DateTime, Duration, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";

import { MediaForPublishing } from "#publishing/application/media-for-publishing.ts";
import type { PublishableMedia } from "#publishing/application/media-for-publishing.ts";
import type {
  OutgoingPost,
  PlatformClient,
} from "#publishing/application/platform-client.ts";
import {
  defaultStepTiming,
  sequenced,
} from "#publishing/application/publication-steps.ts";
import type {
  LookUp,
  PublicationSteps,
  StepTiming,
} from "#publishing/application/publication-steps.ts";
import { FacebookOptions } from "#publishing/domain/facebook-options.ts";
import type { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { postFormatOf } from "#publishing/domain/post-format.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { Published } from "#shared/domain/publish-result.ts";
import { graphUrl } from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";

import {
  matchingPost,
  mediaUrlLifetime,
  publishedOf,
} from "./container-publishing.ts";
import type { ListedPost } from "./container-publishing.ts";
import { facebookFormatSteps, videoStepTiming } from "./facebook-formats.ts";
import {
  formPost,
  graphCalls,
  query,
  unixSeconds,
  withText,
} from "./graph-calls.ts";
import type { GraphAuth, MetaHttp } from "./graph-calls.ts";

// From the Pages API's "Posts" page and the Page Feed, Photos and Videos
// references: text goes to /feed, one photo to /photos with its URL, several
// photos are uploaded unpublished and attached to one /feed post, and a
// video goes to /videos with its URL. Each answers with the post's id.
// /feed and /videos answer with `id`; /photos adds the post's `post_id`.
const PhotoSchema = Schema.Struct({
  id: Schema.NonEmptyString,
  post_id: Schema.optionalKey(Schema.NonEmptyString),
});

const PublishedPostsSchema = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      created_time: Schema.optionalKey(Schema.String),
      id: Schema.NonEmptyString,
      message: Schema.optionalKey(Schema.String),
      permalink_url: Schema.optionalKey(Schema.String),
    })
  ),
});

// Facebook takes these images (Page Photos: JPEG, BMP, PNG, GIF, TIFF) and
// videos; the platform rules refuse other files before.
const formats: ReadonlySet<string> = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "video/mp4",
  "video/quicktime",
]);

/** What `prepare` made: the photos of a post with several, unpublished. */
export interface FacebookMedia {
  readonly photos: readonly string[];
}

// A post's address on Facebook, from its id (Pages API, "Posts").
// The title the options give a video, empty when they give none.
const videoTitleOf = (post: OutgoingPost) =>
  post.options.pipe(
    Option.filter(Schema.is(FacebookOptions)),
    Option.flatMapNullishOr(({ videoTitle }) => videoTitle),
    Option.getOrElse(() => "")
  );

const permalinkOf = (postId: string) =>
  `https://www.facebook.com/${encodeURIComponent(postId)}`;

const publishedWith = (postId: string): Published => ({
  _tag: "published",
  permalink: permalinkOf(postId),
  platformPostId: PlatformPostIdSchema.make(postId),
});

const listedOf = (
  listed: (typeof PublishedPostsSchema.Type)["data"][number]
): ListedPost => ({
  id: listed.id,
  permalink: Option.some(listed.permalink_url ?? permalinkOf(listed.id)),
  text: listed.message ?? "",
  timestamp: Option.fromUndefinedOr(listed.created_time).pipe(
    Option.flatMap((at) => DateTime.make(at)),
    Option.map(DateTime.toUtc)
  ),
});

/**
 * Publishes on a Facebook Page with the Page's token: text alone on its
 * feed, a photo by its public URL, several photos uploaded unpublished in
 * `prepare` then attached to one post, or a video Facebook fetches from its
 * public URL. Facebook keeps no idempotency key: an unknown outcome is
 * settled by finding the post among the Page's published posts since the
 * attempt started, by its text; when it is not there, the post is left
 * unconfirmed for the member to check. A reel and a story, which the
 * options' `format` chooses, follow the steps of `./facebook-formats.ts`.
 */
export const facebookClient = Effect.fn("FacebookClient.make")(
  function* facebookClient(options: {
    readonly api: MetaHttp;
    readonly appSecret: Option.Option<Redacted.Redacted>;
    readonly hosts: MetaHosts;
    readonly timing?: StepTiming;
    /** For videos, which Facebook fetches while the request waits. */
    readonly uploads: MetaHttp;
  }) {
    const media = yield* MediaForPublishing;
    const { api, hosts, uploads } = options;

    const calls = yield* graphCalls({ appSecret: options.appSecret });
    const { commit: commitCall, step } = calls;

    const page = (post: OutgoingPost, path: string) =>
      graphUrl(hosts, `/${encodeURIComponent(post.accountId)}${path}`);

    const described = Effect.fn("FacebookClient.describe")(function* describe(
      post: OutgoingPost,
      attachment: MediaAttachment
    ) {
      const found = yield* media.describe(post.workspaceId, attachment.mediaId);

      if (!formats.has(found.contentType)) {
        return yield* new MediaRejected({ code: "unsupportedType" });
      }

      const url = yield* media.publicUrl(
        post.workspaceId,
        attachment.mediaId,
        mediaUrlLifetime
      );

      return { altText: attachment.altText, media: found, url };
    });

    const prepare = Effect.fn("FacebookClient.prepare")(function* prepare(
      post: OutgoingPost
    ) {
      if (post.media.length < 2) {
        return { _tag: "ready", prepared: { photos: [] } } as const;
      }

      const files = yield* Effect.forEach(
        post.media,
        (attachment) => described(post, attachment),
        { concurrency: 1 }
      );

      // The platform rules let a video go out alone only.
      if (files.some(({ media: file }) => file.kind === "video")) {
        return yield* new BadRequest({ code: "mixedMedia" });
      }

      // Unpublished photos show nowhere, and Facebook deletes them after a
      // day unless a post attaches them.
      const photos = yield* Effect.forEach(
        files,
        ({ altText, url }) =>
          step(
            post,
            api,
            "media",
            (auth) =>
              formPost(page(post, "/photos"), {
                ...auth,
                ...withText(
                  { published: "false", url },
                  "alt_text_custom",
                  altText
                ),
              }),
            PhotoSchema
          ).pipe(Effect.map(({ id }) => id)),
        { concurrency: 1 }
      );

      return { _tag: "ready", prepared: { photos } } as const;
    });

    const commitWith = (
      post: OutgoingPost,
      http: MetaHttp,
      request: (auth: GraphAuth) => ReturnType<typeof formPost>,
      postIdOf: (answer: typeof PhotoSchema.Type) => string
    ) =>
      commitCall(
        post,
        http,
        request,
        PhotoSchema,
        (answer) => Effect.succeed(publishedWith(postIdOf(answer))),
        (answer) => publishedWith(postIdOf(answer))
      );

    const single = (
      post: OutgoingPost,
      file: PublishableMedia,
      url: string,
      altText: string
    ) =>
      file.kind === "video"
        ? commitWith(
            post,
            uploads,
            (auth) =>
              formPost(page(post, "/videos"), {
                ...auth,
                ...withText(
                  withText({ file_url: url }, "description", post.text),
                  "title",
                  videoTitleOf(post)
                ),
              }),
            ({ id }) => id
          )
        : commitWith(
            post,
            api,
            (auth) =>
              formPost(page(post, "/photos"), {
                ...auth,
                ...withText(
                  withText({ url }, "alt_text_custom", altText),
                  "caption",
                  post.text
                ),
              }),
            ({ id, post_id: postId }) => postId ?? id
          );

    const commit = Effect.fn("FacebookClient.commit")(function* commit(
      post: OutgoingPost,
      prepared: FacebookMedia
    ) {
      const [attachment] = post.media;

      if (prepared.photos.length > 0) {
        const attached = Object.fromEntries(
          prepared.photos.map((photo, index) => [
            `attached_media[${index}]`,
            JSON.stringify({ media_fbid: photo }),
          ])
        );

        return yield* commitWith(
          post,
          api,
          (auth) =>
            formPost(page(post, "/feed"), {
              ...auth,
              ...withText(attached, "message", post.text),
            }),
          ({ id }) => id
        );
      }

      if (attachment !== undefined) {
        const file = yield* described(post, attachment);

        return yield* single(post, file.media, file.url, file.altText);
      }

      return yield* commitWith(
        post,
        api,
        (auth) =>
          formPost(page(post, "/feed"), { ...auth, message: post.text }),
        ({ id }) => id
      );
    });

    // The Page's posts since the attempt started, by its text: Facebook
    // keeps no key that would tell, nor a way to rule a post out.
    const lookUp = (post: OutgoingPost): Effect.Effect<LookUp> =>
      step(
        post,
        api,
        "read",
        (auth) =>
          query(page(post, "/published_posts"), {
            ...auth,
            fields: "id,message,created_time,permalink_url",
            limit: "25",
            since: unixSeconds(
              DateTime.subtractDuration(post.startedAt, Duration.minutes(1))
            ),
          }),
        PublishedPostsSchema
      ).pipe(
        Effect.map(({ data }) =>
          Option.match(matchingPost(post, data.map(listedOf)), {
            onNone: (): LookUp => ({ _tag: "unknown" }),
            onSome: (found): LookUp => ({
              _tag: "found",
              published: publishedOf(found),
            }),
          })
        ),
        Effect.orElseSucceed((): LookUp => ({ _tag: "unknown" }))
      );

    const steps: PublicationSteps<FacebookMedia> = {
      commit,
      confirmation: { _tag: "lookUp", lookUp },
      platform: "facebook",
      // Photos are fetched while their request waits: nothing to wait for.
      poll: (_post, prepared) => Effect.succeed({ _tag: "ready", prepared }),
      prepare,
    };

    const timing = options.timing ?? defaultStepTiming;
    const feed = sequenced(steps, timing);

    const formatSteps = facebookFormatSteps({
      api,
      calls,
      described,
      graph: (path) => graphUrl(hosts, path),
      hosts,
      page,
      uploads,
    });

    // A reel's and a video story's publishing is read on after the finish,
    // over `videoPublishingWait`; a test's timing stays its own.
    const formatTiming = options.timing ?? videoStepTiming(defaultStepTiming);
    const reel = sequenced(formatSteps.reel, formatTiming);
    const story = sequenced(formatSteps.story, formatTiming);

    // The client of the format the post's options choose: a feed post's
    // without one.
    const clientOf = (post: OutgoingPost): PlatformClient =>
      Option.match(postFormatOf(post.options), {
        onNone: () => feed,
        onSome: (format) => (format === "reel" ? reel : story),
      });

    return {
      platform: "facebook",
      publish: (post) => clientOf(post).publish(post),
      resume: (post) => clientOf(post).resume(post),
    } satisfies PlatformClient;
  }
);
