import { Effect } from "effect";

import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import {
  keepingMedia,
  referencedMedia,
} from "#publishing/domain/named-media.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { Post } from "#publishing/domain/post.ts";
import type { TagId } from "#publishing/domain/tag-id.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

import { AttachableMedia } from "./attachable-media.ts";
import { TagStore } from "./tag-store.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";
import { optionsOfTargets } from "./workspace-posts.ts";

/** What a copy of a post says, and where it goes. */
export interface PostCopy {
  readonly channelIds: readonly ChannelId[];
  readonly content: PostContent;
  readonly options: readonly ChannelOptions[];
  /** As the post asks: each copy's links get short addresses of their own. */
  readonly shortenLinks: boolean;
  readonly tagIds: readonly TagId[];
}

/**
 * What a post says and where it goes, of what the actor's workspace still
 * has: its channels still connected, each part's media still there and
 * its texts on those channels, its options on them, an option naming a
 * file gone since left out (`keepingMedia`), and its tags still kept. What
 * the post became (its time, its outcome, its targets' states, a removal
 * from a platform) is not copied. Duplicating a post and a recycling
 * rule's occurrences copy through it.
 */
export const copyOf = Effect.fn("Publishing.copyOf")(function* copyOf(
  actor: Actor,
  post: Post,
  targets: readonly PostTarget[]
) {
  const { content } = post;
  const named = targets.map(({ channelId }) => channelId);

  const channels = yield* WorkspaceChannels.use((workspace) =>
    workspace.lookUp(actor, named)
  );

  // Every file it depends on: those it shows, in any of its parts, and
  // those its options name.
  const referenced = referencedMedia(content, optionsOfTargets(targets, named));

  const media =
    referenced.length === 0
      ? []
      : yield* AttachableMedia.use((attachable) =>
          attachable.lookUp(actor, referenced)
        );

  const tags = yield* TagStore.use((store) => store.list(actor.workspaceId));

  const channelIds = channels.map(({ channelId }) => channelId);
  const mediaIds = new Set<string>(media.map(({ mediaId }) => mediaId));
  const tagIds = new Set<string>(tags.map(({ id }) => id));

  // Each part's media and texts, of what the workspace still has.
  const kept = (part: Pick<PostContent, "media" | "overrides">) => ({
    media: part.media.filter(({ mediaId }) => mediaIds.has(mediaId)),
    overrides: part.overrides.filter(({ channelId }) =>
      channelIds.includes(channelId)
    ),
  });

  const copy: PostCopy = {
    channelIds,
    content: new PostContent({
      ...kept(content),
      followUps: content.followUps.map(
        (part) =>
          new PostPart({
            ...kept(part),
            delaySeconds: part.delaySeconds,
            text: part.text,
          })
      ),
      text: content.text,
    }),
    // An option naming a file gone since is left out.
    options: optionsOfTargets(targets, channelIds).map(
      (chosen) =>
        new ChannelOptions({
          channelId: chosen.channelId,
          options: keepingMedia(chosen.options, (mediaId) =>
            mediaIds.has(mediaId)
          ),
        })
    ),
    shortenLinks: post.shortenLinks,
    tagIds: post.tagIds.filter((tagId) => tagIds.has(tagId)),
  };

  return copy;
});
