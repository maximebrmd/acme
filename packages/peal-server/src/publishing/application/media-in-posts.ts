import { Context, Effect, Layer, Option } from "effect";

import { PostContent } from "#publishing/domain/post-content.ts";
import type { PostStatusName } from "#publishing/domain/post-status.ts";
import { editDraft } from "#publishing/domain/post.ts";
import type { Post } from "#publishing/domain/post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { MediaAssetId, PostId, WorkspaceId } from "#shared/domain/ids.ts";

import { PostRepository } from "./post-repository.ts";

/** The posts that show a media asset, by where they are in their life. */
export interface MediaUse {
  /** Drafts: they lose the media when it is deleted. */
  readonly drafts: readonly PostId[];
  /**
   * Posts scheduled or publishing: they still need it, so it may not be
   * deleted.
   */
  readonly scheduled: readonly PostId[];
}

/** What releasing the media came to. */
export type MediaRelease =
  // Posts about to go out show it: nothing changed.
  | { readonly _tag: "inUse"; readonly scheduled: readonly PostId[] }
  // These drafts no longer show it.
  | { readonly _tag: "released"; readonly drafts: readonly PostId[] }
  // No post that may still go out shows it.
  | { readonly _tag: "unused" };

const draftStatuses: readonly PostStatusName[] = ["draft"];

const scheduledStatuses: readonly PostStatusName[] = [
  // A post that waits for an approval is shown to its reviewers as it is.
  "awaitingApproval",
  "scheduled",
  "publishing",
];

const ids = (posts: readonly Post[]) => posts.map(({ id }) => id);

const shows = (post: Post, mediaId: MediaAssetId) =>
  post.content.media.some((attachment) => attachment.mediaId === mediaId);

const without = (post: Post, mediaId: MediaAssetId) =>
  new PostContent({
    media: post.content.media.filter(
      (attachment) => attachment.mediaId !== mediaId
    ),
    overrides: post.content.overrides,
    text: post.content.text,
  });

/**
 * Which posts show a media asset, for the media context, which asks before
 * deleting one: a post scheduled or publishing keeps it from being deleted,
 * and drafts let go of it. Finished and cancelled posts keep their media ids
 * as they were. It acts for the workspace, as the media context checked who
 * deletes.
 */
export class MediaInPosts extends Context.Service<
  MediaInPosts,
  {
    readonly usage: (
      workspaceId: WorkspaceId,
      mediaId: MediaAssetId
    ) => Effect.Effect<MediaUse, DatabaseError>;
    /**
     * Takes the media off the workspace's drafts, unless a post scheduled or
     * publishing shows it, all in one transaction: the caller deletes the
     * media once it is released.
     */
    readonly release: (
      workspaceId: WorkspaceId,
      mediaId: MediaAssetId
    ) => Effect.Effect<MediaRelease, DatabaseError>;
  }
>()("peal-server/publishing/application/MediaInPosts") {
  static readonly layer = Layer.effect(
    MediaInPosts,
    Effect.gen(function* MediaInPostsLive() {
      const posts = yield* PostRepository;
      const { transaction } = yield* TransactionRunner;

      const usage = Effect.fn("MediaInPosts.usage")(function* usage(
        workspaceId: WorkspaceId,
        mediaId: MediaAssetId
      ) {
        const scheduled = yield* posts.showing(
          workspaceId,
          mediaId,
          scheduledStatuses
        );

        const drafts = yield* posts.showing(
          workspaceId,
          mediaId,
          draftStatuses
        );

        const use: MediaUse = {
          drafts: ids(drafts),
          scheduled: ids(scheduled),
        };

        return use;
      });

      // The drafts as they are once locked: one scheduled since it was
      // listed counts as scheduled, so it keeps the media.
      const lockedDrafts = Effect.fn("MediaInPosts.lockedDrafts")(
        function* lockedDrafts(
          postIds: readonly PostId[],
          mediaId: MediaAssetId
        ) {
          const locked = yield* Effect.all(
            postIds.map((postId) =>
              posts
                .lock(postId)
                .pipe(
                  Effect.map((found) =>
                    found.pipe(Option.map(({ post }) => post))
                  )
                )
            )
          );

          const showing = locked
            .flatMap(Option.toArray)
            .filter((post) => shows(post, mediaId));

          return {
            drafts: showing.filter(({ status }) => status._tag === "draft"),
            scheduled: showing.filter(({ status }) =>
              scheduledStatuses.includes(status._tag)
            ),
          };
        }
      );

      const detach = (post: Post, mediaId: MediaAssetId) =>
        Effect.fromResult(editDraft(post, without(post, mediaId))).pipe(
          Effect.orDie,
          Effect.flatMap((edited) => posts.update(edited, post)),
          Effect.flatMap((written) =>
            written
              ? Effect.void
              : Effect.die("A draft changed under its row lock")
          )
        );

      const release = Effect.fn("MediaInPosts.release")(function* release(
        workspaceId: WorkspaceId,
        mediaId: MediaAssetId
      ) {
        return yield* transaction(
          Effect.gen(function* releasing() {
            const listed = yield* usage(workspaceId, mediaId);

            if (listed.drafts.length === 0 && listed.scheduled.length === 0) {
              const unused: MediaRelease = { _tag: "unused" };

              return unused;
            }

            const { drafts, scheduled } = yield* lockedDrafts(
              listed.drafts,
              mediaId
            );

            if (listed.scheduled.length > 0 || scheduled.length > 0) {
              const inUse: MediaRelease = {
                _tag: "inUse",
                scheduled: [...listed.scheduled, ...ids(scheduled)],
              };

              return inUse;
            }

            yield* Effect.forEach(drafts, (draft) => detach(draft, mediaId), {
              discard: true,
            });

            const released: MediaRelease = {
              _tag: "released",
              drafts: ids(drafts),
            };

            return released;
          })
        );
      });

      return MediaInPosts.of({ release, usage });
    })
  );
}
