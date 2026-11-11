import { DateTime, Duration, Effect, Option, Schema } from "effect";

import { MediaForPublishing } from "#publishing/application/media-for-publishing.ts";
import type { PublishableMedia } from "#publishing/application/media-for-publishing.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import {
  defaultStepTiming,
  sequenced,
} from "#publishing/application/publication-steps.ts";
import type {
  PublicationSteps,
  StepTiming,
} from "#publishing/application/publication-steps.ts";
import type { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { ThreadsOptions } from "#publishing/domain/threads-options.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { Published } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { threadsUrl } from "#shared/infrastructure/platforms/meta-graph.ts";
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
  unixSeconds,
  withText,
} from "./graph-calls.ts";
import type { GraphAuth, MetaHttp } from "./graph-calls.ts";

// From Meta's Threads "Posts", "Troubleshooting" and "Publishing Limits"
// pages: a container per post (TEXT, IMAGE or VIDEO, or a CAROUSEL of 2 to
// 20 items made first), whose `status` runs IN_PROGRESS, FINISHED,
// PUBLISHED, or ERROR with a code, or EXPIRED after a day unpublished.
const IdSchema = Schema.Struct({ id: Schema.NonEmptyString });

const StatusSchema = Schema.Struct({
  error_message: Schema.optionalKey(Schema.String),
  status: Schema.Literals([
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

const ThreadsSchema = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      id: Schema.NonEmptyString,
      permalink: Schema.optionalKey(Schema.String),
      text: Schema.optionalKey(Schema.String),
      timestamp: Schema.optionalKey(Schema.String),
    })
  ),
});

// The file types Threads takes; the platform rules refuse others before.
const formats: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "video/mp4",
  "video/quicktime",
]);

const isThreads = Schema.is(ThreadsOptions);

/**
 * The parameters the post's options give the container that publishes
 * (the single one, or the carousel's own, never its items), each only when
 * chosen. A link attachment goes on a post of text alone, as scheduling
 * refuses it with media.
 */
/** What a Threads container takes of a post's options. */
interface ContainerOptions {
  link_attachment?: string;
  reply_control?: string;
  topic_tag?: string;
}

const optionParams = (post: OutgoingPost): ContainerOptions => {
  const params: ContainerOptions = {};
  const chosen = post.options.pipe(Option.filter(isThreads));

  if (Option.isNone(chosen)) {
    return params;
  }

  const { linkAttachment, replyControl, topicTag } = chosen.value;

  if (replyControl !== undefined) {
    params.reply_control = replyControl;
  }

  if (topicTag !== undefined) {
    params.topic_tag = topicTag;
  }

  if (linkAttachment !== undefined && post.media.length === 0) {
    params.link_attachment = linkAttachment;
  }

  return params;
};

const listedOf = (
  listed: (typeof ThreadsSchema.Type)["data"][number]
): ListedPost => ({
  id: listed.id,
  permalink: Option.fromUndefinedOr(listed.permalink),
  text: listed.text ?? "",
  timestamp: Option.fromUndefinedOr(listed.timestamp).pipe(
    Option.flatMap((at) => DateTime.make(at)),
    Option.map(DateTime.toUtc)
  ),
});

/**
 * Publishes on Threads: makes a container of the post (and, for a carousel,
 * one per item first), with its text, images and videos fetched by Meta from
 * the media's public URLs, waits until Meta has processed them, then
 * publishes the container. Before making any, it checks the account's daily
 * publishing quota. An unknown outcome is settled by the container's
 * status, which reads PUBLISHED once the post is live; a resumed attempt,
 * which has no container, looks for the post among the account's recent
 * ones.
 */
export const threadsClient = Effect.fn("ThreadsClient.make")(
  function* threadsClient(options: {
    readonly api: MetaHttp;
    readonly hosts: MetaHosts;
    readonly timing?: StepTiming;
  }) {
    const media = yield* MediaForPublishing;
    const { api, hosts } = options;

    const { commit: commitCall, step } = yield* graphCalls({
      // Threads' own app secret is not asked for its calls.
      appSecret: Option.none(),
    });

    const quotaCheck = Effect.fn("ThreadsClient.quota")(function* quotaCheck(
      post: OutgoingPost
    ) {
      const quota = yield* step(
        post,
        api,
        "read",
        (auth) =>
          query(
            threadsUrl(
              hosts,
              `/${encodeURIComponent(post.accountId)}/threads_publishing_limit`
            ),
            { ...auth, fields: "quota_usage,config" }
          ),
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

    const describe = Effect.fn("ThreadsClient.describe")(function* describe(
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

    // A container of one image or video, with what it needs: its URL, its
    // alt text, and the post's text unless it is a carousel item.
    const itemParams = Effect.fn("ThreadsClient.itemParams")(
      function* itemParams(
        post: OutgoingPost,
        attachment: MediaAttachment,
        described: PublishableMedia
      ) {
        const url = yield* media.publicUrl(
          post.workspaceId,
          attachment.mediaId,
          mediaUrlLifetime
        );

        const params: Record<string, string> =
          described.kind === "image"
            ? { image_url: url, media_type: "IMAGE" }
            : { media_type: "VIDEO", video_url: url };

        return attachment.altText.trim() === ""
          ? params
          : { ...params, alt_text: attachment.altText };
      }
    );

    const container = (post: OutgoingPost, params: Record<string, string>) =>
      step(
        post,
        api,
        "media",
        (auth) =>
          formPost(
            threadsUrl(hosts, `/${encodeURIComponent(post.accountId)}/threads`),
            { ...params, ...auth }
          ),
        IdSchema
      ).pipe(Effect.map(({ id }) => id));

    const prepare = Effect.fn("ThreadsClient.prepare")(function* prepare(
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

      if (single === undefined) {
        const id = yield* container(post, {
          media_type: "TEXT",
          text: post.text,
          ...optionParams(post),
        });

        return processing({ items: [], post: Option.some(id), video });
      }

      if (others.length === 0) {
        const params = yield* itemParams(
          post,
          single.attachment,
          single.described
        );

        const id = yield* container(post, {
          ...withText(params, "text", post.text),
          ...optionParams(post),
        });

        return processing({ items: [], post: Option.some(id), video });
      }

      // A carousel: each item first, in the post's order.
      const items = yield* Effect.forEach(
        attached,
        ({ attachment, described }) =>
          itemParams(post, attachment, described).pipe(
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
        (auth) =>
          query(threadsUrl(hosts, `/${encodeURIComponent(containerId)}`), {
            ...auth,
            fields: "status,error_message",
          }),
        StatusSchema
      ).pipe(
        Effect.map(({ error_message: message, status }) => ({
          code: statusCodeOf(message, "processingFailed"),
          status,
        }))
      );

    const poll = Effect.fn("ThreadsClient.poll")(function* poll(
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

      const settled = yield* settledStatuses(statuses);

      if (settled === "inProgress") {
        return processing(prepared);
      }

      if (Option.isSome(prepared.post)) {
        return { _tag: "ready", prepared } as const;
      }

      // Every item is processed: the carousel's own container comes next.
      const id = yield* container(post, {
        ...withText(
          { children: prepared.items.join(","), media_type: "CAROUSEL" },
          "text",
          post.text
        ),
        ...optionParams(post),
      });

      return processing({ ...prepared, post: Option.some(id) });
    });

    const permalinkOf = (id: string, auth: GraphAuth) =>
      readWith(
        api,
        query(threadsUrl(hosts, `/${encodeURIComponent(id)}`), {
          ...auth,
          fields: "permalink",
        }),
        PermalinkSchema
      ).pipe(Effect.map(({ permalink }) => publishedAs(id, permalink)));

    const commit = Effect.fn("ThreadsClient.commit")(function* commit(
      post: OutgoingPost,
      prepared: Containers
    ) {
      if (Option.isNone(prepared.post)) {
        return yield* Effect.die(new Error("No Threads container to publish"));
      }

      const creationId = prepared.post.value;

      return yield* commitCall(
        post,
        api,
        (auth) =>
          formPost(
            threadsUrl(
              hosts,
              `/${encodeURIComponent(post.accountId)}/threads_publish`
            ),
            { ...auth, creation_id: creationId }
          ),
        IdSchema,
        ({ id }, auth) => permalinkOf(id, auth),
        ({ id }): Published => ({
          _tag: "published",
          platformPostId: PlatformPostIdSchema.make(id),
        })
      );
    });

    // The account's posts since the attempt started, newest first.
    const recentPosts = (post: OutgoingPost) =>
      step(
        post,
        api,
        "read",
        (auth) =>
          query(
            threadsUrl(hosts, `/${encodeURIComponent(post.accountId)}/threads`),
            {
              ...auth,
              fields: "id,permalink,text,timestamp",
              limit: "25",
              since: unixSeconds(
                DateTime.subtractDuration(post.startedAt, Duration.minutes(1))
              ),
            }
          ),
        ThreadsSchema
      ).pipe(Effect.map(({ data }) => data.map(listedOf)));

    const lookUp = (post: OutgoingPost, prepared: Option.Option<Containers>) =>
      Option.match(
        prepared.pipe(Option.flatMap((containers) => containers.post)),
        {
          // A resumed attempt: its post can only be found, never ruled out.
          onNone: () =>
            recentPosts(post).pipe(
              Effect.map((listed) =>
                Option.match(matchingPost(post, listed), {
                  onNone: () => ({ _tag: "unknown" }) as const,
                  onSome: (found) =>
                    ({ _tag: "found", published: publishedOf(found) }) as const,
                })
              )
            ),
          onSome: (containerId) =>
            statusOf(post, containerId).pipe(
              Effect.flatMap(({ status }) =>
                lookUpOf(status, containerId, () =>
                  recentPosts(post).pipe(
                    Effect.map((listed) => matchingPost(post, listed))
                  )
                )
              )
            ),
        }
      );

    const steps: PublicationSteps<Containers> = {
      commit,
      confirmation: { _tag: "lookUp", lookUp },
      platform: "threads",
      poll,
      prepare,
    };

    return sequenced(steps, options.timing ?? defaultStepTiming);
  }
);
