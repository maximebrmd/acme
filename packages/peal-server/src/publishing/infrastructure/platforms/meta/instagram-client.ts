import { DateTime, Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";

import { MediaForPublishing } from "#publishing/application/media-for-publishing.ts";
import type {
  MediaFailure,
  PublishableMedia,
} from "#publishing/application/media-for-publishing.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import type { PublishingAccount } from "#publishing/application/platform-credentials.ts";
import {
  defaultStepTiming,
  sequenced,
} from "#publishing/application/publication-steps.ts";
import type {
  LookUp,
  PublicationSteps,
  StepTiming,
} from "#publishing/application/publication-steps.ts";
import { InstagramOptions } from "#publishing/domain/instagram-options.ts";
import type { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { postFormatOf } from "#publishing/domain/post-format.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { Published } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import {
  graphUrl,
  instagramUrl,
} from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";

import {
  lookUpOf,
  matchingPost,
  mediaUrlLifetime,
  hasVideo,
  processing,
  publishedOf,
  settledStatuses,
} from "./container-publishing.ts";
import type { Containers, ListedPost } from "./container-publishing.ts";
import {
  formPost,
  graphCalls,
  publishedAs,
  query,
  readWith,
  statusCodeOf,
  withText,
} from "./graph-calls.ts";
import type { GraphAuth, MetaHttp } from "./graph-calls.ts";

// From Instagram's "Content Publishing" page and the IG User Media
// reference, the same with Instagram Login (on graph.instagram.com) as with
// Facebook Login (on graph.facebook.com): a container per post (an image, a reel, or a carousel of 2 to
// 20 items made first), whose `status_code` runs IN_PROGRESS, FINISHED,
// PUBLISHED, or ERROR, or EXPIRED after a day unpublished; `status` says
// more about an error.
const IdSchema = Schema.Struct({ id: Schema.NonEmptyString });

const StatusSchema = Schema.Struct({
  status: Schema.optionalKey(Schema.String),
  status_code: Schema.Literals([
    "ERROR",
    "EXPIRED",
    "FINISHED",
    "IN_PROGRESS",
    "PUBLISHED",
  ]),
});

const QuotaSchema = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      config: Schema.optionalKey(
        Schema.Struct({ quota_total: Schema.optionalKey(Schema.Number) })
      ),
      quota_usage: Schema.optionalKey(Schema.Number),
    })
  ),
});

const PermalinkSchema = Schema.Struct({
  permalink: Schema.optionalKey(Schema.String),
});

const MediaListSchema = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      caption: Schema.optionalKey(Schema.String),
      id: Schema.NonEmptyString,
      permalink: Schema.optionalKey(Schema.String),
      timestamp: Schema.optionalKey(Schema.String),
    })
  ),
});

// Instagram takes JPEG images only, and MP4 or QuickTime videos; the
// platform rules refuse other files before.
const formats: ReadonlySet<string> = new Set([
  "image/jpeg",
  "video/mp4",
  "video/quicktime",
]);

// How Instagram names a trial reel's graduation (`trial_params`).
const graduations = {
  manual: "MANUAL",
  performance: "SS_PERFORMANCE",
} as const;

const instagramOptionsOf = (post: OutgoingPost) =>
  post.options.pipe(Option.filter(Schema.is(InstagramOptions)));

// A story (`media_type=STORIES`, the IG User Media reference, read
// 2026-11-12): one image or video, with no caption, alt text ("Reels and
// stories are not supported") or collaborators ("Not supported for
// Stories"). It has no lasting address, and the account's media, which a
// resumed attempt searches by caption, cannot tell it: a story is
// confirmed by its container only.
const isStory = (post: OutgoingPost) =>
  Option.contains(postFormatOf(post.options), "story");

// A story's container: its one file, and nothing else.
const storyParams = (url: string, described: PublishableMedia) =>
  described.kind === "image"
    ? { image_url: url, media_type: "STORIES" }
    : { media_type: "STORIES", video_url: url };

// The collaborators the options invite: on a feed image, a reel or a
// carousel's own container, never on an item of one.
const collaboratorsOf = (
  chosen: Option.Option<InstagramOptions>
): Record<string, string> =>
  Option.match(
    chosen.pipe(
      Option.flatMapNullishOr(({ collaborators }) => collaborators),
      Option.filter((names) => names.length > 0)
    ),
    {
      onNone: () => ({}),
      onSome: (names) => ({ collaborators: JSON.stringify(names) }),
    }
  );

// What a reel's container takes of the options, each only when chosen. A
// cover image wins over a frame, as Instagram documents: only the cover
// is sent then.
const reelParams = Effect.fn("InstagramClient.reelParams")(function* reelParams(
  chosen: InstagramOptions,
  coverUrl: (mediaId: MediaAssetId) => Effect.Effect<string, MediaFailure>
) {
  const params: Record<string, string> = {};

  if (chosen.shareToFeed !== undefined) {
    params["share_to_feed"] = String(chosen.shareToFeed);
  }

  if (chosen.coverMediaId === undefined) {
    if (chosen.thumbOffsetMs !== undefined) {
      params["thumb_offset"] = String(chosen.thumbOffsetMs);
    }
  } else {
    params["cover_url"] = yield* coverUrl(chosen.coverMediaId);
  }

  if (chosen.audioName !== undefined) {
    params["audio_name"] = chosen.audioName;
  }

  if (chosen.trialReel !== undefined) {
    params["trial_params"] = JSON.stringify({
      graduation_strategy: graduations[chosen.trialReel],
    });
  }

  return params;
});

// An error's status reads "Error: … error code 2207026": the code is kept.
const errorCodeOf = (status: string | undefined) => {
  const code = /\b(?<code>\d{4,9})\b/u.exec(status ?? "")?.groups?.["code"];

  return code === undefined
    ? statusCodeOf(status, "processingFailed")
    : `ig${code}`;
};

const listedOf = (
  listed: (typeof MediaListSchema.Type)["data"][number]
): ListedPost => ({
  id: listed.id,
  permalink: Option.fromUndefinedOr(listed.permalink),
  text: listed.caption ?? "",
  timestamp: Option.fromUndefinedOr(listed.timestamp).pipe(
    Option.flatMap((at) => DateTime.make(at)),
    Option.map(DateTime.toUtc)
  ),
});

// Instagram Login's channels call Instagram's host with their own token,
// another app's than the one whose secret signs Facebook Login's calls.
const viaInstagramLogin = (account: PublishingAccount) =>
  Option.contains(account.connection, "instagramLogin");

/**
 * Publishes on an Instagram professional account, through Instagram Login
 * with the account's own token on `graph.instagram.com`, or through
 * Facebook Login with the token of the Page it is linked to on
 * `graph.facebook.com`, as the channel was connected: makes a container of the post (an image, a reel, or
 * a carousel whose items come first), with the media fetched by Meta from
 * their public URLs, waits until Meta has processed them, then publishes
 * the container. Before making any, it checks the account's daily
 * publishing quota. An unknown outcome is settled by the container's status;
 * a resumed attempt looks for the post among the account's recent ones.
 */
export const instagramClient = Effect.fn("InstagramClient.make")(
  function* instagramClient(options: {
    readonly api: MetaHttp;
    readonly appSecret: Option.Option<Redacted.Redacted>;
    readonly hosts: MetaHosts;
    readonly timing?: StepTiming;
  }) {
    const media = yield* MediaForPublishing;
    const { api, hosts } = options;

    const { commit: commitCall, step } = yield* graphCalls({
      appSecret: options.appSecret,
      proves: (on) => !viaInstagramLogin(on),
    });

    // A path of the API the account is reached through.
    const apiUrl = (on: PublishingAccount, path: string) =>
      viaInstagramLogin(on) ? instagramUrl(hosts, path) : graphUrl(hosts, path);

    const account = (on: PublishingAccount, post: OutgoingPost, path: string) =>
      apiUrl(on, `/${encodeURIComponent(post.accountId)}${path}`);

    const quotaCheck = Effect.fn("InstagramClient.quota")(function* quotaCheck(
      post: OutgoingPost
    ) {
      const quota = yield* step(
        post,
        api,
        "read",
        (auth, on) =>
          query(account(on, post, "/content_publishing_limit"), {
            ...auth,
            fields: "quota_usage,config",
          }),
        QuotaSchema
      );

      const [usage] = quota.data;
      const total = usage?.config?.quota_total;

      // The quota is over a moving day: Meta does not say when room comes.
      if (
        usage?.quota_usage !== undefined &&
        total !== undefined &&
        usage.quota_usage >= total
      ) {
        yield* new RateLimited({});
      }
    });

    const describe = Effect.fn("InstagramClient.describe")(function* describe(
      post: OutgoingPost,
      attachment: MediaAttachment
    ) {
      const described = yield* media.describe(
        post.workspaceId,
        attachment.mediaId
      );

      if (!formats.has(described.contentType)) {
        return yield* new MediaRejected({ code: "unsupportedType" });
      }

      return described;
    });

    const publicUrlOf = (post: OutgoingPost, mediaId: MediaAssetId) =>
      media.publicUrl(post.workspaceId, mediaId, mediaUrlLifetime);

    // A container's media: an image by its URL, with its alt text when it
    // has one ("Only supported on a single image or image media in a
    // carousel"), or a video, which is a reel on its own, with the reel's
    // options, and a plain video in a carousel.
    const mediaParams = Effect.fn("InstagramClient.mediaParams")(
      function* mediaParams(
        post: OutgoingPost,
        attachment: MediaAttachment,
        described: PublishableMedia,
        inCarousel: boolean
      ) {
        const url = yield* publicUrlOf(post, attachment.mediaId);

        if (described.kind === "image") {
          return withText({ image_url: url }, "alt_text", attachment.altText);
        }

        if (inCarousel) {
          return { media_type: "VIDEO", video_url: url };
        }

        const reel = yield* Option.match(instagramOptionsOf(post), {
          onNone: () => Effect.succeed({}),
          onSome: (chosen) =>
            reelParams(chosen, (mediaId) => publicUrlOf(post, mediaId)),
        });

        return { media_type: "REELS", video_url: url, ...reel };
      }
    );

    const container = (post: OutgoingPost, params: Record<string, string>) =>
      step(
        post,
        api,
        "media",
        (auth, on) =>
          formPost(account(on, post, "/media"), { ...params, ...auth }),
        IdSchema
      ).pipe(Effect.map(({ id }) => id));

    const prepare = Effect.fn("InstagramClient.prepare")(function* prepare(
      post: OutgoingPost
    ) {
      // A quota Meta will not tell is not one to stop for: the post itself
      // then finds out.
      yield* quotaCheck(post).pipe(
        Effect.catchTag("BadRequest", () => Effect.void)
      );

      const attached = yield* Effect.forEach(
        post.media,
        (attachment) =>
          describe(post, attachment).pipe(
            Effect.map((described) => ({ attachment, described }))
          ),
        { concurrency: 1 }
      );

      const video = hasVideo(attached.map(({ described }) => described));
      const [single, ...others] = attached;

      // The platform rules ask for media when the post is scheduled.
      if (single === undefined) {
        return yield* new BadRequest({ code: "mediaRequired" });
      }

      if (isStory(post)) {
        // The platform rules take one file on a story.
        if (others.length > 0) {
          return yield* new BadRequest({ code: "tooManyMedia" });
        }

        const url = yield* publicUrlOf(post, single.attachment.mediaId);
        const id = yield* container(post, storyParams(url, single.described));

        return processing({ items: [], post: Option.some(id), video });
      }

      if (others.length === 0) {
        const params = yield* mediaParams(
          post,
          single.attachment,
          single.described,
          false
        );

        const id = yield* container(post, {
          ...withText(params, "caption", post.text),
          ...collaboratorsOf(instagramOptionsOf(post)),
        });

        return processing({ items: [], post: Option.some(id), video });
      }

      // A carousel: each item first, in the post's order.
      const items = yield* Effect.forEach(
        attached,
        ({ attachment, described }) =>
          mediaParams(post, attachment, described, true).pipe(
            Effect.flatMap((params) =>
              container(post, { ...params, is_carousel_item: "true" })
            )
          ),
        { concurrency: 1 }
      );

      return processing({ items, post: Option.none(), video });
    });

    const statusOf = (post: OutgoingPost, containerId: string) =>
      step(
        post,
        api,
        "read",
        (auth, on) =>
          query(apiUrl(on, `/${encodeURIComponent(containerId)}`), {
            ...auth,
            fields: "status_code,status",
          }),
        StatusSchema
      ).pipe(
        Effect.map(({ status, status_code: code }) => ({
          code: errorCodeOf(status),
          status: code,
        }))
      );

    const poll = Effect.fn("InstagramClient.poll")(function* poll(
      post: OutgoingPost,
      prepared: Containers
    ) {
      const pending = Option.match(prepared.post, {
        onNone: () => prepared.items,
        onSome: (id) => [id],
      });

      const statuses = yield* Effect.forEach(
        pending,
        (id) => statusOf(post, id),
        { concurrency: 1 }
      );

      if ((yield* settledStatuses(statuses)) === "inProgress") {
        return processing(prepared);
      }

      if (Option.isSome(prepared.post)) {
        return { _tag: "ready", prepared } as const;
      }

      // Every item is processed: the carousel's own container comes next.
      const id = yield* container(post, {
        ...withText(
          { children: prepared.items.join(","), media_type: "CAROUSEL" },
          "caption",
          post.text
        ),
        ...collaboratorsOf(instagramOptionsOf(post)),
      });

      return processing({ ...prepared, post: Option.some(id) });
    });

    const permalinkOf = (id: string, auth: GraphAuth, on: PublishingAccount) =>
      readWith(
        api,
        query(apiUrl(on, `/${encodeURIComponent(id)}`), {
          ...auth,
          fields: "permalink",
        }),
        PermalinkSchema
      ).pipe(Effect.map(({ permalink }) => publishedAs(id, permalink)));

    const commit = Effect.fn("InstagramClient.commit")(function* commit(
      post: OutgoingPost,
      prepared: Containers
    ) {
      if (Option.isNone(prepared.post)) {
        return yield* Effect.die(
          new Error("No Instagram container to publish")
        );
      }

      const creationId = prepared.post.value;

      return yield* commitCall(
        post,
        api,
        (auth, on) =>
          formPost(account(on, post, "/media_publish"), {
            ...auth,
            creation_id: creationId,
          }),
        IdSchema,
        ({ id }, auth, on) =>
          isStory(post)
            ? Effect.succeed(publishedAs(id, undefined))
            : permalinkOf(id, auth, on),
        ({ id }): Published => ({
          _tag: "published",
          platformPostId: PlatformPostIdSchema.make(id),
        })
      );
    });

    // The account's latest posts: the media edge lists newest first.
    const recentPosts = (post: OutgoingPost) =>
      step(
        post,
        api,
        "read",
        (auth, on) =>
          query(account(on, post, "/media"), {
            ...auth,
            fields: "id,caption,permalink,timestamp",
            limit: "25",
          }),
        MediaListSchema
      ).pipe(Effect.map(({ data }) => data.map(listedOf)));

    const foundAmong = (post: OutgoingPost) =>
      recentPosts(post).pipe(
        Effect.map((listed) => matchingPost(post, listed))
      );

    const lookUp = (post: OutgoingPost, prepared: Option.Option<Containers>) =>
      Option.match(
        prepared.pipe(Option.flatMap((containers) => containers.post)),
        {
          // A resumed attempt: its post can only be found, never ruled out.
          // A story cannot be found: it ends unconfirmed, for the member to
          // check, and is never sent again.
          onNone: () =>
            isStory(post)
              ? Effect.succeed<LookUp>({ _tag: "unknown" })
              : foundAmong(post).pipe(
                  Effect.map(
                    Option.match({
                      onNone: () => ({ _tag: "unknown" }) as const,
                      onSome: (found) =>
                        ({
                          _tag: "found",
                          published: publishedOf(found),
                        }) as const,
                    })
                  )
                ),
          // A published story is named by its container: the account's
          // media are never searched for it.
          onSome: (containerId) =>
            statusOf(post, containerId).pipe(
              Effect.flatMap(({ status }) =>
                lookUpOf(status, containerId, () =>
                  isStory(post)
                    ? Effect.succeed(Option.none())
                    : foundAmong(post)
                )
              )
            ),
        }
      );

    const steps: PublicationSteps<Containers> = {
      commit,
      confirmation: { _tag: "lookUp", lookUp },
      platform: "instagram",
      poll,
      prepare,
    };

    return sequenced(steps, options.timing ?? defaultStepTiming);
  }
);
