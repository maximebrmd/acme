import { DateTime, Duration, Effect, Option } from "effect";

import type { PublishableMedia } from "#publishing/application/media-for-publishing.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import type {
  LookUp,
  Readiness,
} from "#publishing/application/publication-steps.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { Published } from "#shared/domain/publish-result.ts";

// Threads and Instagram publish in two steps: a media container is made from
// the post (its media fetched from public URLs, its text), Meta processes
// it, and publishing the container makes the post live. A container is
// published once at most, and its status says whether it was: that is what
// confirms an unknown outcome.

/**
 * The containers of a post: the items of a carousel, processed first, and
 * the container that publishes, once it is made; `video` when Meta has a
 * video to process, which takes longer.
 */
export interface Containers {
  readonly items: readonly string[];
  readonly post: Option.Option<string>;
  readonly video: boolean;
}

/** A container's status, as both APIs name them. */
export type ContainerStatus =
  | "ERROR"
  | "EXPIRED"
  | "FINISHED"
  | "IN_PROGRESS"
  | "PUBLISHED";

/** How long Meta may take to fetch the media from the URLs given. */
export const mediaUrlLifetime = Duration.hours(2);

/** Whether any of the media is a video. */
export const hasVideo = (media: readonly PublishableMedia[]): boolean =>
  media.some(({ kind }) => kind === "video");

/**
 * The containers, waiting for Meta to process them: looked at every few
 * seconds, or every quarter of a minute with a video.
 */
export const processing = (containers: Containers): Readiness<Containers> => ({
  _tag: "processing",
  pollAfter: containers.video ? Duration.seconds(15) : Duration.seconds(5),
  prepared: containers,
});

/**
 * What the statuses of containers Meta processes come to: an error refuses
 * the media; an expired container (unpublished for a day) lets a later
 * attempt make new ones; any still in progress waits.
 */
export const settledStatuses = (
  statuses: readonly {
    readonly code: string;
    readonly status: ContainerStatus;
  }[]
): Effect.Effect<"finished" | "inProgress", PublishFailure> => {
  const failed = statuses.find(({ status }) => status === "ERROR");

  if (failed !== undefined) {
    return Effect.fail(new MediaRejected({ code: failed.code }));
  }

  if (statuses.some(({ status }) => status === "EXPIRED")) {
    return Effect.fail(new PlatformUnavailable());
  }

  return Effect.succeed(
    statuses.every(
      ({ status }) => status === "FINISHED" || status === "PUBLISHED"
    )
      ? "finished"
      : "inProgress"
  );
};

/** One of the account's recent posts, as Meta lists them. */
export interface ListedPost {
  readonly id: string;
  readonly permalink: Option.Option<string>;
  readonly text: string;
  readonly timestamp: Option.Option<DateTime.Utc>;
}

// Meta's clock and Acme's may differ by a little.
const clockSlack = Duration.minutes(1);

/**
 * The attempt's post among the account's recent ones: the one published
 * since the attempt started with the post's text, when exactly one is.
 */
export const matchingPost = (
  post: OutgoingPost,
  listed: readonly ListedPost[]
): Option.Option<ListedPost> => {
  const since = DateTime.subtractDuration(post.startedAt, clockSlack);

  const matches = listed.filter(
    (candidate) =>
      candidate.text.trim() === post.text.trim() &&
      Option.match(candidate.timestamp, {
        onNone: () => true,
        onSome: (at) => DateTime.isGreaterThanOrEqualTo(at, since),
      })
  );

  const [only, ...others] = matches;

  return only !== undefined && others.length === 0
    ? Option.some(only)
    : Option.none();
};

/** A listed post as a published result. */
export const publishedOf = (found: ListedPost): Published => ({
  _tag: "published",
  platformPostId: PlatformPostIdSchema.make(found.id),
  ...Option.match(found.permalink, {
    onNone: () => ({}),
    onSome: (permalink) => ({ permalink }),
  }),
});

/**
 * What a container's status says of the post, once its publish was sent:
 * published, or definitely not (finished but unpublished, failed, or
 * expired: publishing it again posts at most once, as a container is
 * published once), or not yet known.
 *
 * Published, the post is looked for among the account's recent ones
 * (`listed`), for its own id and address. When it is not listed yet, or the
 * list does not answer, the container names it until analytics need its
 * own id: Meta said it is live, which no failure to list undoes.
 */
export const lookUpOf = (
  status: ContainerStatus,
  containerId: string,
  listed: () => Effect.Effect<Option.Option<ListedPost>, PublishFailure>
): Effect.Effect<LookUp> => {
  if (status === "PUBLISHED") {
    return listed().pipe(
      Effect.orElseSucceed(() => Option.none<ListedPost>()),
      Effect.map((found): LookUp => ({
        _tag: "found",
        published: Option.match(found, {
          onNone: (): Published => ({
            _tag: "published",
            platformPostId: PlatformPostIdSchema.make(containerId),
          }),
          onSome: publishedOf,
        }),
      }))
    );
  }

  return Effect.succeed<LookUp>(
    status === "IN_PROGRESS" ? { _tag: "unknown" } : { _tag: "absent" }
  );
};
