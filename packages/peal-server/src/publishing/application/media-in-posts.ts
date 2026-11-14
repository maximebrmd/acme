import { Context, DateTime, Effect, Layer, Option } from "effect";

import { contentWithout } from "#publishing/domain/article-content.ts";
import type { ArticleId } from "#publishing/domain/article-id.ts";
import { fileDeleted, mayStillBeSent } from "#publishing/domain/article.ts";
import type { Article } from "#publishing/domain/article.ts";
import type { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { keepingMedia, namesMedia } from "#publishing/domain/named-media.ts";
import { PostContent, shownMedia } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import type { PostStatusName } from "#publishing/domain/post-status.ts";
import { withOptions } from "#publishing/domain/post-target.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import { editDraft } from "#publishing/domain/post.ts";
import type { Post } from "#publishing/domain/post.ts";
import {
  changedOverride,
  TextOverride,
} from "#publishing/domain/text-override.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { MediaAssetId, PostId, WorkspaceId } from "#shared/domain/ids.ts";

import { ArticleStore } from "./article-store.ts";
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
  /**
   * Articles that show it: those scheduled or publishing keep it from
   * being deleted; drafts, failed ones and those to check lose it when it
   * is, and one already on its site keeps the id it went out with.
   */
  readonly articles: {
    readonly drafts: readonly ArticleId[];
    readonly scheduled: readonly ArticleId[];
  };
}

/** What releasing the media came to. */
export type MediaRelease =
  // Posts or articles about to go out show it: nothing changed.
  | {
      readonly _tag: "inUse";
      readonly articles: readonly ArticleId[];
      readonly scheduled: readonly PostId[];
    }
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

// An article that still goes out, so needs its files.
const goesOut = (article: Article) =>
  article.state._tag === "scheduled" || article.state._tag === "publishing";

// The articles that show the media, by where they are: those on their
// site, which keep the id they went out with, are in neither.
const articleUse = (shown: readonly Article[]) => ({
  drafts: shown.flatMap((article) =>
    mayStillBeSent(article) ? [article.id] : []
  ),
  scheduled: shown.flatMap((article) => (goesOut(article) ? [article.id] : [])),
});

// A post with its targets, whose options may name files.
interface Locked {
  readonly post: Post;
  readonly targets: readonly PostTarget[];
}

const names = (targets: readonly PostTarget[], mediaId: MediaAssetId) =>
  targets.some(({ options }) =>
    Option.exists(options, (chosen) => namesMedia(chosen, mediaId))
  );

const shows = ({ post, targets }: Locked, mediaId: MediaAssetId) =>
  shownMedia(post.content).some(
    (attachment) => attachment.mediaId === mediaId
  ) || names(targets, mediaId);

const remaining = (media: readonly MediaAttachment[], mediaId: MediaAssetId) =>
  media.filter((attachment) => attachment.mediaId !== mediaId);

// The overrides with the media taken off those that give a channel some.
// One whose only files it took shows the part's media again, as the
// channel did before it had any of its own: a channel that chose to show
// none keeps showing none.
const overridesWithout = (
  overrides: readonly TextOverride[],
  mediaId: MediaAssetId
) =>
  overrides.map((override) => {
    if (
      override.media === undefined ||
      !override.media.some((attachment) => attachment.mediaId === mediaId)
    ) {
      return override;
    }

    const left = remaining(override.media, mediaId);

    return left.length === 0
      ? new TextOverride({ channelId: override.channelId, text: override.text })
      : changedOverride(override, { media: left });
  });

// The content with the media taken off every part that shows it, on any
// channel.
const without = (post: Post, mediaId: MediaAssetId) =>
  new PostContent({
    followUps: post.content.followUps.map(
      (part) =>
        new PostPart({
          delaySeconds: part.delaySeconds,
          media: remaining(part.media, mediaId),
          overrides: overridesWithout(part.overrides, mediaId),
          text: part.text,
        })
    ),
    media: remaining(post.content.media, mediaId),
    overrides: overridesWithout(post.content.overrides, mediaId),
    poll: post.content.poll,
    text: post.content.text,
  });

/**
 * Which posts show a media asset, or name it in their options (a
 * thumbnail, a cover), for the media context, which asks before deleting
 * one: a post scheduled or publishing keeps it from being deleted, and
 * drafts let go of it. Finished and cancelled posts keep their media ids
 * as they were. Articles count too: one scheduled or publishing keeps the
 * media, drafts and failed ones lose it, and those on their site keep the
 * id they went out with. It acts for the workspace, as the media context
 * checked who deletes.
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
      const articles = yield* ArticleStore;
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
          articles: articleUse(yield* articles.showing(workspaceId, mediaId)),
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

          const showing = yield* Effect.forEach(
            locked.flatMap(Option.toArray),
            (post) =>
              posts
                .targets(post.id)
                .pipe(Effect.map((targets): Locked => ({ post, targets })))
          ).pipe(
            Effect.map((found) =>
              found.filter((draft) => shows(draft, mediaId))
            )
          );

          return {
            drafts: showing.filter(({ post }) => post.status._tag === "draft"),
            scheduled: showing
              .filter(({ post }) =>
                scheduledStatuses.includes(post.status._tag)
              )
              .map(({ post }) => post),
          };
        }
      );

      // The draft without the media, in its parts and in the options of
      // its targets that name it.
      const detach = ({ post, targets }: Locked, mediaId: MediaAssetId) =>
        Effect.fromResult(editDraft(post, without(post, mediaId))).pipe(
          Effect.orDie,
          Effect.flatMap((edited) => posts.update(edited, post)),
          Effect.flatMap((written) =>
            written
              ? Effect.void
              : Effect.die("A draft changed under its row lock")
          ),
          Effect.andThen(
            names(targets, mediaId)
              ? posts.setTargets(
                  post.id,
                  targets.map((target) =>
                    withOptions(
                      target,
                      target.options.pipe(
                        Option.map((chosen) =>
                          keepingMedia(chosen, (kept) => kept !== mediaId)
                        )
                      )
                    )
                  )
                )
              : Effect.void
          )
        );

      // An article that may still be sent without the media, under its
      // row lock.
      const detachArticle = (article: Article, mediaId: MediaAssetId) =>
        DateTime.now.pipe(
          Effect.flatMap((now) =>
            Option.match(
              fileDeleted(
                article,
                contentWithout(article.content, mediaId),
                now
              ),
              {
                onNone: () => Effect.void,
                onSome: (detached) =>
                  articles
                    .update(detached, article)
                    .pipe(
                      Effect.flatMap((written) =>
                        written
                          ? Effect.void
                          : Effect.die("An article changed under its row lock")
                      )
                    ),
              }
            )
          )
        );

      const release = Effect.fn("MediaInPosts.release")(function* release(
        workspaceId: WorkspaceId,
        mediaId: MediaAssetId
      ) {
        return yield* transaction(
          Effect.gen(function* releasing() {
            // The articles first, held: one scheduled meanwhile waits for
            // this, and then finds the file gone from it.
            const showing = yield* articles.lockShowing(workspaceId, mediaId);
            const shown = articleUse(showing);

            const listed = yield* usage(workspaceId, mediaId);

            if (shown.scheduled.length > 0) {
              const inUse: MediaRelease = {
                _tag: "inUse",
                articles: shown.scheduled,
                scheduled: listed.scheduled,
              };

              return inUse;
            }

            // Once the media goes, the articles that may still be sent
            // lose it, as drafts do; one already on its site keeps the id
            // it went out with.
            const detachArticles = Effect.forEach(
              showing,
              (article) => detachArticle(article, mediaId),
              { discard: true }
            );

            if (listed.drafts.length === 0 && listed.scheduled.length === 0) {
              yield* detachArticles;

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
                articles: [],
                scheduled: [...listed.scheduled, ...ids(scheduled)],
              };

              return inUse;
            }

            yield* Effect.forEach(drafts, (draft) => detach(draft, mediaId), {
              discard: true,
            });

            yield* detachArticles;

            const released: MediaRelease = {
              _tag: "released",
              drafts: drafts.map(({ post }) => post.id),
            };

            return released;
          })
        );
      });

      return MediaInPosts.of({ release, usage });
    })
  );
}
