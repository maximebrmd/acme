import { Schema } from "effect";
import type { DateTime } from "effect";

import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

import { ChannelOptionsListSchema } from "./channel-options.ts";
import type { ChannelOptions } from "./channel-options.ts";
import { ChannelSetIdSchema } from "./channel-set-id.ts";
import type { ChannelSetId } from "./channel-set-id.ts";

/** The longest name a channel set has. */
export const maxChannelSetNameLength = 60;

/** The most channels one set holds. */
export const maxChannelsPerSet = 50;

/** The most channel sets a workspace keeps. */
export const maxChannelSetsPerWorkspace = 50;

/** A set's name: a short line, by which posts ask for it. */
export const ChannelSetNameSchema = Schema.String.check(
  Schema.isBetweenLength(1, maxChannelSetNameLength),
  Schema.makeFilter((name: string) => name === name.trim(), {
    expected: "a name without spaces around it",
  }),
  Schema.makeFilter((name: string) => !/\p{Cc}/u.test(name), {
    expected: "a name on one line, without control characters",
  })
);

/** A set's channels: one at least, each once. */
export const SetChannelIdsSchema = Schema.NonEmptyArray(ChannelIdSchema).check(
  Schema.isMaxLength(maxChannelsPerSet),
  Schema.makeFilter(
    (channelIds: readonly string[]) =>
      new Set(channelIds).size === channelIds.length,
    { expected: "each channel once" }
  )
);

/**
 * A selection of a workspace's channels kept under a name, with the
 * options posts take on some of them: what a member picks when a post
 * starts, and what a request names instead of listing channels. Workspace
 * content, naming nobody.
 *
 * A set keeps the channels it was given: one disconnected since stays
 * listed, and is left out, and said to be, when the set is used.
 */
export class ChannelSet extends Schema.Class<ChannelSet>(
  "peal-server/publishing/domain/ChannelSet"
)({
  channelIds: SetChannelIdsSchema,
  createdAt: Schema.DateTimeUtc,
  id: ChannelSetIdSchema,
  name: ChannelSetNameSchema,
  options: ChannelOptionsListSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

/** What a member writes of a set. */
export interface ChannelSetDetails {
  readonly channelIds: readonly [ChannelId, ...ChannelId[]];
  readonly name: string;
  readonly options: readonly ChannelOptions[];
}

export const createChannelSet = (
  id: ChannelSetId,
  workspaceId: WorkspaceId,
  details: ChannelSetDetails,
  now: DateTime.Utc
): ChannelSet =>
  new ChannelSet({ ...details, createdAt: now, id, workspaceId });

export const editChannelSet = (
  set: ChannelSet,
  details: ChannelSetDetails
): ChannelSet =>
  new ChannelSet({
    ...details,
    createdAt: set.createdAt,
    id: set.id,
    workspaceId: set.workspaceId,
  });

/**
 * What two names are compared by: a workspace has one set per name,
 * whatever its case, and a request names a set that way.
 */
export const setKeyOf = (name: string): string =>
  name.normalize("NFC").trim().toLowerCase();
