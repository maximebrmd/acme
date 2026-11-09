import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { AltTextTooLong } from "./alt-text-too-long.ts";
import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { MediaInUse } from "./media-in-use.ts";
import { MediaNotFound } from "./media-not-found.ts";
import { MediaStatusSchema } from "./media-status.ts";
import { MediaStoreUnavailable } from "./media-store-unavailable.ts";
import { MediaTooLarge } from "./media-too-large.ts";
import { PlanLimitReached } from "./plan-limit-reached.ts";
import { UnsupportedMediaType } from "./unsupported-media-type.ts";
import { UploadIncomplete } from "./upload-incomplete.ts";
import { UploadRejected } from "./upload-rejected.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** The content types Peal stores. */
export const MediaContentTypeSchema = Schema.Literals([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
]).annotate({ identifier: "MediaContentType" });

export type MediaContentType = typeof MediaContentTypeSchema.Type;

export const MediaKindSchema = Schema.Literals(["image", "video"]).annotate({
  identifier: "MediaKind",
});

export type MediaKind = typeof MediaKindSchema.Type;

const PixelsSchema = Schema.Int.check(Schema.isGreaterThan(0));

/** An image or video of the workspace. */
export const MediaSchema = Schema.Struct({
  // What it shows, for people who cannot see it.
  altText: Schema.NullOr(Schema.String),
  byteSize: Schema.Int,
  // The video codec, as ffprobe names it (h264, hevc…), once probed.
  codec: Schema.NullOr(Schema.String),
  contentType: MediaContentTypeSchema,
  createdAt: Schema.DateTimeUtc,
  // Width and height as displayed, once probed.
  dimensions: Schema.NullOr(
    Schema.Struct({ height: PixelsSchema, width: PixelsSchema })
  ),
  // A video's duration in milliseconds, once probed.
  durationMs: Schema.NullOr(Schema.Int),
  id: Schema.String,
  kind: MediaKindSchema,
  status: MediaStatusSchema,
  updatedAt: Schema.DateTimeUtc,
  // Where the file can be read for an hour, to show it: null while the file
  // is not stored.
  url: Schema.NullOr(Schema.String),
}).annotate({ identifier: "Media" });

export type Media = typeof MediaSchema.Type;

/**
 * A request the client sends straight to the media store. Send the headers
 * exactly as given: the store checks them.
 */
export const SignedRequestSchema = Schema.Struct({
  headers: Schema.Record(Schema.String, Schema.String),
  method: Schema.Literal("PUT"),
  url: Schema.String,
}).annotate({ identifier: "SignedRequest" });

export type SignedRequest = typeof SignedRequestSchema.Type;

/** One part of a file uploaded in parts, with its exact size. */
export const UploadPartSchema = Schema.Struct({
  byteSize: Schema.Int,
  partNumber: Schema.Int,
  request: SignedRequestSchema,
}).annotate({ identifier: "UploadPart" });

export type UploadPart = typeof UploadPartSchema.Type;

/**
 * How to send the file, and until when each request can start:
 *
 * - `single`: one PUT of the whole file, which only creates it: sent again
 *   once the file is stored, the store answers 412.
 * - `multipart`: one PUT per part. Part n holds the bytes from
 *   `(n - 1) × partSize`, `byteSize` of them. Parts can go in any order,
 *   several at once, and be sent again.
 */
export const UploadTargetSchema = Schema.Union([
  Schema.TaggedStruct("single", {
    expiresAt: Schema.DateTimeUtc,
    request: SignedRequestSchema,
  }),
  Schema.TaggedStruct("multipart", {
    expiresAt: Schema.DateTimeUtc,
    partSize: Schema.Int,
    parts: Schema.Array(UploadPartSchema),
  }),
]).annotate({ identifier: "UploadTarget" });

export type UploadTarget = typeof UploadTargetSchema.Type;

export const NewUploadSchema = Schema.Struct({
  // What it shows, for people who cannot see it. It can also be written
  // later.
  altText: Schema.optionalKey(Schema.NullOr(Schema.String)),
  byteSize: Schema.Int.check(Schema.isGreaterThan(0)),
  contentType: Schema.String,
}).annotate({ identifier: "NewUpload" });

export type NewUpload = typeof NewUploadSchema.Type;

/** The pending media, and how to send its file. */
export const PreparedUploadSchema = Schema.Struct({
  media: MediaSchema,
  upload: UploadTargetSchema,
}).annotate({ identifier: "PreparedUpload" });

export type PreparedUpload = typeof PreparedUploadSchema.Type;

export const MediaDescriptionSchema = Schema.Struct({
  // Null, or only spaces, removes it.
  altText: Schema.NullOr(Schema.String),
}).annotate({ identifier: "MediaDescription" });

export type MediaDescription = typeof MediaDescriptionSchema.Type;

export const MediaPageSchema = Schema.Struct({
  items: Schema.Array(MediaSchema),
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "MediaPage" });

export type MediaPage = typeof MediaPageSchema.Type;

/** The posts that show a media, by what deleting it would do to them. */
export const MediaUsageSchema = Schema.Struct({
  // Drafts, which lose the media when it is deleted.
  drafts: Schema.Array(Schema.String),
  // Posts scheduled or publishing, which keep it from being deleted.
  scheduled: Schema.Array(Schema.String),
}).annotate({ identifier: "MediaUsage" });

export type MediaUsage = typeof MediaUsageSchema.Type;

/** How many media a page holds, unless `limit` says otherwise. */
export const defaultMediaPageSize = 30;

/** The most media a page holds. */
export const maxMediaPageSize = 100;

const workspace = { workspaceId: Schema.String };

const media = { ...workspace, mediaId: Schema.String };

/**
 * A workspace's images and videos. Files go from the client straight to the
 * media store with the signed requests that creating an upload returns,
 * never through the API; completing the upload then checks the file and
 * probes it.
 */
export class MediaApi extends HttpApiGroup.make("media")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: [Forbidden, MediaStoreUnavailable, HttpApiError.BadRequest],
      params: workspace,
      query: {
        cursor: Schema.optionalKey(Schema.String),
        limit: Schema.optionalKey(
          Schema.Int.check(
            Schema.isBetween({ maximum: maxMediaPageSize, minimum: 1 })
          )
        ),
      },
      success: MediaPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the workspace's media, newest first, ${defaultMediaPageSize} a page unless \`limit\` (at most ${maxMediaPageSize}) says otherwise. Pass the page's \`nextCursor\` as \`cursor\` for the next one. Needs media:read.`,
        summary: "List media",
      })
    ),
    HttpApiEndpoint.post("create", "/", {
      error: [
        Forbidden,
        UnsupportedMediaType,
        MediaTooLarge,
        AltTextTooLong,
        MediaStoreUnavailable,
        PlanLimitReached,
      ],
      params: workspace,
      payload: NewUploadSchema,
      success: PreparedUploadSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Records pending media and signs the upload of its file: one PUT for an image or a video up to 16 MiB, one PUT per part for a larger video. Send the file with them, then complete the upload. The requests only take the declared size and content type. On a server that bills, the declared size must fit the plan's media storage with what the workspace stores (PlanLimitReached `mediaStorage`). Needs media:upload.",
        summary: "Start an upload",
      })
    ),
    HttpApiEndpoint.get("get", "/:mediaId", {
      error: [Forbidden, MediaNotFound, MediaStoreUnavailable],
      params: media,
      success: MediaSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: "Shows one of the workspace's media. Needs media:read.",
        summary: "Get media",
      })
    ),
    HttpApiEndpoint.post("complete", "/:mediaId/complete", {
      error: [
        Forbidden,
        MediaNotFound,
        UploadIncomplete,
        UploadRejected,
        MediaStoreUnavailable,
        PlanLimitReached,
      ],
      params: media,
      success: MediaSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Checks that the file reached the store with the declared size and type, joining its parts first, then probes it: the media is ready, or stays uploaded with why it could not be probed. Calling it again is safe, and probes an uploaded file again. On a server that bills, the room an upload was given is held while its URLs work: completed later, it needs room in the plan's media storage again, and without it the file is deleted (PlanLimitReached `mediaStorage`). Needs media:upload.",
        summary: "Complete an upload",
      })
    ),
    HttpApiEndpoint.patch("describe", "/:mediaId", {
      error: [Forbidden, MediaNotFound, AltTextTooLong, MediaStoreUnavailable],
      params: media,
      payload: MediaDescriptionSchema,
      success: MediaSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Sets the media's description, which platforms show to people who cannot see it. It can be written while the file uploads. Needs media:upload.",
        summary: "Describe media",
      })
    ),
    HttpApiEndpoint.get("usage", "/:mediaId/usage", {
      error: [Forbidden, MediaNotFound],
      params: media,
      success: MediaUsageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the posts that show the media: drafts, which lose it if it is deleted, and posts scheduled or publishing, which keep it from being deleted. Needs media:read.",
        summary: "Get where media is used",
      })
    ),
    HttpApiEndpoint.delete("delete", "/:mediaId", {
      error: [Forbidden, MediaNotFound, MediaInUse, MediaStoreUnavailable],
      params: media,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes the media and its file, and cancels its upload if it is still pending. Drafts that show it lose it. Posts scheduled or publishing that show it refuse the deletion (`MediaInUse`, listing them): take them back to draft first. Needs media:delete.",
        summary: "Delete media",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/media") {}
