import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";
import {
  ChannelDefaultsSchema,
  ChannelSetDetailsSchema,
  ChannelSetSchema,
  CurrentMember,
  maxChannelSetNameLength,
  maxChannelSetsPerWorkspace,
  maxChannelsPerSet,
  maxSignatureLength,
  maxSignatureNameLength,
  maxSignaturesPerWorkspace,
  NewChannelDefaultsSchema,
  SignatureDetailsSchema,
  SignatureSchema,
  SignatureScopeSchema,
} from "peal-contract";

import { changing, reading } from "#app/mcp/annotations.ts";
import { ToolRefused } from "#app/mcp/tool-refused.ts";

const signatureId = Schema.String.annotate({
  description: "The signature's id, as list_signatures answers it.",
});

const signatureName = SignatureDetailsSchema.fields.name.annotate({
  description: `The signature's name: ${String(maxSignatureNameLength)} characters at most, on one line, without spaces around it, which no other signature of the workspace has, whatever its case.`,
});

const signatureText = SignatureDetailsSchema.fields.text.annotate({
  description: `What the signature puts under a post's text, a blank line between them: ${String(maxSignatureLength)} characters at most, without spaces around it.`,
});

const scope = SignatureScopeSchema.annotate({
  description:
    "Where the signature is meant for: every channel of the workspace (`workspace`), the channels of one `platform`, or one `channel` of the workspace, by its id as list_channels answers it.",
});

const isDefault = Schema.Boolean.annotate({
  description:
    "Whether posts that ask for the default signatures (`defaultSignatures`) take it where it is meant for. A scope has one default: marking this one unmarks the signature that was.",
});

const becomesText =
  "A signature says nothing by itself: once create_draft, update_draft, create_post or create_posts puts it under a post's text, it is text of that post, counted against each platform's limit, and never added under a text that already ends with it.";

export const ListSignatures = Tool.make("list_signatures", {
  dependencies: [CurrentMember],
  description: `Lists the workspace's signatures, oldest first: the texts it ends its posts with, each with its id, its name, its text, where it is meant for (\`scope\`: the whole workspace, a platform's channels or one channel) and whether it is the default there (\`isDefault\`). A post takes one by id (\`signatureId\`), or each channel's default with \`defaultSignatures\`: the workspace's under the post's text, a platform's or a channel's own under the text that channel has instead. ${becomesText}`,
  failure: ToolRefused,
  success: Schema.Struct({ signatures: Schema.Array(SignatureSchema) }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List signatures");

export const CreateSignature = Tool.make("create_signature", {
  dependencies: [CurrentMember],
  description: `Adds a signature to the workspace, for every member to end posts with: a name, a text, and the \`scope\` it is meant for (the whole workspace when left out). With \`isDefault\`, posts that ask for the default signatures take it there from now on, and the signature that was the default of that scope is one no longer. No post changes: those that already hold a signature's text keep it. A workspace keeps ${String(maxSignaturesPerWorkspace)} signatures at most, and a name another signature has, whatever its case, is refused: read list_signatures first, and use the one that exists. ${becomesText}`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    isDefault: Schema.optionalKey(isDefault),
    name: signatureName,
    scope: Schema.optionalKey(scope),
    text: signatureText,
  }),
  success: SignatureSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: false, openWorld: false })
  )
  .annotate(Tool.Title, "Create a signature");

export const UpdateSignature = Tool.make("update_signature", {
  dependencies: [CurrentMember],
  description:
    "Changes a signature of the workspace, for every member: its name, its text, the `scope` it is meant for, or whether it is the default there, replacing those it had; what is left out stays as it is. With `isDefault: true`, the signature that was the default of that scope is one no longer. Posts that already hold its text keep it as it was: only posts made afterwards take the new one. A name another signature has, whatever its case, is refused.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    isDefault: Schema.optionalKey(isDefault),
    name: Schema.optionalKey(signatureName),
    scope: Schema.optionalKey(scope),
    signatureId,
    text: Schema.optionalKey(signatureText),
  }),
  success: SignatureSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Update a signature");

export const DeleteSignature = Tool.make("delete_signature", {
  dependencies: [CurrentMember],
  description:
    "Deletes a signature of the workspace for good: no post takes it any more, and where it was the default, there is none. Posts that already hold its text keep it. It cannot be brought back: do it only when the user asked for this signature to be deleted.",
  failure: ToolRefused,
  parameters: Schema.Struct({ signatureId }),
  success: Schema.Struct({ deleted: Schema.String }),
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Delete a signature");

const channelSetId = Schema.String.annotate({
  description: "The channel set's id, as list_channel_sets answers it.",
});

const setName = ChannelSetDetailsSchema.fields.name.annotate({
  description: `The set's name: ${String(maxChannelSetNameLength)} characters at most, on one line, without spaces around it, which no other set of the workspace has, whatever its case.`,
});

const setChannelIds = ChannelSetDetailsSchema.fields.channelIds.annotate({
  description: `The set's channels, as list_channels answers their ids, each once, in the order chosen: one at least, ${String(maxChannelsPerSet)} at most, every one connected now.`,
});

const setOptions = ChannelSetDetailsSchema.fields.options.schema.annotate({
  description:
    "The options posts made with the set take on some of its channels, where they give none themselves: one entry per channel, tagged by the channel's `platform`, as create_draft takes `options`. They may be unfinished, and are checked when a post that takes them is scheduled.",
});

const namedByPosts =
  "A post names a set by its id or its name (`channelSets`, on create_draft, update_draft, create_post, create_posts and validate_post) instead of listing its channels: it goes to the set's connected channels, and a channel of the set that is no longer connected is left out and told in the answer's `warnings`, never silently.";

export const ListChannelSets = Tool.make("list_channel_sets", {
  dependencies: [CurrentMember],
  description: `Lists the workspace's channel sets, oldest first: selections of its channels kept under a name, each with its id, its name, its channels (\`channelIds\`), the options posts take on some of them, and those of its channels disconnected since (\`unavailableChannelIds\`), which a post made with the set leaves out. ${namedByPosts}`,
  failure: ToolRefused,
  success: Schema.Struct({ channelSets: Schema.Array(ChannelSetSchema) }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List channel sets");

export const CreateChannelSet = Tool.make("create_channel_set", {
  dependencies: [CurrentMember],
  description: `Saves a selection of the workspace's channels under a name, for every member to post to: its channels, and the options posts take on those whose platform asks for more. No post and no channel changes. A workspace keeps ${String(maxChannelSetsPerWorkspace)} sets at most, and a name another set has, whatever its case, is refused: read list_channel_sets first, and use the set that exists. ${namedByPosts}`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelIds: setChannelIds,
    name: setName,
    options: Schema.optionalKey(setOptions),
  }),
  success: ChannelSetSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: false })
  )
  .annotate(Tool.Title, "Create a channel set");

export const UpdateChannelSet = Tool.make("update_channel_set", {
  dependencies: [CurrentMember],
  description:
    "Changes a channel set of the workspace, for every member: its name, its channels or its options, replacing those it had. What is left out stays as it is, with two exceptions that follow from a set holding connected channels only: without `channelIds`, the set keeps its channels that are still connected and loses those that are not (`unavailableChannelIds`), which is also how a disconnected channel is taken out; and without `options`, it keeps the options of the channels it keeps, while with them they replace its options, `[]` removing them all. Posts made with the set before keep their channels: only posts made afterwards take the new ones. A name another set has, whatever its case, is refused.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelIds: Schema.optionalKey(setChannelIds),
    channelSetId,
    name: Schema.optionalKey(setName),
    options: Schema.optionalKey(setOptions),
  }),
  success: ChannelSetSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Update a channel set");

export const DeleteChannelSet = Tool.make("delete_channel_set", {
  dependencies: [CurrentMember],
  description:
    "Deletes a channel set of the workspace for good: no post can name it any more. Its channels stay connected, and the posts made with it stay as they are. It cannot be brought back: do it only when the user asked for this set to be deleted.",
  failure: ToolRefused,
  parameters: Schema.Struct({ channelSetId }),
  success: Schema.Struct({ deleted: Schema.String }),
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Delete a channel set");

const channelId = Schema.String.annotate({
  description: "The channel's id, as list_channels answers it.",
});

const startingPoint =
  "Defaults are a starting point, never a way round the rules: a post that takes them is checked when it is scheduled as one that wrote them itself.";

export const GetChannelDefaults = Tool.make("get_channel_defaults", {
  dependencies: [CurrentMember],
  description: `Answers a channel's default options: what a new post takes on the channel when it gives no options there and no channel set it names does (\`options\`, tagged by the channel's \`platform\`), or null when the channel has none. Only a new draft and a post made in one call (create_draft, create_post, create_posts) take them; update_draft keeps what it is given. ${startingPoint}`,
  failure: ToolRefused,
  parameters: Schema.Struct({ channelId }),
  success: ChannelDefaultsSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get a channel's default options");

export const SetChannelDefaults = Tool.make("set_channel_defaults", {
  dependencies: [CurrentMember],
  description: `Keeps these as a channel's default options, for every member, instead of any it had: the options of the channel's own platform, as create_draft takes them for one channel, unfinished as a draft's may be. From now on a new draft, and a post made in one call, takes them on the channel when it gives none there. Posts already made keep theirs. Options of another platform are refused. ${startingPoint}`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelId,
    options: NewChannelDefaultsSchema.fields.options.annotate({
      description:
        "The options to keep, tagged by the channel's `platform`: get_channel_capabilities describes every field of a channel.",
    }),
  }),
  success: ChannelDefaultsSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Set a channel's default options");

export const ClearChannelDefaults = Tool.make("clear_channel_defaults", {
  dependencies: [CurrentMember],
  description:
    "Leaves a channel of the workspace without default options, for every member: from now on a new post takes there only the options it gives, or a channel set's. Posts already made keep theirs. The options that were kept cannot be brought back: do it only when the user asked for it.",
  failure: ToolRefused,
  parameters: Schema.Struct({ channelId }),
  success: Schema.Struct({ cleared: Schema.String }),
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Clear a channel's default options");

/**
 * The tools that read and change what a workspace saves to write its posts
 * with: its signatures, its channel sets and its channels' default options.
 */
export const SavedTools = Toolkit.make(
  ListSignatures,
  CreateSignature,
  UpdateSignature,
  DeleteSignature,
  ListChannelSets,
  CreateChannelSet,
  UpdateChannelSet,
  DeleteChannelSet,
  GetChannelDefaults,
  SetChannelDefaults,
  ClearChannelDefaults
);
