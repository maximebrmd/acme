import { Schema } from "effect";
import type { ChannelSet as ChannelSetView } from "peal-contract";

import type { ListedChannelSet } from "#publishing/application/channel-sets.ts";
import { ChannelOptionsListSchema } from "#publishing/domain/channel-options.ts";

// The domain's options, as plain values the contract describes.
const encodeOptions = Schema.encodeSync(ChannelOptionsListSchema);

/** What clients see of a channel set. */
export const channelSetView = ({
  set,
  unavailable,
}: ListedChannelSet): ChannelSetView => ({
  channelIds: [...set.channelIds],
  createdAt: set.createdAt,
  id: set.id,
  name: set.name,
  options: encodeOptions(set.options),
  unavailableChannelIds: [...unavailable],
});
