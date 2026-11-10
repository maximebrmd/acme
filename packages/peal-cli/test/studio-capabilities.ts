import type {
  FieldDescription,
  LookupDescription,
  LookupResult,
  Platform,
  PlatformCapabilities,
} from "peal-contract";

// What the synthetic studio's server says a post may hold: YouTube and
// TikTok with their options and lookups, every other platform plainly.

const field = (
  described: Partial<FieldDescription> & Pick<FieldDescription, "name" | "type">
): FieldDescription => ({
  forbiddenCharacters: [],
  ifLeftOut: null,
  lookup: null,
  maxLength: null,
  maximum: null,
  minimum: null,
  pattern: null,
  required: false,
  values: [],
  ...described,
});

const youtubeLookups: readonly LookupDescription[] = [
  {
    fills: ["categoryId"],
    input: [
      field({ name: "language", type: "text" }),
      field({ ifLeftOut: "US", name: "regionCode", type: "text" }),
    ],
    name: "youtubeVideoCategories",
    paged: false,
    platform: "youtube",
  },
  {
    fills: [],
    input: [
      field({ maxLength: 512, name: "cursor", type: "text" }),
      field({
        ifLeftOut: 25,
        maximum: 50,
        minimum: 1,
        name: "limit",
        type: "integer",
      }),
    ],
    name: "youtubePlaylists",
    paged: true,
    platform: "youtube",
  },
];

const tiktokLookups: readonly LookupDescription[] = [
  {
    fills: ["privacyLevel"],
    input: [],
    name: "tiktokCreator",
    paged: false,
    platform: "tiktok",
  },
];

const pageInput = [
  field({ maxLength: 512, name: "cursor", type: "text" }),
  field({
    ifLeftOut: 25,
    maximum: 50,
    minimum: 1,
    name: "limit",
    type: "integer",
  }),
];

const pinterestLookups: readonly LookupDescription[] = [
  {
    fills: ["boardId"],
    input: pageInput,
    name: "pinterestBoards",
    paged: true,
    platform: "pinterest",
  },
  {
    fills: ["boardSectionId"],
    input: [
      field({
        lookup: "pinterestBoards",
        name: "boardId",
        pattern: String.raw`^\d+$`,
        required: true,
        type: "text",
      }),
      ...pageInput,
    ],
    name: "pinterestBoardSections",
    paged: true,
    platform: "pinterest",
  },
];

const plain = (platform: Platform): PlatformCapabilities => ({
  analytics: {
    accountNumbers:
      platform === "mastodon" ? ["followers", "following", "posts"] : [],
    perPost: platform === "mastodon",
    postCounts:
      platform === "mastodon" ? ["likes", "reposts", "replies", "quotes"] : [],
  },
  followUps: platform === "mastodon" ? { kind: "thread", maxCount: 24 } : null,
  lookups: [],
  media: {
    altText: { maxLength: 1500, shown: true },
    formats: [
      {
        contentType: "image/jpeg",
        kind: "image",
        maxAspectRatio: null,
        maxByteSize: 16_777_216,
        maxDurationMs: null,
        maxMediaWith: null,
        maxPixels: 33_177_600,
        maxSide: null,
        minAspectRatio: null,
        minByteSize: null,
        minDurationMs: null,
        minSide: null,
      },
    ],
    maxCount: 4,
    maxVideos: 1,
    mixesKinds: false,
    required: false,
  },
  options: { constraints: [], fields: [] },
  platform,
  text: {
    forbiddenCharacters: [],
    limits: [
      { maximum: 500, unit: "codePoints" },
      { maximum: 65_536, unit: "utf16Units" },
    ],
    maxHashtags: null,
    maxLinks: null,
    maxMentions: null,
  },
  version: 1,
});

const youtube: PlatformCapabilities = {
  ...plain("youtube"),
  lookups: youtubeLookups,
  media: {
    altText: { maxLength: 5000, shown: false },
    formats: [
      {
        contentType: "video/mp4",
        kind: "video",
        maxAspectRatio: null,
        maxByteSize: 274_877_906_944,
        maxDurationMs: 43_200_000,
        maxMediaWith: null,
        maxPixels: null,
        maxSide: null,
        minAspectRatio: null,
        minByteSize: null,
        minDurationMs: null,
        minSide: null,
      },
    ],
    maxCount: 1,
    maxVideos: 1,
    mixesKinds: false,
    required: true,
  },
  options: {
    constraints: [],
    fields: [
      field({
        lookup: "youtubeVideoCategories",
        name: "categoryId",
        pattern: String.raw`^\d+$`,
        type: "text",
      }),
      field({ name: "madeForKids", required: true, type: "boolean" }),
      field({
        ifLeftOut: "public",
        name: "privacy",
        type: "choice",
        values: ["public", "unlisted", "private"],
      }),
      field({
        forbiddenCharacters: ["<", ">"],
        maxLength: 100,
        name: "title",
        required: true,
        type: "text",
      }),
    ],
  },
  text: {
    forbiddenCharacters: ["<", ">"],
    limits: [{ maximum: 5000, unit: "utf8Bytes" }],
    maxHashtags: null,
    maxLinks: null,
    maxMentions: null,
  },
};

const tiktok: PlatformCapabilities = {
  ...plain("tiktok"),
  lookups: tiktokLookups,
  options: {
    constraints: [
      {
        _tag: "needsOneOf",
        field: "commercialContent",
        oneOf: ["brandOrganic", "brandContent"],
      },
      {
        _tag: "notWith",
        field: "brandContent",
        other: "privacyLevel",
        value: "SELF_ONLY",
      },
    ],
    fields: [
      field({ ifLeftOut: true, name: "disableComment", type: "boolean" }),
      field({
        lookup: "tiktokCreator",
        name: "privacyLevel",
        required: true,
        type: "choice",
        values: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
      }),
    ],
  },
};

/** What the studio's server says of the platform. */
export const capabilitiesOn = (platform: Platform): PlatformCapabilities => {
  if (platform === "youtube") {
    return youtube;
  }

  if (platform === "pinterest") {
    return { ...plain(platform), lookups: pinterestLookups };
  }

  return platform === "tiktok" ? tiktok : plain(platform);
};

const studioBoard = "549755885001";

/**
 * The Pinterest channel's boards, or the sections of its one board: none
 * for sections asked without the board.
 */
export const pinterestLookup = (
  name: string,
  boardId: string | undefined
): LookupResult | undefined => {
  if (name === "pinterestBoards") {
    return {
      _tag: "pinterestBoards",
      items: [{ id: studioBoard, name: "Studio notes", privacy: "PUBLIC" }],
      nextCursor: null,
    };
  }

  return boardId === studioBoard
    ? {
        _tag: "pinterestBoardSections",
        items: [{ id: "5000000000001", name: "Sketches" }],
        nextCursor: null,
      }
    : undefined;
};

/** The platforms the studio's server describes, in its order. */
export const describedPlatforms: readonly Platform[] = [
  "mastodon",
  "bluesky",
  "tiktok",
  "youtube",
];

/** The YouTube channel's video categories. */
export const videoCategories: LookupResult = {
  _tag: "youtubeVideoCategories",
  items: [
    { id: "1", title: "Film & Animation" },
    { id: "22", title: "People & Blogs" },
  ],
  nextCursor: null,
};

const firstPlaylists: LookupResult = {
  _tag: "youtubePlaylists",
  items: [{ id: "PLsynthetic01", privacy: "public", title: "Launches" }],
  nextCursor: "page-1",
};

const lastPlaylists: LookupResult = {
  _tag: "youtubePlaylists",
  items: [{ id: "PLsynthetic02", privacy: null, title: "Field notes" }],
  nextCursor: null,
};

/**
 * The YouTube channel's playlists, two pages of one: the page `cursor`
 * names, or none for a cursor the studio never gave.
 */
export const playlistPage = (
  cursor: string | undefined
): LookupResult | undefined => {
  if (cursor === undefined) {
    return firstPlaylists;
  }

  return cursor === firstPlaylists.nextCursor ? lastPlaylists : undefined;
};
