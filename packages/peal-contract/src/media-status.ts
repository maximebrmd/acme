import { Schema } from "effect";

/** Why a stored file was refused. */
export const RejectionReasonSchema = Schema.Literals([
  // Its size is not the declared size.
  "sizeMismatch",
  // It is not of the declared type.
  "typeMismatch",
]).annotate({ identifier: "RejectionReason" });

export type RejectionReason = typeof RejectionReasonSchema.Type;

/**
 * Why an uploaded file is not ready yet:
 *
 * - `pending`: it has not been probed yet.
 * - `unavailable`: the server has no probe for its kind: a video, on a
 *   server without ffprobe. It stays uploaded until a server with the probe
 *   completes it again.
 * - `unreadable`: the file is damaged, or in another format.
 * - `timedOut`: reading it took too long.
 * - `tooLarge`: the store served more bytes than declared.
 * - `toolFailed`: the probing program failed.
 * - `tooManyPages`: a document of more than 300 pages, which no platform
 *   shows.
 *
 * Completing the upload again probes the file again.
 */
export const ProbeStateSchema = Schema.Literals([
  "pending",
  "unavailable",
  "unreadable",
  "timedOut",
  "tooLarge",
  "toolFailed",
  "tooManyPages",
]).annotate({ identifier: "ProbeState" });

export type ProbeState = typeof ProbeStateSchema.Type;

/**
 * Where a piece of media is in its life:
 *
 * - `pending`: waiting for the client to upload the file.
 * - `uploaded`: stored with the declared size and type, not probed yet
 *   (`probe` says why).
 * - `ready`: probed, and usable in posts.
 * - `rejected`: the stored file was not the declared one, and was deleted.
 */
export const MediaStatusSchema = Schema.Union([
  Schema.TaggedStruct("pending", {}),
  Schema.TaggedStruct("uploaded", { probe: ProbeStateSchema }),
  Schema.TaggedStruct("ready", {}),
  Schema.TaggedStruct("rejected", { reason: RejectionReasonSchema }),
]).annotate({ identifier: "MediaStatus" });

export type MediaStatus = typeof MediaStatusSchema.Type;
