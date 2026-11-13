import { Effect, Layer, Option } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { HeldPosts } from "#publishing/application/held-posts.ts";
import { plainOptions } from "#publishing/application/plain-options.ts";
import {
  keptTargets,
  postOnChannel,
} from "#publishing/application/post-parts.ts";
import type { PostWithTargets } from "#publishing/application/post-repository.ts";
import { ReviewedPosts } from "#review/application/ports/reviewed-posts.ts";
import type {
  ReviewedPost,
  ReviewedStatus,
} from "#review/application/ports/reviewed-posts.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";

type PostStatus = PostWithTargets["post"]["status"];

const statusOf = (status: PostStatus): ReviewedStatus => {
  if (status._tag === "publishing" || status._tag === "finished") {
    return "published";
  }

  return status._tag;
};

const scheduleOf = (status: PostStatus): ReviewedPost["schedule"] =>
  status._tag === "awaitingApproval" || status._tag === "scheduled"
    ? Option.some({
        at: status.schedule.at,
        timeZone: status.schedule.timeZone,
      })
    : Option.none();

// The post on a channel, as it will receive it: its text there, then the
// parts that follow, each with its files.
const partsFor = (post: PostWithTargets["post"], channelId: ChannelId) => {
  const { followUps, ownMedia, text } = postOnChannel(post, channelId);

  return {
    followUps: followUps.map((part) => ({
      delaySeconds: part.delaySeconds,
      media: part.media.map(({ altText, mediaId }) => ({ altText, mediaId })),
      text: part.text,
    })),
    media: ownMedia.pipe(
      Option.map((files) =>
        files.map(({ altText, mediaId }) => ({ altText, mediaId }))
      )
    ),
    text,
  };
};

/**
 * The posts under review as publishing holds them (HeldPosts), each
 * channel named as the channels context has it now, by the repository port
 * its jobs read any workspace's channel with. A post publishing no longer
 * finds, or that no longer waits, answers none.
 */
export const PublishingReviewedPosts = Layer.effect(
  ReviewedPosts,
  Effect.gen(function* PublishingReviewedPosts() {
    const channels = yield* ChannelRepository;
    const held = yield* HeldPosts;

    const get = Effect.fn("ReviewedPosts.get")(function* get(
      workspaceId: WorkspaceId,
      postId: PostId
    ) {
      const found = yield* held.get(workspaceId, postId).pipe(
        Effect.map(Option.some),
        Effect.catchTag("PostNotFound", () => Effect.succeedNone)
      );

      if (Option.isNone(found)) {
        return Option.none<ReviewedPost>();
      }

      const { post, targets } = found.value;

      // A channel taken off the post is none of those it goes to, as the
      // approval subject has it.
      const shown = yield* Effect.all(
        keptTargets(targets).map((target) =>
          channels.get(target.channelId).pipe(
            // Only a channel of the post's workspace is named.
            Effect.map(
              Option.filter((known) => known.workspaceId === workspaceId)
            ),
            Effect.map((channel) => ({
              channelId: target.channelId,
              handle: channel.pipe(Option.map(({ handle }) => handle)),
              options: plainOptions(target),
              platform: channel.pipe(Option.map(({ platform }) => platform)),
              ...partsFor(post, target.channelId),
            }))
          )
        )
      );

      return Option.some<ReviewedPost>({
        authorId: post.authorId,
        channels: shown,
        media: post.content.media.map(({ altText, mediaId }) => ({
          altText,
          mediaId,
        })),
        postId: post.id,
        schedule: scheduleOf(post.status),
        status: statusOf(post.status),
        workspaceId: post.workspaceId,
      });
    });

    return ReviewedPosts.of({
      get,
      lock: held.lock,
      release: (workspaceId, postId) =>
        held.release(workspaceId, postId).pipe(
          Effect.map(({ late }) => Option.some({ late })),
          Effect.catchTags({
            InvalidPostTransition: () => Effect.succeedNone,
            PostNotFound: () => Effect.succeedNone,
          })
        ),
      sendBack: (workspaceId, postId) =>
        held.sendBack(workspaceId, postId).pipe(
          Effect.as(true),
          Effect.catchTags({
            InvalidPostTransition: () => Effect.succeed(false),
            PostNotFound: () => Effect.succeed(false),
          })
        ),
    });
  })
);
