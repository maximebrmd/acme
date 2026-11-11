import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { ChannelSetNameTaken } from "./channel-set-name-taken.ts";
import { ChannelSetNotFound } from "./channel-set-not-found.ts";
import { Forbidden } from "./forbidden.ts";
import { PostContentInvalid } from "./post-content-invalid.ts";
import { ChannelOptionsSchema } from "./target-options.ts";
import type { ChannelOptions } from "./target-options.ts";
import { TooManyChannelSets } from "./too-many-channel-sets.ts";
import { UnknownChannels } from "./unknown-channels.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** The longest name a channel set has. */
export const maxChannelSetNameLength = 60;

/** The most channels one set holds. */
export const maxChannelsPerSet = 50;

/** The most channel sets a workspace keeps. */
export const maxChannelSetsPerWorkspace = 50;

/** The most channel sets one post names. */
export const maxChannelSetsPerPost = 10;

const optionsOnce = Schema.Array(ChannelOptionsSchema).check(
  Schema.makeFilter(
    (list: readonly ChannelOptions[]) =>
      new Set(list.map(({ channelId }) => channelId)).size === list.length,
    { expected: "options for each channel once" }
  )
);

/**
 * A selection of the workspace's channels kept under a name, with the
 * options posts take on some of them.
 */
export const ChannelSetSchema = Schema.Struct({
  // The channels as saved, in the order chosen.
  channelIds: Schema.Array(Schema.String),
  createdAt: Schema.DateTimeUtc,
  id: Schema.String,
  name: Schema.String,
  options: Schema.Array(ChannelOptionsSchema),
  // Those of `channelIds` disconnected since: a post made with the set
  // skips them, and says so.
  unavailableChannelIds: Schema.Array(Schema.String),
}).annotate({ identifier: "ChannelSet" });

export type ChannelSet = typeof ChannelSetSchema.Type;

/** A channel set, as a member writes it. */
export const ChannelSetDetailsSchema = Schema.Struct({
  channelIds: Schema.NonEmptyArray(Schema.String).check(
    Schema.isMaxLength(maxChannelsPerSet),
    Schema.makeFilter(
      (channelIds: readonly string[]) =>
        new Set(channelIds).size === channelIds.length,
      { expected: "each channel once" }
    )
  ),
  name: Schema.String.check(
    Schema.isBetweenLength(1, maxChannelSetNameLength),
    Schema.makeFilter((name: string) => name === name.trim(), {
      expected: "a name without spaces around it",
    }),
    Schema.makeFilter((name: string) => !/\p{Cc}/u.test(name), {
      expected: "a name on one line, without control characters",
    })
  ),
  // Left out, none.
  options: Schema.optionalKey(optionsOnce),
}).annotate({ identifier: "ChannelSetDetails" });

export type ChannelSetDetails = typeof ChannelSetDetailsSchema.Type;

/** The channel sets a post names: each by its id or its name. */
export const ChannelSetReferencesSchema = Schema.Array(
  Schema.String.check(Schema.isBetweenLength(1, 100))
).check(Schema.isMaxLength(maxChannelSetsPerPost));

/**
 * Something a post was made without, which its request should know of.
 * `channelsDropped`: channels of a set it named are no longer connected,
 * so the post goes to the set's other channels only.
 * `queueChannelsDropped`: added to a queue without naming channels, it
 * goes to the queue's, and these of them are no longer connected.
 */
export const PostWarningSchema = Schema.Union([
  Schema.TaggedStruct("channelsDropped", {
    channelIds: Schema.Array(Schema.String),
    channelSetId: Schema.String,
    channelSetName: Schema.String,
  }),
  Schema.TaggedStruct("queueChannelsDropped", {
    channelIds: Schema.Array(Schema.String),
    queueId: Schema.String,
    queueName: Schema.String,
  }),
]).annotate({ identifier: "PostWarning" });

export type PostWarning = typeof PostWarningSchema.Type;

const workspace = { workspaceId: Schema.String };

const set = { ...workspace, channelSetId: Schema.String };

/** A workspace's channel sets: selections of channels kept under a name. */
export class ChannelSetsApi extends HttpApiGroup.make("channelSets")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: Forbidden,
      params: workspace,
      success: Schema.Array(ChannelSetSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the workspace's channel sets, oldest first, each with the channels it keeps and those of them disconnected since (`unavailableChannelIds`). Needs post:read and channel:read.",
        summary: "List channel sets",
      })
    ),
    HttpApiEndpoint.post("create", "/", {
      error: [
        Forbidden,
        ChannelSetNameTaken,
        TooManyChannelSets,
        UnknownChannels,
        PostContentInvalid,
      ],
      params: workspace,
      payload: ChannelSetDetailsSchema,
      success: ChannelSetSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Saves a selection of the workspace's channels under a name no other set of the workspace has whatever its case, ${maxChannelsPerSet} channels at most, with the options posts take on those whose platform has some (\`TargetOptions\`, of the channel's platform; unfinished options are kept, and checked when a post that takes them is scheduled). A post names a set by its id or its name (\`channelSets\`) instead of listing its channels. A workspace keeps ${maxChannelSetsPerWorkspace} sets at most. Needs post:update and channel:read.`,
        summary: "Create a channel set",
      })
    ),
    HttpApiEndpoint.put("update", "/:channelSetId", {
      error: [
        Forbidden,
        ChannelSetNotFound,
        ChannelSetNameTaken,
        UnknownChannels,
        PostContentInvalid,
      ],
      params: set,
      payload: ChannelSetDetailsSchema,
      success: ChannelSetSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Replaces a set's name, channels and options: every channel must be connected now, so this is also how a disconnected one is taken out. Posts made with the set before keep their channels. Needs post:update and channel:read.",
        summary: "Update a channel set",
      })
    ),
    HttpApiEndpoint.delete("delete", "/:channelSetId", {
      error: [Forbidden, ChannelSetNotFound],
      params: set,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes a channel set. Its channels, and the posts made with it, stay. Needs post:update.",
        summary: "Delete a channel set",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/channel-sets") {}
