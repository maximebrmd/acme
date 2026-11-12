import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";
import {
  ChannelDefaultsSchema,
  ChannelSetDetailsSchema,
  ChannelSetSchema,
  CurrentMember,
  defaultQueuePreview,
  maxChannelSetNameLength,
  maxChannelSetsPerWorkspace,
  maxChannelsPerQueue,
  maxChannelsPerSet,
  maxQueueNameLength,
  maxQueuePreview,
  maxQueuesPerWorkspace,
  maxSignatureLength,
  maxSignatureNameLength,
  maxSignaturesPerWorkspace,
  maxSlotsPerQueue,
  NewChannelDefaultsSchema,
  queueHorizonDays,
  QueueDetailsSchema,
  QueuePreviewSchema,
  QueueSchema,
  SignatureDetailsSchema,
  SignatureSchema,
  SignatureScopeSchema,
  RecyclingRuleSchema,
  RecyclingStatusSchema,
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

const queueId = Schema.String.annotate({
  description: "The queue's id, as list_queues answers it.",
});

const queueFields = QueueDetailsSchema.fields;

const queueName = queueFields.name.annotate({
  description: `The queue's name: ${String(maxQueueNameLength)} characters at most, on one line, without spaces around it, which no other queue of the workspace has, whatever its case.`,
});

const queueZone = queueFields.timeZone.annotate({
  description:
    "The IANA time zone its slots are wall-clock times of, such as Europe/Paris: a slot keeps its time of day there whatever daylight saving does. Offsets such as +01:00 are refused.",
});

const queueSlots = queueFields.slots.annotate({
  description: `Its week: each slot a \`day\` (monday to sunday) and a \`time\` of day on a 24-hour clock (\`HH:mm\`), each pair once, ${String(maxSlotsPerQueue)} at most. A time daylight saving skips moves to the moment the clocks jump; one it repeats happens once.`,
});

const queueChannels = queueFields.channelIds.schema.annotate({
  description: `The channels a post added to the queue goes to when it names none, as list_channels answers their ids, each once, ${String(maxChannelsPerQueue)} at most, every one connected now.`,
});

const queueIsDefault = queueFields.isDefault.schema.annotate({
  description:
    "True to make it the workspace's default queue, the one a post added to no queue in particular takes, instead of the one that was.",
});

const queueTaken = `A slot is taken while a post the queue placed is scheduled, awaiting approval or publishing at exactly its instant: a post added to the queue (create_post or create_posts with \`when\` \`queue\`, queue_post) takes the first free slot after the call, within ${String(queueHorizonDays)} days.`;

export const ListQueues = Tool.make("list_queues", {
  dependencies: [CurrentMember],
  description: `Lists the workspace's queues, the default first, then by name: weekly timetables of slots in a time zone, each with its id, its name, its zone, its \`slots\`, the channels a post added to it goes to when it names none (\`channelIds\`, those disconnected since in \`unavailableChannelIds\`), its channel set, and whether it is the default. ${queueTaken}`,
  failure: ToolRefused,
  success: Schema.Struct({ queues: Schema.Array(QueueSchema) }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List queues");

export const PreviewQueue = Tool.make("preview_queue", {
  dependencies: [CurrentMember],
  description: `Lists a queue's coming slots after now (\`count\`, ${String(defaultQueuePreview)} unless given, ${String(maxQueuePreview)} at most), each with the post that holds it or null, and \`nextFree\`, the slot a post added now would take, or null with \`noRoom\` (\`noSlots\`: it has none; \`full\`: every slot of the next ${String(queueHorizonDays)} days is taken). It holds nothing: the slot is decided when the post is added.`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    count: Schema.optionalKey(
      Schema.Int.check(
        Schema.isBetween({ maximum: maxQueuePreview, minimum: 1 })
      )
    ),
    queueId,
  }),
  success: QueuePreviewSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Preview a queue's slots");

export const CreateQueue = Tool.make("create_queue", {
  dependencies: [CurrentMember],
  description: `Saves a queue for every member: a weekly timetable of slots in a time zone, and the channels and channel set a post added to it goes to when it names none. No post and no channel changes. The first queue of a workspace is its default. A workspace keeps ${String(maxQueuesPerWorkspace)} queues at most, and a name another queue has, whatever its case, is refused: read list_queues first. ${queueTaken}`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelIds: Schema.optionalKey(queueChannels),
    channelSetId: Schema.optionalKey(
      Schema.String.annotate({
        description:
          "A channel set a post added to the queue goes to as well when it names no channel, as list_channel_sets answers its id.",
      })
    ),
    isDefault: Schema.optionalKey(queueIsDefault),
    name: queueName,
    slots: queueSlots,
    timeZone: queueZone,
  }),
  success: QueueSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: false })
  )
  .annotate(Tool.Title, "Create a queue");

export const UpdateQueue = Tool.make("update_queue", {
  dependencies: [CurrentMember],
  description:
    "Changes a queue of the workspace, for every member: its name, zone, slots, channels or channel set, or makes it the default. What is left out stays as it is, but the channels disconnected since, which a queue cannot keep: without `channelIds`, it keeps its channels still connected. `channelSetId` null takes the set off. Posts the queue placed keep their times: changing slots moves no post. A name another queue has, whatever its case, is refused.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelIds: Schema.optionalKey(queueChannels),
    channelSetId: Schema.optionalKey(
      Schema.NullOr(Schema.String).annotate({
        description:
          "The channel set it goes to as well, as list_channel_sets answers its id; null for none.",
      })
    ),
    isDefault: Schema.optionalKey(queueIsDefault),
    name: Schema.optionalKey(queueName),
    queueId,
    slots: Schema.optionalKey(queueSlots),
    timeZone: Schema.optionalKey(queueZone),
  }),
  success: QueueSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Update a queue");

export const DeleteQueue = Tool.make("delete_queue", {
  dependencies: [CurrentMember],
  description:
    "Deletes a queue of the workspace for good. The posts it placed stay scheduled at their times, and no longer name it; nothing goes out differently. Deleting the default leaves the workspace without one. It cannot be brought back: do it only when the user asked for this queue to be deleted.",
  failure: ToolRefused,
  parameters: Schema.Struct({ queueId }),
  success: Schema.Struct({ deleted: Schema.String }),
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Delete a queue");

const ruleId = Schema.String.annotate({
  description: "The recycling rule's id, as list_recycling_rules answers it.",
});

const repeats = `A recycling rule makes a post repeat: a new post one interval after the one before, at the same wall-clock time in the source's zone (or on a queue's first free slot from then), until \`count\` posts in all or the day \`until\`, saying the source's text then each variant in turn. Each is an ordinary post, which list_posts finds by \`recyclingId\`, and acts as whoever started the rule, as they are when it is made.`;

export const ListRecyclingRules = Tool.make("list_recycling_rules", {
  dependencies: [CurrentMember],
  description: `Lists the workspace's recycling rules, oldest first, those with \`status\` alone when given (\`active\`, \`paused\`, \`ended\`): each with its source post, interval, ending, variants, how many posts it made, why it ended if it did, and its next posts to come (\`coming\`), with the variant each will say. ${repeats}`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    status: Schema.optionalKey(RecyclingStatusSchema),
  }),
  success: Schema.Struct({ rules: Schema.Array(RecyclingRuleSchema) }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List recycling rules");

export const GetRecyclingRule = Tool.make("get_recycling_rule", {
  dependencies: [CurrentMember],
  description: `Answers a recycling rule of the workspace, with its next posts to come and the variant each will say. ${repeats}`,
  failure: ToolRefused,
  parameters: Schema.Struct({ ruleId }),
  success: RecyclingRuleSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get a recycling rule");

export const StopRecyclingRule = Tool.make("stop_recycling_rule", {
  dependencies: [CurrentMember],
  description:
    "Ends a recycling rule for good: it makes no more posts, and ends `stopped`. The posts it made stay as they are, scheduled ones included (cancel_post cancels one). A stopped rule cannot be resumed; recycle_post starts a new one on the same post. Do it only when the user asked for the post to stop repeating. Needs a role that schedules posts, or to be the rule's starter.",
  failure: ToolRefused,
  parameters: Schema.Struct({ ruleId }),
  success: Schema.Struct({ stopped: Schema.String }),
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Stop a recycling rule");

/**
 * The tools that read and change what a workspace saves to write its posts
 * with: its signatures, its channel sets, its channels' default options
 * and its queues, and reads and stops the rules that repeat its posts.
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
  ClearChannelDefaults,
  ListQueues,
  PreviewQueue,
  CreateQueue,
  UpdateQueue,
  DeleteQueue,
  ListRecyclingRules,
  GetRecyclingRule,
  StopRecyclingRule
);
