import { Effect, Option } from "effect";

import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { createTarget } from "#publishing/domain/post-target.ts";
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
 * already has on a channel, or a new one.
 */
export const targetsOn = Effect.fn("Publishing.targetsOn")(function* targetsOn(
  postId: PostId,
  channelIds: readonly ChannelId[],
  existing: readonly PostTarget[] = []
) {
  return yield* Effect.all(
    channelIds.map((channelId) =>
      Option.match(
        Option.fromUndefinedOr(
          existing.find((target) => target.channelId === channelId)
        ),
        {
          onNone: () =>
            newId(PostTargetIdSchema).pipe(
              Effect.map((targetId) =>
                createTarget(targetId, postId, channelId)
              )
            ),
          onSome: Effect.succeed,
        }
      )
    )
  );
});
