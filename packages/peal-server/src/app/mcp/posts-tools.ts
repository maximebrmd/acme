import { Context, Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";
import {
  CurrentMember,
  DraftPageSchema,
  idempotencyKeyLifetimeHours,
  maxDraftPageSize,
  maxIdempotencyKeyLength,
  NewPostSchema,
  PostContentSchema,
  PostDraftSchema,
  PostSchema,
  PublicationAttemptSchema,
  TargetConfirmationSchema,
  TikTokAccountSchema,
} from "peal-contract";

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
    "What the post sets on the platforms that ask for more than text and media, one entry per channel, tagged by the channel's `platform`: YouTube's title (required), madeForKids (required), privacy, tags, categoryId, notifySubscribers and containsSyntheticMedia; TikTok's privacyLevel (required: one of the levels get_tiktok_creator answers), disableComment, disableDuet, disableStitch, commercialContent, brandOrganic, brandContent and aiGenerated; Google Business Profile's postType (standard when left out, event or offer), title, startsAt and endsAt (required for an event or an offer, as 2026-11-27T09:00 on the location's own clock), callToAction (book, order, shop, learnMore, signUp or call) with its callToActionUrl (none for call), and an offer's couponCode, redeemUrl and terms; Pinterest's boardId (required: a board's id from the pinterestBoards lookup, run_channel_lookup), boardSectionId (from pinterestBoardSections), title, link, coverSecond and dominantColor; LinkedIn's visibility (public when left out, connections on a profile, or loggedIn), disableReshare, mentions (company pages, each a name and urn as the linkedinOrganizations lookup answers them on a company page channel, the text holding @ and that name), linkUrl with its linkTitle and a linkDescription, and a PDF document's documentTitle. get_channel_capabilities describes every field of a channel. A draft keeps them unfinished; scheduling needs the required ones.",
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
    "Answers with a post of the workspace: what it says, when it goes out, and how it went on each channel (its `targets`, whose ids repost_target and confirm_target take, each with `parts`: how many parts the post has there and those that are live, in order, as a post of several parts stops at the first that fails or has no confirmed outcome, each with its platform `options`, and `keptPrivate` when YouTube kept the video private although it was asked otherwise). A failed target says why in `failureReason`: the platform refused its text or format (contentRejected) or a media (mediaRejected); its channel was disconnected (channelDisconnected) or turned off (channelDisabled), or a media deleted (mediaRemoved); Peal was down at its time (missed); the user found it missing (notPublished); the platform kept limiting Peal (rateLimited), its daily upload allowance stayed spent (quotaExceeded, YouTube's), it refused the account's token (tokenExpired) or could not be reached (unavailable); the platform takes only private posts from this server's app until it audits it (appNotAudited, TikTok's: the account must be private and the post visible to its owner only); or the platform refused this server's app until its operator pays for it (appBillingLimit, X's: credits used up or spending cap reached), which is not the post's fault; or the workspace's plan had no room for it when it was due (planLimit: more channels than the plan allows, or the month's posts used up), and nothing was sent; or some parts of a post of several are live and those after them were not sent (partsNotSent: `parts.live` lists what is out, and repost_target sends the rest, never a part that is live).",
  failure: ToolRefused,
  parameters: Schema.Struct({ postId }),
  success: PostSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get a post");

export const CreateDraft = Tool.make("create_draft", {
  dependencies: [CurrentMember],
  description:
    "Saves a new draft in the workspace: its text, the media of the workspace it shows (ready ones, each with its alt text), the text it has instead on some channels, the parts that follow it (`content.followUps`, in order, each with its text, media, texts by channel and `delaySeconds`, the wait after the part before it: replies in a thread on the platforms whose channels get_channel_capabilities describes with `followUps`, refused when scheduled on the others), the channels it is for, and the options of those whose platform asks for more (LinkedIn, TikTok, YouTube, Pinterest, Google Business Profile). A draft goes out at no time until it is scheduled (schedule_post, or the user in the web app), so the user can review it first. Its text, media and options are checked against each platform's rules only once it is scheduled; options for another platform, or for a channel the draft is not for, are refused at once.",
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
    "Replaces a draft's content and channels with those given: text, media, parts (`content.followUps`) and channels left out are removed from it. Read the draft with get_post first, and send back what should stay. Without `options`, the draft keeps the options it has on the channels it keeps; with them, they replace its options, and `[]` removes them all. A post scheduled or sent is not a draft, and is refused.",
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
    "Takes a scheduled post back to draft: it loses its time, and goes out at no time until someone schedules it again. A post already publishing is refused. Needs the scope workspace:publish, as everything that decides what goes out does.",
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
    "Publishes the post again, now, on one channel where it failed or is unconfirmed: everyone following that account sees it. When it is unconfirmed, ask the user to check the platform first: it may be live already, and would then appear twice. Only a failed or unconfirmed target is reposted. Needs the scope workspace:publish.",
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
    "Records what the user found on the platform for a post Peal could not confirm on one channel, replacing its unconfirmed status: `published`, with its address if the user has it, or `notPublished`, which marks it failed there so it can be reposted. Record only what the user saw, never a guess. Its notifications are marked read.",
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
  // It reads TikTok, outside Peal.
  .annotateMerge(reading.pipe(Context.add(Tool.OpenWorld, true)))
  .annotate(Tool.Title, "Read a TikTok creator");

// Instants come as text over MCP, and are read as the API reads them.
const at = Schema.DateTimeUtcFromString.annotate({
  description:
    "The instant it goes out, as an ISO 8601 timestamp with its offset or Z, such as 2026-06-15T08:00:00Z. Compute it from the wall-clock time the user gave in their time zone; a time more than a minute in the past is refused.",
});

const timeZone = Schema.String.annotate({
  description:
    "The IANA time zone the time was chosen in, such as Europe/Paris, which calendars show the post in. Offsets such as +01:00 are refused.",
});

// When a new post goes out, as the API's `when`, its instant as text.
const when = Schema.Union([
  Schema.TaggedStruct("now", { timeZone: Schema.optionalKey(timeZone) }),
  Schema.TaggedStruct("at", { at, timeZone }),
]).annotate({
  description:
    "`now` publishes within seconds; `at` schedules for an instant. Either keeps the IANA time zone it was chosen in (UTC when `now` gives none).",
});

// What every tool that puts a post out says of it.
const reachesThePublic =
  "What goes out is public on the platforms and seen by the accounts' followers; Peal cannot take it back once it is out. Do it only when the user asked for this post to be scheduled or published, on these channels: when in doubt, save a draft with create_draft and let them decide.";

// What every tool that checks a post against the platforms says of it.
const refusedWhole =
  "The post is checked against every channel's platform first (text length, media types, sizes and counts, required options, and what the account itself refuses): when anything is wrong, nothing is scheduled, and the refusal lists every violation at once, each with its channel, and its field or media, so one more call can fix them all.";

const mayWait =
  "In a workspace that asks for approvals, what this client sends or schedules is not refused but waits: the post answered has the status awaitingApproval, keeps its time, and goes out only once a person approves it (in the web app, or through a review link), or goes back to draft when that time passes first. Tell the user it waits; do not send it again.";

const needsPublishing =
  "Needs the scope workspace:publish, which the user grants when they connect this client, and a role that schedules posts (owner, admin or editor).";

export const ListPosts = Tool.make("list_posts", {
  dependencies: [CurrentMember],
  description:
    "Lists the workspace's posts scheduled from `from` (included) to `to` (excluded), at most 62 days apart, by scheduled instant: those still to go out, those that went out, with how each went on every channel, and cancelled ones with the time they had. Drafts have no time: list_drafts answers them.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    from: Schema.DateTimeUtcFromString.annotate({
      description: "An ISO 8601 timestamp, such as 2026-06-01T00:00:00Z.",
    }),
    to: Schema.DateTimeUtcFromString.annotate({
      description: "An ISO 8601 timestamp, such as 2026-07-01T00:00:00Z.",
    }),
  }),
  success: Schema.Struct({ posts: Schema.Array(PostSchema) }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List scheduled posts");

export const ListPostAttempts = Tool.make("list_post_attempts", {
  dependencies: [CurrentMember],
  description:
    "Lists every attempt Peal made at publishing a post, by channel (`targetId`), round and attempt, with how each ended and when Peal tried again: what happened to a post that went out late, failed or is unconfirmed. An attempt still in progress is not listed yet.",
  failure: ToolRefused,
  parameters: Schema.Struct({ postId }),
  success: Schema.Struct({ attempts: Schema.Array(PublicationAttemptSchema) }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List a post's attempts");

export const SchedulePost = Tool.make("schedule_post", {
  dependencies: [CurrentMember],
  description: `Schedules a draft to go out at an instant: on \`channelIds\` when given, which become its channels (those it had keep their options, new ones have none), otherwise on the channels it has. ${reachesThePublic} ${refusedWhole} Until its time, unschedule_post takes it back to draft and cancel_post cancels it. On a server that bills, the month must have room for it in the workspace's plan. ${mayWait} ${needsPublishing}`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    at,
    channelIds: Schema.optionalKey(
      Schema.NonEmptyArray(Schema.String).annotate({
        description:
          "The channels it goes out on, as list_channels answers their ids. Left out: the channels the draft has.",
      })
    ),
    postId,
    timeZone,
  }),
  success: PostSchema,
})
  // Scheduling the same draft again is refused: it is no longer a draft.
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: true })
  )
  .annotate(Tool.Title, "Schedule a draft");

export const PublishPost = Tool.make("publish_post", {
  dependencies: [CurrentMember],
  description: `Publishes a draft, or a post scheduled for later, now, on the channels it has: it goes out within seconds, and cannot be stopped once it started. ${reachesThePublic} ${refusedWhole} Then read it with get_post until its status is finished: its outcome and each target say how it went. ${mayWait} ${needsPublishing}`,
  failure: ToolRefused,
  parameters: Schema.Struct({ postId }),
  success: PostSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: true })
  )
  .annotate(Tool.Title, "Publish a post now");

export const ReschedulePost = Tool.make("reschedule_post", {
  dependencies: [CurrentMember],
  description: `Moves a scheduled post to another instant, replacing the time it had; what it says and where it goes stay. A draft is scheduled with schedule_post, and a post already publishing or finished is refused. ${reachesThePublic} ${mayWait} ${needsPublishing}`,
  failure: ToolRefused,
  parameters: Schema.Struct({ at, postId, timeZone }),
  success: PostSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: true })
  )
  .annotate(Tool.Title, "Reschedule a post");

export const CancelPost = Tool.make("cancel_post", {
  dependencies: [CurrentMember],
  description: `Cancels a draft or a scheduled post for good: it goes out at no time, stays in the calendar as cancelled, and cannot be scheduled again (to keep its text, use unschedule_post instead, which takes it back to draft). A post already publishing finishes with what its channels did: those not yet sent are cancelled, and what is out stays out. Nothing reaches a platform. ${needsPublishing}`,
  failure: ToolRefused,
  parameters: Schema.Struct({ postId }),
  success: PostSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Cancel a post");

export const CreatePost = Tool.make("create_post", {
  dependencies: [CurrentMember],
  description: `Creates a post and sends it in one call: its text, the ready media of the workspace it shows (list_media, import_media), the text it has instead on some channels, the parts that follow it (\`content.followUps\`: a thread where the platform has threads, each part sent in order, after its \`delaySeconds\`, and never after a part that failed), the options of the channels whose platform asks for more (YouTube, TikTok), and \`when\`: \`now\`, which publishes within seconds, or \`at\` an instant. ${reachesThePublic} ${refusedWhole} Pass an \`idempotencyKey\` (any text of your choosing, at most ${String(maxIdempotencyKeyLength)} characters, new for each post) so that calling again after a lost answer makes no second post: within ${String(idempotencyKeyLifetimeHours)} hours the same key with the same arguments answers the post the first call made; with other arguments it is refused. ${mayWait} ${needsPublishing}`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelIds: NewPostSchema.fields.channelIds,
    content: NewPostSchema.fields.content,
    idempotencyKey: Schema.optionalKey(
      Schema.String.check(Schema.isBetweenLength(1, maxIdempotencyKeyLength))
    ),
    options: NewPostSchema.fields.options,
    when,
  }),
  success: PostSchema,
})
  // With a key, a call sent again makes nothing more; without one it does.
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: true })
  )
  .annotate(Tool.Title, "Create and send a post");

/** The tools that read and change the workspace's posts. */
export const PostTools = Toolkit.make(
  ListDrafts,
  ListPosts,
  GetPost,
  ListPostAttempts,
  CreateDraft,
  UpdateDraft,
  GetTikTokCreator,
  DiscardDraft,
  SchedulePost,
  PublishPost,
  ReschedulePost,
  CreatePost,
  UnschedulePost,
  CancelPost,
  RepostTarget,
  ConfirmTarget
);
