import {
  CurrentMember,
  DraftPageSchema,
  maxDraftPageSize,
  PostContentSchema,
  PostDraftSchema,
  PostSchema,
  TargetConfirmationSchema,
  TikTokAccountSchema,
} from "acme-contract";
import { Context, Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";

import { changing, reading } from "#app/mcp/annotations.ts";
import { ToolRefused } from "#app/mcp/tool-refused.ts";

const postId = Schema.String.annotate({
  description: "The post's id, as list_drafts or get_post answer it.",
});

const targetId = Schema.String.annotate({
  description:
    "The post on one of its channels: the id of one of its `targets`, as get_post answers it.",
});

const channelIds = Schema.Array(Schema.String).annotate({
  description:
    "The channels the post is for, as list_channels answers their ids. A draft may be for none yet.",
});

// The API's draft options, each channel's once.
const options = PostDraftSchema.fields.options.schema.annotate({
  description:
    "What the post sets on the platforms that ask for more than text and media, one entry per channel, tagged by the channel's `platform`: YouTube's title (required), madeForKids (required), privacy, tags, categoryId, notifySubscribers and containsSyntheticMedia; TikTok's privacyLevel (required: one of the levels get_tiktok_creator answers), disableComment, disableDuet, disableStitch, commercialContent, brandOrganic, brandContent and aiGenerated. A draft keeps them unfinished; scheduling needs the required ones.",
});

export const ListDrafts = Tool.make("list_drafts", {
  dependencies: [CurrentMember],
  description: `Lists the workspace's drafts, newest first: posts that go out at no time until someone schedules them. Answers 20 a page unless \`limit\` (at most ${String(maxDraftPageSize)}) says otherwise; pass \`nextCursor\` as \`cursor\` for the next page.`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    cursor: Schema.optionalKey(Schema.String),
    limit: Schema.optionalKey(
      Schema.Int.check(
        Schema.isBetween({ maximum: maxDraftPageSize, minimum: 1 })
      )
    ),
  }),
  success: DraftPageSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List drafts");

export const GetPost = Tool.make("get_post", {
  dependencies: [CurrentMember],
  description:
    "Answers with a post of the workspace: what it says, when it goes out, and how it went on each channel (its `targets`, whose ids repost_target and confirm_target take, each with its platform `options`, and `keptPrivate` when YouTube kept the video private although it was asked otherwise). A failed target says why in `failureReason`: the platform refused its text or format (contentRejected) or a media (mediaRejected); its channel was disconnected (channelDisconnected) or turned off (channelDisabled), or a media deleted (mediaRemoved); Acme was down at its time (missed); the user found it missing (notPublished); the platform kept limiting Acme (rateLimited), its daily upload allowance stayed spent (quotaExceeded, YouTube's), it refused the account's token (tokenExpired) or could not be reached (unavailable); or the platform takes only private posts from this server's app until it audits it (appNotAudited, TikTok's: the account must be private and the post visible to its owner only).",
  failure: ToolRefused,
  parameters: Schema.Struct({ postId }),
  success: PostSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get a post");

export const CreateDraft = Tool.make("create_draft", {
  dependencies: [CurrentMember],
  description:
    "Saves a new draft in the workspace: its text, the media of the workspace it shows (ready ones, each with its alt text), the text it has instead on some channels, the channels it is for, and the options of those whose platform asks for more (YouTube, TikTok). A draft goes out at no time: scheduling it is for the user, in the web app. Its text, media and options are checked against each platform's rules only once it is scheduled; options for another platform, or for a channel the draft is not for, are refused at once.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelIds,
    content: PostContentSchema,
    options: Schema.optionalKey(options),
  }),
  success: PostSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: false })
  )
  .annotate(Tool.Title, "Create a draft");

export const UpdateDraft = Tool.make("update_draft", {
  dependencies: [CurrentMember],
  description:
    "Replaces a draft's content and channels with those given: text, media and channels left out are removed from it. Read the draft with get_post first, and send back what should stay. Without `options`, the draft keeps the options it has on the channels it keeps; with them, they replace its options, and `[]` removes them all. A post scheduled or sent is not a draft, and is refused.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelIds,
    content: PostContentSchema,
    options: Schema.optionalKey(options),
    postId,
  }),
  success: PostSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Update a draft");

export const DiscardDraft = Tool.make("discard_draft", {
  dependencies: [CurrentMember],
  description:
    "Deletes a draft of the workspace for good: it cannot be brought back. A post scheduled or sent is not a draft, and is refused.",
  failure: ToolRefused,
  parameters: Schema.Struct({ postId }),
  success: Schema.Struct({ discarded: Schema.String }),
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Discard a draft");

export const UnschedulePost = Tool.make("unschedule_post", {
  dependencies: [CurrentMember],
  description:
    "Takes a scheduled post back to draft: it loses its time, and goes out at no time until someone schedules it again. A post already publishing is refused.",
  failure: ToolRefused,
  parameters: Schema.Struct({ postId }),
  success: PostSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Unschedule a post");

export const RepostTarget = Tool.make("repost_target", {
  dependencies: [CurrentMember],
  description:
    "Publishes the post again, now, on one channel where it failed or is unconfirmed: everyone following that account sees it. When it is unconfirmed, ask the user to check the platform first: it may be live already, and would then appear twice. Only a failed or unconfirmed target is reposted.",
  failure: ToolRefused,
  parameters: Schema.Struct({ postId, targetId }),
  success: PostSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: true })
  )
  .annotate(Tool.Title, "Repost on a channel");

export const ConfirmTarget = Tool.make("confirm_target", {
  dependencies: [CurrentMember],
  description:
    "Records what the user found on the platform for a post Acme could not confirm on one channel, replacing its unconfirmed status: `published`, with its address if the user has it, or `notPublished`, which marks it failed there so it can be reposted. Record only what the user saw, never a guess. Its notifications are marked read.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    confirmation: TargetConfirmationSchema,
    postId,
    targetId,
  }),
  success: PostSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Confirm a post on a channel");

export const GetTikTokCreator = Tool.make("get_tiktok_creator", {
  dependencies: [CurrentMember],
  description:
    "Reads a TikTok channel's creator from TikTok, as TikTok asks a client to show them before a post: the nickname it posts as, the audiences (`privacyLevels`) the account offers, of which a TikTok post's privacyLevel must be one (there is no default: ask the user), the interactions they turned off (which must stay off), the longest video they may post, or why they cannot post now; and whether this server takes photos for TikTok. Before scheduling, the user must agree to TikTok's Music Usage Confirmation (and its Branded Content Policy for branded content). A channel that is not TikTok's is refused.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelId: Schema.String.annotate({
      description: "The TikTok channel, as list_channels answers its id.",
    }),
  }),
  success: TikTokAccountSchema,
})
  // It reads TikTok, outside Acme.
  .annotateMerge(reading.pipe(Context.add(Tool.OpenWorld, true)))
  .annotate(Tool.Title, "Read a TikTok creator");

/** The tools that read and change the workspace's posts. */
export const PostTools = Toolkit.make(
  ListDrafts,
  GetPost,
  CreateDraft,
  UpdateDraft,
  GetTikTokCreator,
  DiscardDraft,
  UnschedulePost,
  RepostTarget,
  ConfirmTarget
);
