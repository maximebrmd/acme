import { Schema } from "effect";

import recorded from "./api-changelog.json" with { type: "json" };

/**
 * A change that could break a client, which the versioning policy allows
 * only when decided on: what changed, and why, with what clients do.
 */
export const BreakingChangeSchema = Schema.Struct({
  change: Schema.String,
  reason: Schema.String,
}).annotate({ identifier: "BreakingChange" });

/**
 * One release of the API: what it added to the one before, as the check
 * of the API against the last released document found it
 * (`packages/peal-sdk/scripts/compat.ts --release`).
 */
export const ApiChangelogEntrySchema = Schema.Struct({
  // How many additions in all: operations, fields, values and errors.
  additions: Schema.Int,
  // Empty in almost every release: the API only grows.
  breaking: Schema.Array(BreakingChangeSchema),
  // The day of the release (ISO 8601, UTC).
  date: Schema.String,
  // The operations deprecated in it, by operationId (`posts.list`).
  deprecations: Schema.Array(Schema.String),
  // The operations added in it, by operationId.
  operations: Schema.Array(Schema.String),
  title: Schema.String,
}).annotate({ identifier: "ApiChangelogEntry" });

export type ApiChangelogEntry = typeof ApiChangelogEntrySchema.Type;

export const ApiChangelogSchema = Schema.Struct({
  // Newest first.
  entries: Schema.Array(ApiChangelogEntrySchema),
}).annotate({ identifier: "ApiChangelog" });

export type ApiChangelog = typeof ApiChangelogSchema.Type;

/**
 * The API's releases, newest first, as `api-changelog.json` records them:
 * an entry is added by the release script, never by hand.
 */
export const apiChangelog: ApiChangelog = {
  entries: Schema.decodeUnknownSync(Schema.Array(ApiChangelogEntrySchema))(
    recorded
  ).toSorted((one, other) => other.date.localeCompare(one.date)),
};
