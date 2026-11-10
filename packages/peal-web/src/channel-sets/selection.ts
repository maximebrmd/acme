import { Schema } from "effect";
import type { Option } from "effect";
import { ChannelSetDetailsSchema } from "peal-contract";
import type {
  Channel,
  ChannelOptions,
  ChannelSet,
  ChannelSetDetails,
} from "peal-contract";

import { fieldsOf, valuesOf } from "#posts/target-options.ts";
import type { ValuesByChannel } from "#posts/target-options.ts";

// What a channel set selects in the composer, and what a selection saves
// as a set.

/** A set's channels that are still connected, in the workspace's order. */
export const connectedChannels = (
  set: Pick<ChannelSet, "channelIds" | "unavailableChannelIds">,
  channels: readonly Channel[]
): readonly Channel[] =>
  channels.filter(
    ({ id }) =>
      set.channelIds.includes(id) && !set.unavailableChannelIds.includes(id)
  );

/** A set's channels that are no longer connected. */
export const missingChannels = (
  set: Pick<ChannelSet, "channelIds" | "unavailableChannelIds">,
  channels: readonly Channel[]
): readonly string[] => {
  const connected = new Set(
    connectedChannels(set, channels).map(({ id }) => id)
  );

  return set.channelIds.filter((id) => !connected.has(id));
};

/** What choosing a set does to a post being written. */
export interface AppliedSet {
  /** The set's connected channels, which the post now goes to. */
  readonly channelIds: readonly string[];
  /** How many of the set's channels are no longer connected. */
  readonly dropped: number;
  /** The options the set keeps, as the options fields hold them. */
  readonly values: ValuesByChannel;
}

/**
 * The channels a set selects and the options it fills, among the
 * workspace's channels: those disconnected since the set was saved are
 * left out, and counted.
 */
export const appliedSet = (
  set: ChannelSet,
  channels: readonly Channel[]
): AppliedSet => {
  const connected = connectedChannels(set, channels);

  return {
    channelIds: connected.map(({ id }) => id),
    dropped: missingChannels(set, channels).length,
    values: Object.fromEntries(
      connected.flatMap(({ id, platform }) => {
        const kept = set.options.find(({ channelId }) => channelId === id);

        return kept === undefined || fieldsOf(platform).length === 0
          ? []
          : [[id, valuesOf(platform, kept.options)]];
      })
    ),
  };
};

const decodeDetails = Schema.decodeUnknownOption(ChannelSetDetailsSchema);

/**
 * What saving a selection under a name sends, if the API would take it:
 * a name, one channel at least, and the options of the channels chosen.
 */
export const channelSetDetailsOf = (
  name: string,
  channelIds: readonly string[],
  options: readonly ChannelOptions[]
): Option.Option<ChannelSetDetails> =>
  decodeDetails({
    channelIds,
    name: name.trim(),
    options: options.filter(({ channelId }) => channelIds.includes(channelId)),
  });

/** The channels a set's form starts with: those still connected. */
export const editableChannelIds = (
  set: ChannelSet,
  channels: readonly Channel[]
): readonly string[] => connectedChannels(set, channels).map(({ id }) => id);

/** The ids with one channel chosen or not, in the workspace's order. */
export const withChannel = (
  channelIds: readonly string[],
  channels: readonly Channel[],
  channelId: string,
  chosen: boolean
): readonly string[] =>
  channels.flatMap(({ id }) => {
    const kept = id === channelId ? chosen : channelIds.includes(id);

    return kept ? [id] : [];
  });
