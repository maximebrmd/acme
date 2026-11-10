import { Schema } from "effect";

import { DuplicatePost } from "./duplicate-post.ts";
import { Forbidden } from "./forbidden.ts";
import { IdempotencyKeyReused } from "./idempotency-key-reused.ts";
import { InvalidTimeZone } from "./invalid-time-zone.ts";
import { PlanLimitReached } from "./plan-limit-reached.ts";
import { PostContentInvalid } from "./post-content-invalid.ts";
import { PostNotFound } from "./post-not-found.ts";
import { ScheduleInPast } from "./schedule-in-past.ts";
import { UnknownChannels } from "./unknown-channels.ts";
import { UnknownMedia } from "./unknown-media.ts";

/** The most posts one bulk request makes. */
export const maxBulkPosts = 50;

/** The most rows one CSV import takes, its first line apart. */
export const maxImportRows = 100;

/** The longest CSV file an import takes, in characters. */
export const maxImportLength = 1_000_000;

/**
 * Why one post of several was not made: what `send` would have answered
 * for it alone, with the same fields. `Forbidden` is a post that needs a
 * permission the others do not, as media:read for one that shows media.
 */
export const PostRefusalSchema = Schema.Union([
  PostContentInvalid,
  UnknownChannels,
  UnknownMedia,
  ScheduleInPast,
  InvalidTimeZone,
  PlanLimitReached,
  IdempotencyKeyReused,
  PostNotFound,
  DuplicatePost,
  Forbidden,
]).annotate({ identifier: "PostRefusal" });

export type PostRefusal = typeof PostRefusalSchema.Type;

/** The columns a CSV import reads. */
export const importColumns = [
  "text",
  "channels",
  "media",
  "at",
  "time_zone",
  "allow_duplicate",
  "idempotency_key",
] as const;

/** A column of a CSV import. */
export const ImportColumnSchema = Schema.Literals(importColumns).annotate({
  identifier: "ImportColumn",
});

export type ImportColumn = typeof ImportColumnSchema.Type;

/**
 * A cell of a CSV row that cannot be read: it is `missing` and its row
 * needs it, or what it holds is `invalid` for its column.
 */
export const ImportCellProblemSchema = Schema.Struct({
  column: ImportColumnSchema,
  problem: Schema.Literals(["missing", "invalid"]),
}).annotate({ identifier: "ImportCellProblem" });

export type ImportCellProblem = typeof ImportCellProblemSchema.Type;
