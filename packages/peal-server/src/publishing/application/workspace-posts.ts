import { Effect, Option } from "effect";

import {
  ChannelOptions,
  optionsOn,
} from "#publishing/domain/channel-options.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import {
  createTarget,
  isDropped,
  withOptions,
} from "#publishing/domain/post-target.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import { newId } from "#shared/application/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";

import { PostNotFound } from "./post-not-found.ts";
import { PostRepository } from "./post-repository.ts";
import type { StoredPost } from "./post-repository.ts";

// A post is only found in the workspace that owns it: another workspace's
// post is PostNotFound, whatever its id.

const inWorkspace = (workspaceId: WorkspaceId, postId: PostId) =>
  Effect.flatMap(
    Option.match({
      onNone: () => Effect.fail(new PostNotFound({ postId })),
      onSome: (found: StoredPost) =>
        found.post.workspaceId === workspaceId
          ? Effect.succeed(found)
          : Effect.fail(new PostNotFound({ postId })),
    })
  );

/** The workspace's post, as stored now. */
export const findInWorkspace = (workspaceId: WorkspaceId, postId: PostId) =>
  PostRepository.use((posts) => posts.find(postId)).pipe(
    inWorkspace(workspaceId, postId)
  );

/** The workspace's post, locked until the transaction ends. */
export const lockInWorkspace = (workspaceId: WorkspaceId, postId: PostId) =>
  PostRepository.use((posts) => posts.lock(postId)).pipe(
    inWorkspace(workspaceId, postId)
  );

/**
 * The targets a post has on these channels, in their order: the one it
 * already has on a channel, or a new one. Given `options`, each target has
 * the options they give on its channel, or none; otherwise each keeps its
 * own, and a new one has none.
 */
export const targetsOn = Effect.fn("Publishing.targetsOn")(function* targetsOn(
  postId: PostId,
  channelIds: readonly ChannelId[],
  existing: readonly PostTarget[] = [],
  options: Option.Option<readonly ChannelOptions[]> = Option.none()
) {
  const chosenOn = (channelId: ChannelId) =>
    options.pipe(Option.flatMap((given) => optionsOn(given, channelId)));

  return yield* Effect.all(
    channelIds.map((channelId) =>
      Option.match(
        Option.fromUndefinedOr(
          // A channel taken off the post and chosen again starts afresh.
          existing.find(
            (target) => target.channelId === channelId && !isDropped(target)
          )
        ),
        {
          onNone: () =>
            newId(PostTargetIdSchema).pipe(
              Effect.map((targetId) =>
                createTarget(targetId, postId, channelId, chosenOn(channelId))
              )
            ),
          onSome: (target) =>
            Effect.succeed(
              Option.isSome(options)
                ? withOptions(target, chosenOn(channelId))
                : target
            ),
        }
      )
    )
  );
});

/** The options the targets on these channels have, channel by channel. */
export const optionsOfTargets = (
  targets: readonly PostTarget[],
  channelIds: readonly ChannelId[]
): readonly ChannelOptions[] =>
  targets.flatMap(({ channelId, options }) =>
    channelIds.includes(channelId)
      ? options.pipe(
          Option.map(
            (chosen) => new ChannelOptions({ channelId, options: chosen })
          ),
          Option.toArray
        )
      : []
  );
