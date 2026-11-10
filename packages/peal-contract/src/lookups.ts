import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { ChannelCannotPost } from "./channel-cannot-post.ts";
import { ChannelNotFound } from "./channel-not-found.ts";
import { FieldDescriptionSchema } from "./field-description.ts";
import { Forbidden } from "./forbidden.ts";
import { LookupInputInvalid } from "./lookup-input-invalid.ts";
import { LookupNameSchema } from "./lookup-name.ts";
import { LookupNotFound } from "./lookup-not-found.ts";
import { PlatformRateLimited } from "./platform-rate-limited.ts";
import { PlatformUnreachable } from "./platform-unreachable.ts";
import { PlatformSchema } from "./platform.ts";
import { TikTokAccountSchema } from "./tiktok.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

// What a platform tells about an account that a post's options refer to,
// read from the platform when asked. The server's lookups
// (src/publishing/domain/lookup.ts) are the source; a test keeps the names
// and the input's fields equal.

/** The most items a page holds, whatever the lookup. */
export const maxLookupPageSize = 50;

/**
 * A lookup a channel has: its name, the fields its input takes (each says
 * whether the lookup needs it), whether its answer comes in pages, and the
 * options of the platform whose values it answers.
 */
export const LookupDescriptionSchema = Schema.Struct({
  // The names of the platform's options that refer to it.
  fills: Schema.Array(Schema.String),
  input: Schema.Array(FieldDescriptionSchema),
  name: LookupNameSchema,
  // Its answer names the next page's `cursor` until the last one.
  paged: Schema.Boolean,
  platform: PlatformSchema,
}).annotate({ identifier: "LookupDescription" });

export type LookupDescription = typeof LookupDescriptionSchema.Type;

/**
 * What a lookup is asked. Each lookup takes only the fields its
 * description lists, and refuses the others, or an input without a field
 * it needs (LookupInputInvalid).
 */
export const LookupInputSchema = Schema.Struct({
  // The Pinterest board whose sections are listed, by its id: digits.
  // `pinterestBoardSections` needs it.
  boardId: Schema.optionalKey(Schema.String.check(Schema.isPattern(/^\d+$/u))),
  // The page to read, as the page before named it in `nextCursor`.
  cursor: Schema.optionalKey(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(512))
  ),
  // The language titles come in, as a BCP 47 tag such as "fr" or "pt-BR".
  language: Schema.optionalKey(
    Schema.String.check(
      Schema.isPattern(/^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/u)
    )
  ),
  // How many items a page holds: 25 when left out.
  limit: Schema.optionalKey(
    Schema.Int.check(
      Schema.isBetween({ maximum: maxLookupPageSize, minimum: 1 })
    )
  ),
  // A country, as two capital letters (ISO 3166-1 alpha-2): "US" when
  // left out.
  regionCode: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(/^[A-Z]{2}$/u))
  ),
}).annotate({ identifier: "LookupInput" });

export type LookupInput = typeof LookupInputSchema.Type;

/** A category a YouTube video can be filed under: `categoryId` takes `id`. */
export const YouTubeVideoCategorySchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
}).annotate({ identifier: "YouTubeVideoCategory" });

/** A playlist of a YouTube channel. */
export const YouTubePlaylistSchema = Schema.Struct({
  id: Schema.String,
  // Who can see it, as YouTube says: public, unlisted or private; null
  // when YouTube does not say.
  privacy: Schema.NullOr(Schema.String),
  title: Schema.String,
}).annotate({ identifier: "YouTubePlaylist" });

/** A board of a Pinterest account: `boardId` takes `id`. */
export const PinterestBoardSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  // Who can see it, as Pinterest says: PUBLIC or PROTECTED; null when
  // Pinterest does not say.
  privacy: Schema.NullOr(Schema.String),
}).annotate({ identifier: "PinterestBoard" });

/** A section of a Pinterest board: `boardSectionId` takes `id`. */
export const PinterestBoardSectionSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
}).annotate({ identifier: "PinterestBoardSection" });

const page = <Item extends Schema.Top>(item: Item) => ({
  items: Schema.Array(item),
  // What the next page's `cursor` takes; null on the last page.
  nextCursor: Schema.NullOr(Schema.String),
});

/**
 * A page of what a lookup answered, tagged by the lookup's name. A lookup
 * that reads one thing, as `tiktokCreator`, answers it as the only item.
 */
export const LookupResultSchema = Schema.Union([
  Schema.TaggedStruct(
    "youtubeVideoCategories",
    page(YouTubeVideoCategorySchema)
  ),
  Schema.TaggedStruct("youtubePlaylists", page(YouTubePlaylistSchema)),
  Schema.TaggedStruct("tiktokCreator", page(TikTokAccountSchema)),
  Schema.TaggedStruct("pinterestBoards", page(PinterestBoardSchema)),
  Schema.TaggedStruct(
    "pinterestBoardSections",
    page(PinterestBoardSectionSchema)
  ),
]).annotate({ identifier: "LookupResult" });

export type LookupResult = typeof LookupResultSchema.Type;

const channel = { channelId: Schema.String, workspaceId: Schema.String };

/** What platforms tell about a channel's account. */
export class LookupsApi extends HttpApiGroup.make("lookups")
  .add(
    HttpApiEndpoint.get("list", "/:channelId/lookups", {
      error: [Forbidden, ChannelNotFound],
      params: channel,
      success: Schema.Array(LookupDescriptionSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the lookups the channel has: what its platform tells about the account that a post's options refer to, such as the categories a YouTube video can be filed under or the boards a Pinterest Pin can be saved to. Each says the input it takes and the options it fills. Empty for a platform without lookups. Needs channel:read.",
        summary: "List a channel's lookups",
      })
    ),
    HttpApiEndpoint.post("run", "/:channelId/lookups/:name", {
      error: [
        Forbidden,
        ChannelNotFound,
        LookupNotFound,
        LookupInputInvalid,
        ChannelCannotPost,
        PlatformUnreachable,
        PlatformRateLimited,
      ],
      params: { ...channel, name: Schema.String },
      payload: LookupInputSchema,
      success: LookupResultSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Runs one of the channel's lookups: asks the platform now, with the channel's token, and answers a page of items tagged by the lookup's name. It changes nothing, on Peal or on the platform. A paged lookup names the next page in `nextCursor`, to send back as `cursor`. A name the channel's platform does not have is LookupNotFound; an input the lookup does not take, LookupInputInvalid; a channel turned off or to reconnect, ChannelCannotPost; a platform that did not answer, PlatformUnreachable, and one that asked to slow down, PlatformRateLimited. Needs channel:read.",
        summary: "Run a channel's lookup",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/channels") {}
