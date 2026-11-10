import { Context, Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";
import {
  ChannelCapabilitiesSchema,
  CurrentMember,
  LookupInputSchema,
  LookupResultSchema,
} from "peal-contract";

import { reading } from "#app/mcp/annotations.ts";
import { ToolRefused } from "#app/mcp/tool-refused.ts";

// Both ask the channel's platform, outside Peal, and change nothing.
const readingPlatforms = reading.pipe(Context.add(Tool.OpenWorld, true));

export const GetChannelCapabilities = Tool.make("get_channel_capabilities", {
  dependencies: [CurrentMember],
  description:
    "Answers what a post on one of the workspace's channels may hold, so nothing about its platform need be guessed: `capabilities.text` (every limit applies, each counted in its `unit`; hashtags, mentions and links at most; characters refused), `capabilities.media` (whether a post needs media, how many, the file types taken with their sizes, durations, pixels and aspect ratios, and alt text), `capabilities.options` (the fields a draft's `options` take on this channel: each one's `type`, the `values` of a choice, `required` to schedule, `maxLength`, what the platform does `ifLeftOut`, the `lookup` that answers its values, and the `constraints` between fields), `capabilities.lookups` (what run_channel_lookup can ask of the platform) and whether Peal reads each post's counts (`capabilities.analytics.perPost`). `account` adds what this account narrows, read from the platform now: on TikTok, the audiences `privacyLevel` may take (`optionValues`), the interactions that must stay off (`optionFixed`), the longest video, file types refused, and `blocked` when the account cannot post now; `unread` says why the platform could not be asked, and the platform's rules still hold. A null limit is one Peal does not check: the platform may still refuse the post. It changes nothing.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelId: Schema.String.annotate({
      description: "The channel, as list_channels answers its id.",
    }),
  }),
  success: ChannelCapabilitiesSchema,
})
  .annotateMerge(readingPlatforms)
  .annotate(Tool.Title, "Get what a channel takes");

export const RunChannelLookup = Tool.make("run_channel_lookup", {
  dependencies: [CurrentMember],
  description:
    "Asks a channel's platform, now, for account data a post's options refer to, and answers a page of `items` tagged by the lookup's name. The lookups a channel has, the `input` fields each takes (optional unless marked `required`) and the options each fills are in get_channel_capabilities (`capabilities.lookups`): on YouTube, `youtubeVideoCategories` (the categories a video can be filed under in `regionCode`, \"US\" when left out, titles in `language`: an item's `id` is what the `categoryId` option takes) and `youtubePlaylists` (the channel's playlists, `limit` to a page, 25 when left out and 50 at most); on TikTok, `tiktokCreator` (the creator as get_tiktok_creator answers them, as the only item); on Pinterest, `pinterestBoards` (the account's boards: an item's `id` is what the `boardId` option takes) and `pinterestBoardSections` (the sections of the board `boardId` names, which it needs: an item's `id` is what `boardSectionId` takes), both in pages of `limit`; on a LinkedIn company page channel, never a profile's, `linkedinOrganizations` (the page whose address holds `vanityName`, which it needs, linkedin.com/company/<vanityName>: an item's `name` and `urn` are what a `mentions` entry takes, the text naming the page as `@` and that exact name). When `nextCursor` is not null, call again with it as `input.cursor` for the next page. It changes nothing, on Peal or on the platform; each call spends some of the platform's allowance for this server, so ask only for what the post needs: a channel's lookups reach its platform 30 times a minute at most (past it, the refusal says when to ask again), and the same lookup with the same input is answered from its last answer for a minute.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    channelId: Schema.String.annotate({
      description: "The channel, as list_channels answers its id.",
    }),
    input: Schema.optionalKey(LookupInputSchema).annotate({
      description:
        "What the lookup is asked: only the fields its description lists.",
    }),
    name: Schema.String.annotate({
      description:
        "The lookup's name, as get_channel_capabilities lists it for the channel.",
    }),
  }),
  success: Schema.Struct({ result: LookupResultSchema }),
})
  .annotateMerge(readingPlatforms)
  .annotate(Tool.Title, "Run a channel's lookup");

/** The tools that tell what a channel takes. */
export const CapabilityTools = Toolkit.make(
  GetChannelCapabilities,
  RunChannelLookup
);
