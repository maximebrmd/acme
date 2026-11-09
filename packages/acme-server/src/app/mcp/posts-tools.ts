import {
  CurrentMember,
  DraftPageSchema,
  maxDraftPageSize,
  PostContentSchema,
  PostSchema,
  TargetConfirmationSchema,
} from "acme-contract";
import { Schema } from "effect";
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
    "Answers with a post of the workspace: what it says, when it goes out, and how it went on each channel (its `targets`, whose ids repost_target and confirm_target take).",
  failure: ToolRefused,
  parameters: Schema.Struct({ postId }),
  success: PostSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get a post");

export const CreateDraft = Tool.make("create_draft", {
  dependencies: [CurrentMember],
  description:
    "Saves a new draft in the workspace: its text, the media of the workspace it shows (ready ones, each with its alt text), the text it has instead on some channels, and the channels it is for. A draft goes out at no time: scheduling it is for the user, in the web app. Its text is checked against each platform's limits only once it is scheduled.",
  failure: ToolRefused,
  parameters: Schema.Struct({ channelIds, content: PostContentSchema }),
  success: PostSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: false })
  )
  .annotate(Tool.Title, "Create a draft");

export const UpdateDraft = Tool.make("update_draft", {
  dependencies: [CurrentMember],
  description:
    "Replaces a draft's content and channels with those given: text, media and channels left out are removed from it. Read the draft with get_post first, and send back what should stay. A post scheduled or sent is not a draft, and is refused.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelIds,
    content: PostContentSchema,
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

/** The tools that read and change the workspace's posts. */
export const PostTools = Toolkit.make(
  ListDrafts,
  GetPost,
  CreateDraft,
  UpdateDraft,
  DiscardDraft,
  UnschedulePost,
  RepostTarget,
  ConfirmTarget
);
