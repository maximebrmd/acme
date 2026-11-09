import { Option, Schema } from "effect";

const mebibyte = 1024 * 1024;

const gibibyte = 1024 * mebibyte;

/** What a piece of media is, which decides its limits and how it is probed. */
export const MediaKindSchema = Schema.Literals(["image", "video"]);

export type MediaKind = typeof MediaKindSchema.Type;

/**
 * The content types acme accepts, as browsers and S3 name them. Each is
 * accepted by at least two of the platforms acme publishes to, so a file
 * stored here can go out somewhere without being converted first:
 *
 * - JPEG and PNG: every platform (Instagram takes JPEG only).
 * - GIF: Bluesky, Mastodon, LinkedIn, X and Facebook.
 * - WebP: Bluesky, Mastodon and X.
 * - MP4: every platform. QuickTime (.mov): X, Threads, Instagram, Mastodon
 *   and Facebook.
 *
 * Formats only one platform takes (HEIC, AVIF, WebM) wait for a conversion
 * step. Which platform takes which format is checked when a post is
 * scheduled, not here.
 */
export const MediaContentTypeSchema = Schema.Literals([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
]);

export type MediaContentType = typeof MediaContentTypeSchema.Type;

/** A stored file's kind, and the extension its storage key ends with. */
export interface MediaFormat {
  readonly extension: string;
  readonly kind: MediaKind;
}

export const mediaFormats = {
  "image/gif": { extension: "gif", kind: "image" },
  "image/jpeg": { extension: "jpg", kind: "image" },
  "image/png": { extension: "png", kind: "image" },
  "image/webp": { extension: "webp", kind: "image" },
  "video/mp4": { extension: "mp4", kind: "video" },
  "video/quicktime": { extension: "mov", kind: "video" },
} as const satisfies Readonly<Record<MediaContentType, MediaFormat>>;

/**
 * The largest file acme stores, per kind. Each is the largest limit any
 * target platform documents, so nothing a platform could take is refused:
 *
 * - Images, 16 MiB: Mastodon's documented example limit, above X's 15 MB
 *   for GIFs, Threads' and Instagram's 8 MB, X's 5 MB and Bluesky's
 *   2,000,000 bytes.
 * - Videos, 1 GiB: Threads takes up to 1 GB, LinkedIn 500 MB, Bluesky
 *   300,000,000 bytes and Instagram reels 300 MB. X allows up to 8 GB for
 *   videos of up to 20 minutes, which acme does not take yet.
 *
 * The limit of each platform, and of each Mastodon instance, is checked
 * when a post is scheduled.
 */
export const maxByteSize = {
  image: 16 * mebibyte,
  video: gibibyte,
} as const satisfies Readonly<Record<MediaKind, number>>;

/** A file's size in bytes: a whole number, at least 1. */
export const ByteSizeSchema = Schema.Int.check(Schema.isGreaterThan(0));

export type ByteSize = typeof ByteSizeSchema.Type;

const isMediaContentType = Schema.is(MediaContentTypeSchema);

/**
 * A content type as acme compares and stores it: lowercase, without
 * parameters such as `; charset=…`.
 */
export const normalizeContentType = (contentType: string): string =>
  (contentType.split(";").at(0) ?? "").trim().toLowerCase();

/** The accepted content type a client named, if acme accepts it. */
export const parseContentType = (
  contentType: string
): Option.Option<MediaContentType> =>
  Option.liftPredicate(normalizeContentType(contentType), isMediaContentType);

export const kindOf = (contentType: MediaContentType): MediaKind =>
  mediaFormats[contentType].kind;
