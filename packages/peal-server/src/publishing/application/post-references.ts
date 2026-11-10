import { Array as Arr, Effect } from "effect";

import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import type { MediaFile } from "#publishing/domain/media-file.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";
import type { TagId } from "#publishing/domain/tag-id.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

import { AttachableMedia } from "./attachable-media.ts";
import { TagStore } from "./tag-store.ts";
import { UnknownChannels } from "./unknown-channels.ts";
import { UnknownMedia } from "./unknown-media.ts";
import { UnknownTags } from "./unknown-tags.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";

// What a post refers to in other contexts, checked before it is saved: its
// channels, which must be the workspace's, and its media, which must be the
// workspace's and ready.

/**
 * The channels, each once and in the order asked, with their platforms.
 * Fails with UnknownChannels when some are not the workspace's.
 */
export const channelsFor = Effect.fn("Publishing.channelsFor")(
  function* channelsFor(actor: Actor, channelIds: readonly ChannelId[]) {
    const requested = Arr.dedupe(channelIds);

    if (requested.length === 0) {
      const none: readonly ChannelOnPlatform[] = [];

      return none;
    }

    const found = yield* WorkspaceChannels.use((channels) =>
      channels.lookUp(actor, requested)
    );

    const byId = new Map(found.map((channel) => [channel.channelId, channel]));
    const missing = requested.filter((channelId) => !byId.has(channelId));

    if (Arr.isReadonlyArrayNonEmpty(missing)) {
      return yield* new UnknownChannels({ channelIds: missing });
    }

    return requested.flatMap((channelId) => {
      const channel = byId.get(channelId);

      return channel === undefined ? [] : [channel];
    });
  }
);

/**
 * The files of the media the content shows, in its order. Fails with
 * UnknownMedia when it shows media the actor's posts may not: another
 * workspace's, or media that is not ready.
 */
export const mediaFor = Effect.fn("Publishing.mediaFor")(function* mediaFor(
  actor: Actor,
  content: PostContent
) {
  const requested = content.media.map(({ mediaId }) => mediaId);

  if (requested.length === 0) {
    const none: readonly MediaFile[] = [];

    return none;
  }

  const found = yield* AttachableMedia.use((media) =>
    media.lookUp(actor, requested)
  );

  const byId = new Map(found.map((file) => [file.mediaId, file]));
  const missing = requested.filter((mediaId) => !byId.has(mediaId));

  if (Arr.isReadonlyArrayNonEmpty(missing)) {
    return yield* new UnknownMedia({ mediaIds: missing });
  }

  return requested.flatMap((mediaId) => {
    const file = byId.get(mediaId);

    return file === undefined ? [] : [file];
  });
});

/**
 * The tags, each once and in the order asked, once every one is the
 * workspace's. Fails with UnknownTags otherwise.
 */
export const tagsFor = Effect.fn("Publishing.tagsFor")(function* tagsFor(
  workspaceId: WorkspaceId,
  tagIds: readonly TagId[]
) {
  const requested = Arr.dedupe(tagIds);

  if (requested.length === 0) {
    return requested;
  }

  const kept = yield* TagStore.use((tags) => tags.list(workspaceId));
  const known = new Set<string>(kept.map(({ id }) => id));
  const missing = requested.filter((tagId) => !known.has(tagId));

  if (Arr.isReadonlyArrayNonEmpty(missing)) {
    return yield* new UnknownTags({ tagIds: missing });
  }

  return requested;
});
