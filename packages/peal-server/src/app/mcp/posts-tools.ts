import { Context, Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";
import {
  BulkResultSchema,
  CurrentMember,
  defaultPostPageSize,
  DraftPageSchema,
  BulkPostSchema,
  ChannelSetReferencesSchema,
  duplicateWindowHours,
  idempotencyKeyLifetimeHours,
  maxBulkPosts,
  maxDraftPageSize,
  maxIdempotencyKeyLength,
  maxOutcomeWaitSeconds,
  maxPostPageSize,
  NewPostSchema,
  PlatformSchema,
  PostChannelSchema,
  PostContentSchema,
  PostDraftSchema,
  PostOriginViaSchema,
  PostOutcomeSchema,
  PostSchema,
  PostSortSchema,
  PostStatusSchema,
  PostValidationSchema,
  PublicationAttemptSchema,
  queueHorizonDays,
  QueuePostSchema,
  QueueReshuffleSchema,
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
    "What the post sets on the platforms that ask for more than text and media, one entry per channel, tagged by the channel's `platform`: YouTube's title (required), madeForKids (required), privacy, tags, categoryId, notifySubscribers, containsSyntheticMedia, license, embeddable, publicStatsViewable, defaultLanguage (a BCP 47 tag), recordingDate (as 2026-11-27) and thumbnailMediaId (a ready JPEG or PNG of the workspace's media, set once the video is up; a channel YouTube does not allow it is published without it, with `thumbnailNotSet`); TikTok's privacyLevel (required: one of the levels get_tiktok_creator answers), disableComment, disableDuet, disableStitch, commercialContent, brandOrganic, brandContent, aiGenerated, a video's videoCoverTimestampMs, and a photo post's photoTitle, autoAddMusic and photoCoverIndex; Google Business Profile's postType (standard when left out, event or offer), title, startsAt and endsAt (required for an event or an offer, as 2026-11-27T09:00 on the location's own clock), callToAction (book, order, shop, learnMore, signUp or call) with its callToActionUrl (none for call), and an offer's couponCode, redeemUrl and terms; Pinterest's boardId (required: a board's id from the pinterestBoards lookup, run_channel_lookup), boardSectionId (from pinterestBoardSections), title, link, coverSecond and dominantColor; LinkedIn's visibility (public when left out, connections on a profile, or loggedIn), disableReshare, mentions (company pages, each a name and urn as the linkedinOrganizations lookup answers them on a company page channel, the text holding @ and that name), linkUrl with its linkTitle and a linkDescription, and a PDF document's documentTitle; Mastodon's, Bluesky's, Threads' and X's reply, language, label and disclosure settings; Instagram's collaborators (up to 3 usernames of other accounts, each of which receives an invitation: set it only for accounts the user named) and, for a post of one video (a reel), shareToFeed, coverMediaId (a ready JPEG of the workspace's media), thumbOffsetMs, audioName and trialReel; Facebook's videoTitle, for a post of a video. Set an option only when the user chose it. get_channel_capabilities describes every field of a channel. A draft keeps them unfinished; scheduling needs the required ones.",
});

// The API's tags of a post, by id.
const tagIds = PostDraftSchema.fields.tagIds.schema.annotate({
  description:
    "The workspace's tags the post is filed under, as list_tags answers their ids, each once. Tags say nothing to the platforms.",
});

// What a post takes of what the workspace saved.
const saved = {
  channelSets: Schema.optionalKey(
    ChannelSetReferencesSchema.annotate({
      description:
        "Channel sets of the workspace the post is for as well, each by its id or its name whatever its case, as list_channel_sets answers them: the set's connected channels, with the options the set keeps for them where `options` gives none. A channel of a set that is no longer connected is left out, and the answer's `warnings` say which.",
    })
  ),
  defaultSignatures: Schema.optionalKey(
    Schema.Boolean.annotate({
      description:
        "True to put each channel's default signature under its text, as list_signatures answers them: the workspace's under the post's text, a platform's or a channel's own under the text that channel has instead.",
    })
  ),
  signatureId: Schema.optionalKey(
    Schema.String.annotate({
      description:
        "A signature of the workspace to put under the post's text, on every channel, as list_signatures answers its id.",
    })
  ),
};

const namesSets =
  "Instead of listing channels, or beside them, `channelSets` names channel sets of the workspace (list_channel_sets): a set's channels that are no longer connected are left out, and told in the answer's `warnings`, never silently, so tell the user which.";

const signs =
  "`signatureId` puts a signature under the text on every channel, and `defaultSignatures` each channel's default one: a signature becomes text of the post, is counted against the platforms' limits, and is never added twice. A post in several parts (`content.followUps`) is signed under its last part.";

const takesSaved = `${namesSets} ${signs} A channel without options takes those a set it names keeps for it, then its default options (get_channel_defaults).`;

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
    "Answers with a post of the workspace: what it says, when it goes out, the tags it is filed under (`tagIds`, which list_tags names), and how it went on each channel (its `targets`, whose ids repost_target and confirm_target take, each with `parts`: how many parts the post has there and those that are live, in order, as a post of several parts stops at the first that fails or has no confirmed outcome, each with its platform `options`, `keptPrivate` when YouTube kept the video private although it was asked otherwise, and `thumbnailNotSet` when YouTube set no thumbnail it was given). A failed target says why in `failureReason`: the platform refused its text or format (contentRejected) or a media (mediaRejected); its channel was disconnected (channelDisconnected), or turned off (channelDisabled: enable_channel turns it back on, then the post is scheduled anew, as it is not sent later), or a media deleted (mediaRemoved); Peal was down at its time (missed); the user found it missing (notPublished); the platform kept limiting Peal (rateLimited), its daily upload allowance stayed spent (quotaExceeded, YouTube's), it refused the account's token (tokenExpired) or could not be reached (unavailable); the platform takes only private posts from this server's app until it audits it (appNotAudited, TikTok's: the account must be private and the post visible to its owner only); or the platform refused this server's app until its operator pays for it (appBillingLimit, X's: credits used up or spending cap reached), which is not the post's fault; or the workspace's plan had no room for it when it was due (planLimit: more channels than the plan allows, or the month's posts used up), and nothing was sent; or some parts of a post of several are live and those after them were not sent (partsNotSent: `parts.live` lists what is out, and Peal cannot send the rest, as it has no post to reply to, so repost_target refuses it and the member posts the rest on the platform; repliesNotAllowed: the first parts are live and X did not let this server's app post the rest as replies, which repost_target refuses too).",
  failure: ToolRefused,
  parameters: Schema.Struct({ postId }),
  success: PostSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Get a post");

export const CreateDraft = Tool.make("create_draft", {
  dependencies: [CurrentMember],
  description: `Saves a new draft in the workspace: its text, the media of the workspace it shows (ready ones, each with its alt text), the text it has instead on some channels, the parts that follow it, the channels it is for, the options of those whose platform asks for more (X, LinkedIn, Bluesky, Mastodon, Threads, Instagram, Facebook, TikTok, YouTube, Pinterest, Google Business Profile), and the workspace's tags it is filed under (\`tagIds\`, none when left out). The parts are \`content.followUps\`, in order, each with its text, media, texts by channel and \`delaySeconds\`, the wait after the part before it: replies in a thread on the platforms whose channels get_channel_capabilities describes with \`followUps\`, refused when scheduled on the others. ${takesSaved} A draft goes out at no time until it is scheduled (schedule_post, or the user in the web app), so the user can review it first. Its text, media and options are checked against each platform's rules only once it is scheduled; options for another platform, or for a channel the draft is not for, are refused at once.`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelIds,
    content: PostContentSchema,
    options: Schema.optionalKey(options),
    tagIds: Schema.optionalKey(tagIds),
    ...saved,
  }),
  success: PostSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: false })
  )
  .annotate(Tool.Title, "Create a draft");

export const UpdateDraft = Tool.make("update_draft", {
  dependencies: [CurrentMember],
  description: `Replaces a draft's content and channels with those given: text, media, parts (\`content.followUps\`) and channels left out are removed from it. Read the draft with get_post first, and send back what should stay. Without \`options\`, the draft keeps the options it has on the channels it keeps; with them, they replace its options, and \`[]\` removes them all. Without \`tagIds\`, it keeps its tags too; with them, they replace its tags. ${namesSets} ${signs} A draft that changes takes no channel's default options: a channel without options takes those a set it names keeps for it, or none. A post scheduled or sent is not a draft, and is refused.`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelIds,
    content: PostContentSchema,
    options: Schema.optionalKey(options),
    postId,
    tagIds: Schema.optionalKey(tagIds),
    ...saved,
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

export const DuplicatePost = Tool.make("duplicate_post", {
  dependencies: [CurrentMember],
  description:
    "Makes a new draft that says what a post of the workspace says, whatever the post's status: its text, its media, its channels with their text and options, and its tags. What the workspace no longer has is left out rather than refused: a channel disconnected since, with the text the post had there, media deleted since, a tag deleted since; compare the answer with the post to tell the user. The copy has no time and goes out nowhere until someone schedules it, its author is whoever this connection acts for, and the post itself is not changed. Each call makes another draft.",
  failure: ToolRefused,
  parameters: Schema.Struct({ postId }),
  success: PostSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: false })
  )
  .annotate(Tool.Title, "Duplicate a post");

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

const queueReference = Schema.String.annotate({
  description:
    "The queue, by its id or its name whatever its case, as list_queues answers them; left out, the workspace's default queue.",
});

// When a new post goes out, as the API's `when`, its instant as text, and
// a queue named by its id or its name.
const when = Schema.Union([
  Schema.TaggedStruct("now", { timeZone: Schema.optionalKey(timeZone) }),
  Schema.TaggedStruct("at", { at, timeZone }),
  Schema.TaggedStruct("queue", { queue: Schema.optionalKey(queueReference) }),
]).annotate({
  description: `\`now\` publishes within seconds; \`at\` schedules for an instant; \`queue\` puts the post on the next free slot of a queue (\`queue\`, or the workspace's default), decided when the call is received, in the queue's time zone: without \`channelIds\` or \`channelSets\` it goes to the queue's channels. \`now\` and \`at\` keep the IANA time zone the time was chosen in (UTC when \`now\` gives none). A queue with no free slot within ${String(queueHorizonDays)} days is refused, and so is a slot in a month the plan has no room in.`,
});

/** When a post goes out, as a tool's arguments say it. */
export type ToolTiming = typeof when.Type;

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

const instant = (example: string) =>
  Schema.DateTimeUtcFromString.annotate({
    description: `An ISO 8601 timestamp, such as ${example}.`,
  });

const waitSeconds = Schema.optionalKey(
  Schema.Int.check(
    Schema.isBetween({ maximum: maxOutcomeWaitSeconds, minimum: 0 })
  )
).annotate({
  description: `How long to wait for the post to go out before answering, in seconds: ${String(maxOutcomeWaitSeconds)} at most, none unless given.`,
});

const waitsForOutcome = `It answers while the post publishes, unless \`waitSeconds\` says to wait for the outcome of a post that goes out now: the answer is then the post once every channel has its result (\`status\` finished: each target published, with its \`permalink\`, or failed, with its \`failureReason\`), or as it stands when the time runs out, some targets still pending or publishing: it goes on publishing, and await_post waits for the rest. A thread has its result on a channel once every part went out there or one failed; between two parts its target is publishing, and \`parts.live\` lists those that are out.`;

export const ListPosts = Tool.make("list_posts", {
  dependencies: [CurrentMember],
  description: `Lists the workspace's posts, whatever their state, a page at a time (${String(defaultPostPageSize)} unless \`limit\` says otherwise, ${String(maxPostPageSize)} at most): each whole, with its channels, how each went, its address there and why it failed. Every filter given must hold: \`status\` (draft, scheduled, publishing, finished, cancelled), \`outcome\` (how a finished post ended: \`failed\` and \`partiallyPublished\` are the ones to follow up), \`channelId\`, \`platform\`, \`from\` (included) and \`to\` (excluded) on the scheduled instant, which leave out posts without a time, \`createdVia\` (web, apiKey or application), \`authorId\`, \`tagId\` (the posts filed under that tag) and \`queueId\` (the posts that queue placed). \`sort\` orders by creation (createdDesc, the default, or createdAsc) or by scheduled instant (scheduledDesc, scheduledAsc: only posts with a time). Pass \`nextCursor\` as \`cursor\`, with the same filters and sort, for the next page; it is null on the last. \`channels\` gives the platform of each channel the page names.`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    authorId: Schema.optionalKey(Schema.String),
    channelId: Schema.optionalKey(Schema.String),
    createdVia: Schema.optionalKey(PostOriginViaSchema),
    cursor: Schema.optionalKey(Schema.String),
    from: Schema.optionalKey(instant("2026-06-01T00:00:00Z")),
    limit: Schema.optionalKey(
      Schema.Int.check(
        Schema.isBetween({ maximum: maxPostPageSize, minimum: 1 })
      )
    ),
    outcome: Schema.optionalKey(PostOutcomeSchema),
    platform: Schema.optionalKey(PlatformSchema),
    queueId: Schema.optionalKey(
      Schema.String.annotate({
        description:
          "Only the posts this queue placed, as list_queues answers its id.",
      })
    ),
    sort: Schema.optionalKey(PostSortSchema),
    status: Schema.optionalKey(PostStatusSchema),
    tagId: Schema.optionalKey(
      Schema.String.annotate({
        description:
          "Only the posts filed under this tag, as list_tags answers its id.",
      })
    ),
    to: Schema.optionalKey(instant("2026-07-01T00:00:00Z")),
  }),
  success: Schema.Struct({
    channels: Schema.Array(PostChannelSchema),
    nextCursor: Schema.NullOr(Schema.String),
    posts: Schema.Array(PostSchema),
  }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List posts");

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

export const QueuePost = Tool.make("queue_post", {
  dependencies: [CurrentMember],
  description: `Puts a post on the next free slot of a queue (\`queue\`, by its id or its name, or the workspace's default), decided when the call is received: a draft is scheduled there, on \`channelIds\` when given, on the channels it has otherwise, or, when it has none, on the queue's channels and its channel set's, with the set's options, as create_post onto the queue would (its \`warnings\` name the channels left out as disconnected); a scheduled post, or one awaiting approval, is moved there and keeps its channels. Its own slot counts as free: a post added again to its queue stays where it is, unless a slot before it was freed since, which it then takes. A queue with no free slot within ${String(queueHorizonDays)} days is refused, and so is a slot in a month the plan has no room in. ${reachesThePublic} ${refusedWhole} ${mayWait} ${needsPublishing}`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelIds: Schema.optionalKey(
      QueuePostSchema.fields.channelIds.schema.annotate({
        description:
          "For a draft: the channels it goes to, as list_channels answers their ids.",
      })
    ),
    postId,
    queue: Schema.optionalKey(queueReference),
  }),
  success: PostSchema,
})
  .annotateMerge(
    changing({ destructive: true, idempotent: true, openWorld: true })
  )
  .annotate(Tool.Title, "Add a post to a queue");

export const ReshuffleQueue = Tool.make("reshuffle_queue", {
  dependencies: [CurrentMember],
  description: `Moves the posts that wait in a queue (\`queue\`, by its id or its name) onto its slots as they are now: for after its timetable changed with update_queue, which moves no post by itself. The waiting posts (scheduled or awaiting approval, from now on) keep their order and take the queue's slots from now, the first onto the first, those moved by hand included; a post already on its slot stays as it is. Each move is what reschedule_post does: a new time on the same channels, the approval asked again where the workspace asks for approvals. What the posts say and where they go do not change. Answers how many moved, how many stayed (\`unchanged\`), and how many remain unplaced: it stops, keeping what it moved, at a month the plan has no room in (\`stoppedBy\` \`planLimit\`), when no slot is left within ${String(queueHorizonDays)} days (\`full\`), or when the queue was saved meanwhile (\`changed\`: call it again). Called again, it moves nothing. Do it only when the user asks for the queue's posts to be moved. ${needsPublishing}`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    queue: Schema.String.annotate({
      description:
        "The queue, by its id or its name whatever its case, as list_queues answers them.",
    }),
  }),
  success: QueueReshuffleSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: true, openWorld: false })
  )
  .annotate(Tool.Title, "Reshuffle a queue");

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
  description: `Creates a post and sends it in one call: its text, the ready media of the workspace it shows (list_media, import_media), the text it has instead on some channels, the parts that follow it (\`content.followUps\`: a thread where the platform has threads, each part sent in order, after its \`delaySeconds\`, and never after a part that failed), the options of the channels whose platform asks for more (YouTube, TikTok), the workspace's tags it is filed under (\`tagIds\`), and \`when\`: \`now\`, which publishes within seconds, or \`at\` an instant. ${takesSaved} A set none of whose channels is left, with no other channel, is refused. ${reachesThePublic} ${refusedWhole} Pass an \`idempotencyKey\` (any text of your choosing, at most ${String(maxIdempotencyKeyLength)} characters, new for each post) so that calling again after a lost answer makes no second post: within ${String(idempotencyKeyLifetimeHours)} hours the same key with the same arguments answers the post the first call made; with other arguments it is refused. Apart from keys, a post whose content already goes to one of its channels less than ${String(duplicateWindowHours)} hours from its time is refused, naming the post that has it: pass \`allowDuplicate: true\` only when the user means to post the same twice. ${waitsForOutcome} ${mayWait} ${needsPublishing}`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    allowDuplicate: NewPostSchema.fields.allowDuplicate,
    channelIds: NewPostSchema.fields.channelIds,
    content: NewPostSchema.fields.content,
    idempotencyKey: BulkPostSchema.fields.idempotencyKey,
    options: NewPostSchema.fields.options,
    tagIds: NewPostSchema.fields.tagIds,
    waitSeconds,
    when,
    ...saved,
  }),
  success: PostSchema,
})
  // With a key, a call sent again makes nothing more; without one it does.
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: true })
  )
  .annotate(Tool.Title, "Create and send a post");

const newPost = {
  allowDuplicate: NewPostSchema.fields.allowDuplicate,
  channelIds: NewPostSchema.fields.channelIds,
  content: NewPostSchema.fields.content,
  idempotencyKey: BulkPostSchema.fields.idempotencyKey,
  options: NewPostSchema.fields.options,
  tagIds: NewPostSchema.fields.tagIds,
  when,
  ...saved,
};

export const CreatePosts = Tool.make("create_posts", {
  dependencies: [CurrentMember],
  description: `Creates and sends up to ${String(maxBulkPosts)} posts in one call, each as create_post would: one post per item, each with its own channels, content, options, tags, \`channelSets\`, signatures and \`when\`, so the same content at several times, or at a time of its own on each channel, is several items. ${reachesThePublic} Items are taken in order, each on its own: one refused keeps none of the others from being made, and nothing is undone. The answer says, for each item by its place (\`index\`, from 0), \`created\` with its post, or \`refused\` with why (\`refusal\`: its \`_tag\` and fields, as PostContentInvalid with every violation, UnknownChannels, UnknownMedia, ScheduleInPast, InvalidTimeZone, PlanLimitReached, DuplicatePost, IdempotencyKeyReused, ChannelSetNotFound, SignatureNotFound): fix those and call again with them alone. ${takesSaved} A created item's post carries its \`warnings\`. Each item is checked against the posts made before it, the call's earlier items included, for the same content on the same channel within ${String(duplicateWindowHours)} hours (allowDuplicate on the item when it is meant). Pass an \`idempotencyKey\` for the whole call so that calling again after a lost answer makes no post twice: each item is kept under the key and its place, and the same call answers the posts it made (\`replayed\`). An item's own \`idempotencyKey\` is used instead for that item. ${needsPublishing}`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    idempotencyKey: newPost.idempotencyKey,
    posts: Schema.Array(Schema.Struct(newPost)).check(
      Schema.isMinLength(1),
      Schema.isMaxLength(maxBulkPosts)
    ),
  }),
  success: BulkResultSchema,
})
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: true })
  )
  .annotate(Tool.Title, "Create and send several posts");

export const ValidatePost = Tool.make("validate_post", {
  dependencies: [CurrentMember],
  description: `Checks a post without making it, and changes nothing: call it before create_post, create_posts or schedule_post to know what would be refused, and what each channel would receive. It answers \`valid\`, and everything that would refuse the post, all at once: per channel (\`channels\`), the text the channel receives, counted as its platform counts it against each of its limits (\`textCounts\`), its hashtags, mentions, links and media against the platform's maximum, the same for each part after the first of a thread (\`parts\`, by its place from 1), and every violation of the platform's rules and of the account's own, in any part; \`unknownChannels\` and \`unknownMedia\`, which are not the workspace's; and, when \`when\` is given, \`schedule\` (ok, inPast or invalidTimeZone), \`planLimit\` (the plan's limit it would pass, or null) \`duplicates\` (the channels that already have the same content from another post near its time) and \`awaitsApproval\` (whether the post would be made and then wait for a person to approve it, which refuses nothing). Leave \`when\` out to check a draft's content alone. It takes what the post would name of what the workspace saved, and checks the post as filled in: ${takesSaved} A post valid now can still be refused later: a channel disconnected, a month filled meanwhile.`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    allowDuplicate: NewPostSchema.fields.allowDuplicate,
    channelIds,
    content: PostContentSchema,
    options: Schema.optionalKey(options),
    when: Schema.optionalKey(when),
    ...saved,
  }),
  success: PostValidationSchema,
})
  // It asks a platform what an account takes, where one tells (TikTok).
  .annotateMerge(
    Context.make(Tool.Readonly, true).pipe(
      Context.add(Tool.Destructive, false),
      Context.add(Tool.Idempotent, true),
      Context.add(Tool.OpenWorld, true)
    )
  )
  .annotate(Tool.Title, "Validate a post");

export const AwaitPost = Tool.make("await_post", {
  dependencies: [CurrentMember],
  description: `Answers with a post once it has gone out: it waits up to \`waitSeconds\` (${String(maxOutcomeWaitSeconds)} at most) until every channel has its result, and answers the post then (\`status\` finished, each target published with its \`permalink\` or failed with its \`failureReason\`), or as it stands when the time runs out: call it again for the rest. A thread whose parts wait longer than that between them is still publishing then, with \`parts.live\` listing those that are out. A draft, a cancelled post and a post scheduled for later than the wait are answered at once. Waiting changes nothing.`,
  failure: ToolRefused,
  parameters: Schema.Struct({ postId, waitSeconds }),
  success: PostSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Wait for a post's outcome");

/** The tools that read and change the workspace's posts. */
export const PostTools = Toolkit.make(
  ListDrafts,
  ListPosts,
  GetPost,
  ListPostAttempts,
  CreateDraft,
  UpdateDraft,
  DuplicatePost,
  GetTikTokCreator,
  DiscardDraft,
  SchedulePost,
  PublishPost,
  ReschedulePost,
  QueuePost,
  ReshuffleQueue,
  CreatePost,
  CreatePosts,
  ValidatePost,
  AwaitPost,
  UnschedulePost,
  CancelPost,
  RepostTarget,
  ConfirmTarget
);
