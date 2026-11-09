import { Array as Arr, Effect } from "effect";

import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

import { AttachableMedia } from "./attachable-media.ts";
import { UnknownChannels } from "./unknown-channels.ts";
import { UnknownMedia } from "./unknown-media.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";

// What a post refers to in other contexts, checked before it is saved: its
// channels, which must be the workspace's, and its media.

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

/** Fails with UnknownMedia when the content shows media it may not. */
export const checkMedia = Effect.fn("Publishing.checkMedia")(
  function* checkMedia(actor: Actor, content: PostContent) {
    const requested = content.media.map(({ mediaId }) => mediaId);

    const found = new Set(
      requested.length === 0
        ? []
        : yield* AttachableMedia.use((media) => media.lookUp(actor, requested))
    );

    const missing = requested.filter((mediaId) => !found.has(mediaId));

    if (Arr.isReadonlyArrayNonEmpty(missing)) {
      yield* new UnknownMedia({ mediaIds: missing });
    }
  }
);
