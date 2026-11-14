import { DateTime, Duration, Effect, Option } from "effect";

import type { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import type {
  OutgoingPost,
  PlatformClient,
} from "#publishing/application/platform-client.ts";
import { sequenced } from "#publishing/application/publication-steps.ts";
import type {
  LookUp,
  PublicationSteps,
  StepTiming,
} from "#publishing/application/publication-steps.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type {
  PlatformPostId,
  Published,
} from "#shared/domain/publish-result.ts";

// A first comment: what the account says under its own post once the
// post is live, the post's part after the first on a platform whose parts
// are comments (`platform-rules.ts`). Platforms take no idempotency key
// for a comment, so a comment whose answer was lost is never sent again:
// it is looked for among the post's comments, as the inbox looks for a
// reply (`foundAmong`).

/** A comment under the post, as its platform lists it. */
export interface ListedComment {
  /** Written by the channel's account. */
  readonly fromAccount: boolean;
  readonly id: string;
  readonly text: string;
  readonly writtenAt: Option.Option<DateTime.Utc>;
}

/**
 * How far the platform's clock and Peal's may differ when a comment's time
 * there is compared with when the attempt started.
 */
const clockSkew = Duration.minutes(1);

/**
 * The comment an attempt made, among every comment the platform lists
 * under the post: the only one by the account, written since the attempt
 * started (give or take `clockSkew`), with its text. None found may be one
 * the platform has not listed yet, and two alike cannot be told apart:
 * neither settles anything, and the comment is never sent again.
 */
export const commentAmong = (
  post: OutgoingPost,
  listed: readonly ListedComment[]
): Option.Option<ListedComment> => {
  const since = DateTime.subtractDuration(post.startedAt, clockSkew);
  const text = post.text.trim();

  const [only, ...others] = listed.filter(
    (candidate) =>
      candidate.fromAccount &&
      candidate.text.trim() === text &&
      Option.exists(candidate.writtenAt, (at) =>
        DateTime.isGreaterThanOrEqualTo(at, since)
      )
  );

  return only === undefined || others.length > 0
    ? Option.none()
    : Option.some(only);
};

/** A comment made, as a part that went live: its id, no address. */
export const commentPublished = (id: string): Published => ({
  _tag: "published",
  platformPostId: PlatformPostIdSchema.make(id),
});

/** How a platform makes a comment under a post, and lists them. */
export interface CommentCalls {
  /**
   * The one request that makes the comment under the post `root`:
   * OutcomeUnknown when it may have.
   */
  readonly comment: (
    post: OutgoingPost,
    root: PlatformPostId
  ) => Effect.Effect<Published, OutcomeUnknown | PublishFailure>;
  /**
   * Every comment under `root` that may be the attempt's, or none when the
   * platform could not list them whole: a list that may miss some proves
   * nothing.
   */
  readonly list: (
    post: OutgoingPost,
    root: PlatformPostId
  ) => Effect.Effect<Option.Option<readonly ListedComment[]>>;
  readonly platform: Platform;
}

const noRoot = new BadRequest({ code: ownRefusalCodes.replyTargetUnknown });

// The post a comment goes under: the first part, as the router names it.
const rootOf = (
  post: OutgoingPost
): Effect.Effect<PlatformPostId, BadRequest> =>
  Option.match(post.replyTo, {
    onNone: () => Effect.fail(noRoot),
    onSome: ({ root }) => Effect.succeed(root),
  });

/**
 * The steps of a first comment: nothing to upload or wait for, one
 * request, and a look among the post's comments when its answer was lost
 * or the run resumed, which answers `found` or `unknown`, never `absent`,
 * so the comment is never sent twice.
 */
export const commentSteps = (
  calls: CommentCalls
): PublicationSteps<PlatformPostId> => ({
  commit: (post, root) => calls.comment(post, root),
  confirmation: {
    _tag: "lookUp",
    lookUp: (post) =>
      rootOf(post).pipe(
        Effect.flatMap((root) => calls.list(post, root)),
        Effect.map((listed): LookUp => {
          const found = listed.pipe(
            Option.flatMap((comments) => commentAmong(post, comments))
          );

          return Option.match(found, {
            onNone: () => ({ _tag: "unknown" }),
            onSome: ({ id }) => ({
              _tag: "found",
              published: commentPublished(id),
            }),
          });
        }),
        Effect.orElseSucceed((): LookUp => ({ _tag: "unknown" }))
      ),
  },
  platform: calls.platform,
  poll: (_post, root) => Effect.succeed({ _tag: "ready", prepared: root }),
  prepare: (post) =>
    rootOf(post).pipe(
      Effect.map((root) => ({ _tag: "ready", prepared: root }) as const)
    ),
});

/**
 * The platform's client with its first comments: the post itself goes
 * through `posts`, the part after it, a comment under the post, through
 * the comment's steps.
 */
export const withFirstComments = (
  posts: PlatformClient,
  calls: CommentCalls,
  timing?: StepTiming
): PlatformClient => {
  const comments = sequenced(commentSteps(calls), timing);

  const clientOf = (post: OutgoingPost) => (post.part === 0 ? posts : comments);

  return {
    platform: posts.platform,
    publish: (post) => clientOf(post).publish(post),
    resume: (post) => clientOf(post).resume(post),
  };
};
