import { Option, Schema } from "effect";

import type { Platform } from "#shared/domain/platform.ts";

import { describeFields, isDescribed } from "./field-description.ts";
import type { FieldDescription, FieldNotes } from "./field-description.ts";
import type { TikTokBlock, TikTokCreator } from "./tiktok-creator.ts";

/**
 * What a platform tells about an account that a post's options refer to,
 * read from the platform when asked: YouTube's video categories, whose ids
 * `categoryId` takes, and the channel's playlists; a TikTok creator's
 * posting settings, whose audiences `privacyLevel` takes; a Pinterest
 * account's boards, whose ids `boardId` takes, and a board's sections,
 * for `boardSectionId`.
 *
 * A lookup is a name, the platform it reads, the input it takes (a struct
 * of optional fields, described to clients from the schema itself, of which
 * `required` names those it cannot run without) and the items it answers. Adding one is adding its name, its entry in `lookups`,
 * its member in `LookupQuery` and `LookupResult`, an adapter behind
 * `PlatformLookups`, and the contract's copy.
 */
export const LookupNameSchema = Schema.Literals([
  "youtubeVideoCategories",
  "youtubePlaylists",
  "tiktokCreator",
  "pinterestBoards",
  "pinterestBoardSections",
]);

export type LookupName = typeof LookupNameSchema.Type;

/** The most items a page holds, whatever the lookup. */
export const maxLookupPageSize = 50;

/** How many items a page holds when the input names no `limit`. */
export const defaultLookupPageSize = 25;

/** The region video categories are listed for when the input names none. */
export const defaultCategoryRegion = "US";

// ISO 3166-1 alpha-2, as YouTube's `regionCode`.
const regionCode = /^[A-Z]{2}$/u;

// A BCP 47 tag as YouTube's `hl` takes them, such as "fr" or "pt-BR".
const languageTag = /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/u;

const maxCursorLength = 512;

const CursorSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(maxCursorLength)
);

const LimitSchema = Schema.Int.check(
  Schema.isBetween({ maximum: maxLookupPageSize, minimum: 1 })
);

/** What listing YouTube's video categories takes. */
export const YouTubeVideoCategoriesInputSchema = Schema.Struct({
  language: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(languageTag))
  ),
  regionCode: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(regionCode))
  ),
});

/** What listing a YouTube channel's playlists takes. */
export const YouTubePlaylistsInputSchema = Schema.Struct({
  cursor: Schema.optionalKey(CursorSchema),
  limit: Schema.optionalKey(LimitSchema),
});

// A board's id: digits, as Pinterest's API gives them.
const pinterestBoardId = /^\d+$/u;

/** What listing a Pinterest account's boards takes. */
export const PinterestBoardsInputSchema = Schema.Struct({
  cursor: Schema.optionalKey(CursorSchema),
  limit: Schema.optionalKey(LimitSchema),
});

/** What listing a Pinterest board's sections takes: the board, always. */
export const PinterestBoardSectionsInputSchema = Schema.Struct({
  boardId: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(pinterestBoardId))
  ),
  cursor: Schema.optionalKey(CursorSchema),
  limit: Schema.optionalKey(LimitSchema),
});

/** Reading a TikTok creator takes nothing. */
export const TikTokCreatorInputSchema = Schema.Struct({});

/**
 * A lookup's input as a client sent it, before the lookup's own schema
 * reads it: an object of JSON values.
 */
export const LookupInputSchema = Schema.Record(Schema.String, Schema.Json);

export type LookupInput = typeof LookupInputSchema.Type;

/** A category a YouTube video can be filed under. */
export interface YouTubeVideoCategory {
  /** What `categoryId` takes. */
  readonly id: string;
  readonly title: string;
}

/** A playlist of a YouTube channel. */
export interface YouTubePlaylist {
  readonly id: string;
  /** Who can see it; none when YouTube does not say. */
  readonly privacy: Option.Option<string>;
  readonly title: string;
}

/** What TikTok says of a channel's creator, and of this server. */
export interface TikTokCreatorItem {
  readonly posting:
    | { readonly _tag: "ready"; readonly creator: TikTokCreator }
    | { readonly _tag: "blocked"; readonly reason: TikTokBlock };
  /** Whether this server can post photos to TikTok. */
  readonly takesPhotos: boolean;
}

/** A board of a Pinterest account, or a group board it pins to. */
export interface PinterestBoard {
  /** What `boardId` takes. */
  readonly id: string;
  readonly name: string;
  /**
   * Who can see it, as Pinterest says: PUBLIC or PROTECTED; none when
   * Pinterest does not say.
   */
  readonly privacy: Option.Option<string>;
}

/** A section of a Pinterest board. */
export interface PinterestBoardSection {
  /** What `boardSectionId` takes. */
  readonly id: string;
  readonly name: string;
}

/** A lookup to run, with its input decoded. */
export type LookupQuery =
  | {
      readonly _tag: "youtubeVideoCategories";
      readonly language: Option.Option<string>;
      readonly regionCode: string;
    }
  | {
      readonly _tag: "youtubePlaylists";
      readonly cursor: Option.Option<string>;
      readonly limit: number;
    }
  | { readonly _tag: "tiktokCreator" }
  | {
      readonly _tag: "pinterestBoards";
      readonly cursor: Option.Option<string>;
      readonly limit: number;
    }
  | {
      readonly _tag: "pinterestBoardSections";
      readonly boardId: string;
      readonly cursor: Option.Option<string>;
      readonly limit: number;
    };

interface Page<Tag extends LookupName, Item> {
  readonly _tag: Tag;
  readonly items: readonly Item[];
  /** What the next page's `cursor` takes; none on the last page. */
  readonly nextCursor: Option.Option<string>;
}

/** A page of what a lookup answered. */
export type LookupResult =
  | Page<"youtubeVideoCategories", YouTubeVideoCategory>
  | Page<"youtubePlaylists", YouTubePlaylist>
  | Page<"tiktokCreator", TikTokCreatorItem>
  | Page<"pinterestBoards", PinterestBoard>
  | Page<"pinterestBoardSections", PinterestBoardSection>;

/** The result of the lookup named `Name`. */
export type LookupResultOf<Name extends LookupName> = Extract<
  LookupResult,
  { readonly _tag: Name }
>;

/** The query of the lookup named `Name`. */
export type LookupQueryOf<Name extends LookupName> = Extract<
  LookupQuery,
  { readonly _tag: Name }
>;

interface LookupDefinition<Name extends LookupName> {
  /** The input's fields, as clients send them. */
  readonly input: Schema.Struct<Readonly<Record<string, Schema.Top>>>;
  readonly notes: Readonly<Record<string, FieldNotes<LookupName>>>;
  /** Its answer comes in pages, each naming the next one's cursor. */
  readonly paged: boolean;
  readonly platform: Platform;
  /** The input's fields the lookup cannot run without; none when left out. */
  readonly required?: readonly string[];
  /** The query for an input that decoded; none for one that did not. */
  readonly query: (input: LookupInput) => Option.Option<LookupQueryOf<Name>>;
}

const decodeCategories = Schema.decodeUnknownOption(
  YouTubeVideoCategoriesInputSchema,
  { onExcessProperty: "error" }
);

const decodePlaylists = Schema.decodeUnknownOption(
  YouTubePlaylistsInputSchema,
  { onExcessProperty: "error" }
);

const decodeBoards = Schema.decodeUnknownOption(PinterestBoardsInputSchema, {
  onExcessProperty: "error",
});

const decodeBoardSections = Schema.decodeUnknownOption(
  PinterestBoardSectionsInputSchema,
  { onExcessProperty: "error" }
);

const pageNotes = {
  cursor: { maxLength: maxCursorLength },
  limit: {
    ifLeftOut: defaultLookupPageSize,
    maximum: maxLookupPageSize,
    minimum: 1,
  },
} as const;

// An empty struct takes any object: an input without fields is a record
// that holds nothing.
const decodeCreator = Schema.decodeUnknownOption(
  Schema.Record(Schema.String, Schema.Never)
);

/** Every lookup, by name. */
export const lookups = {
  pinterestBoardSections: {
    input: PinterestBoardSectionsInputSchema,
    notes: {
      ...pageNotes,
      boardId: { lookup: "pinterestBoards", pattern: pinterestBoardId.source },
    },
    paged: true,
    platform: "pinterest",
    query: (input) =>
      decodeBoardSections(input).pipe(
        Option.flatMap(({ boardId, cursor, limit }) =>
          Option.fromUndefinedOr(boardId).pipe(
            Option.map((board) => ({
              _tag: "pinterestBoardSections" as const,
              boardId: board,
              cursor: Option.fromUndefinedOr(cursor),
              limit: limit ?? defaultLookupPageSize,
            }))
          )
        )
      ),
    required: ["boardId"],
  },
  pinterestBoards: {
    input: PinterestBoardsInputSchema,
    notes: pageNotes,
    paged: true,
    platform: "pinterest",
    query: (input) =>
      decodeBoards(input).pipe(
        Option.map(({ cursor, limit }) => ({
          _tag: "pinterestBoards" as const,
          cursor: Option.fromUndefinedOr(cursor),
          limit: limit ?? defaultLookupPageSize,
        }))
      ),
  },
  tiktokCreator: {
    input: TikTokCreatorInputSchema,
    notes: {},
    paged: false,
    platform: "tiktok",
    query: (input) =>
      decodeCreator(input).pipe(
        Option.map(() => ({ _tag: "tiktokCreator" as const }))
      ),
  },
  youtubePlaylists: {
    input: YouTubePlaylistsInputSchema,
    notes: pageNotes,
    paged: true,
    platform: "youtube",
    query: (input) =>
      decodePlaylists(input).pipe(
        Option.map(({ cursor, limit }) => ({
          _tag: "youtubePlaylists" as const,
          cursor: Option.fromUndefinedOr(cursor),
          limit: limit ?? defaultLookupPageSize,
        }))
      ),
  },
  youtubeVideoCategories: {
    input: YouTubeVideoCategoriesInputSchema,
    notes: {
      language: { pattern: languageTag.source },
      regionCode: {
        ifLeftOut: defaultCategoryRegion,
        pattern: regionCode.source,
      },
    },
    paged: false,
    platform: "youtube",
    query: (input) =>
      decodeCategories(input).pipe(
        Option.map(({ language, regionCode: region }) => ({
          _tag: "youtubeVideoCategories" as const,
          language: Option.fromUndefinedOr(language),
          regionCode: region ?? defaultCategoryRegion,
        }))
      ),
  },
} satisfies { readonly [Name in LookupName]: LookupDefinition<Name> };

/** A lookup as clients are told of it. */
export interface LookupDescription {
  /** The fields its input takes, and which of them it needs. */
  readonly input: readonly FieldDescription<LookupName>[];
  readonly name: LookupName;
  readonly paged: boolean;
  readonly platform: Platform;
}

/** The names of every lookup, in their order. */
export const lookupNames: readonly LookupName[] = LookupNameSchema.literals;

/** What clients are told of the lookup. */
export const describeLookup = (name: LookupName): LookupDescription => {
  const definition: LookupDefinition<LookupName> = lookups[name];
  const { input, notes, paged, platform } = definition;

  return {
    input: describeFields<LookupName>(input.fields, {
      notes,
      required: definition.required ?? [],
    }).filter(isDescribed),
    name,
    paged,
    platform,
  };
};

/** The lookups the platform's channels have. */
export const lookupsOn = (platform: Platform): readonly LookupDescription[] =>
  lookupNames.flatMap((name) =>
    lookups[name].platform === platform ? [describeLookup(name)] : []
  );

const decodeName = Schema.decodeUnknownOption(LookupNameSchema);

/** The platform's lookup of that name, if it has one. */
export const lookupNamed = (
  platform: Platform,
  name: string
): Option.Option<LookupName> =>
  decodeName(name).pipe(
    Option.filter((known) => lookups[known].platform === platform)
  );

/** The query the lookup runs for `input`; none when it refuses the input. */
export const queryOf = (
  name: LookupName,
  input: LookupInput
): Option.Option<LookupQuery> => lookups[name].query(input);
