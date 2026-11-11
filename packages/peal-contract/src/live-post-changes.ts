import { Schema } from "effect";

/**
 * Why a post cannot be changed on a channel now:
 *
 * - `notPublished`: it is not live there (still sending, failed, waiting
 *   to be checked, cancelled).
 * - `alreadyRemoved`: Peal deleted it from the platform already.
 * - `noPlatformId`: Peal has no id for it, or for one of its parts, as for
 *   a post a member confirmed by hand.
 * - `notSupported`: the platform has no call for it, or Peal lacks the
 *   permission: the platform's capabilities say which (`livePost`).
 * - `changeInProgress`: another change of the post on that channel is
 *   pending.
 * - `channelUnavailable`: the channel is disconnected, turned off, or must
 *   be reconnected.
 * - `boostRunning`: a boost that is not over shows the post: stop it
 *   first.
 */
export const LivePostRefusalSchema = Schema.Literals([
  "notPublished",
  "alreadyRemoved",
  "noPlatformId",
  "notSupported",
  "changeInProgress",
  "channelUnavailable",
  "boostRunning",
]).annotate({ identifier: "LivePostRefusal" });

export type LivePostRefusal = typeof LivePostRefusalSchema.Type;

/**
 * What a change of a live post does: `unpublish` deletes it. More kinds
 * may come (a new value of this enum).
 */
export const LivePostChangeKindSchema = Schema.Literal("unpublish").annotate({
  identifier: "LivePostChangeKind",
});

export type LivePostChangeKind = typeof LivePostChangeKindSchema.Type;

/** Where a change of a live post stands. */
export const LivePostChangeStatusSchema = Schema.Literals([
  "pending",
  "done",
  "failed",
]).annotate({ identifier: "LivePostChangeStatus" });

export type LivePostChangeStatus = typeof LivePostChangeStatusSchema.Type;

/**
 * A change asked of a post that is live on one channel: `unpublish`
 * deletes it from the platform, every part of it, the last part of a
 * thread first. `pending` while Peal deletes the parts left (`partsLeft`),
 * `done` once none is, `failed` when Peal gave up: `code` says why
 * (`unavailable`, `rateLimited`, `channelUnavailable`, or the platform's
 * own code), and asking again deletes the parts left.
 */
export const LivePostChangeSchema = Schema.Struct({
  // Whether the platform had a part no longer, as when it was deleted
  // there before; left out until one was found so.
  alreadyGone: Schema.optionalKey(Schema.Boolean),
  // Why it failed, once it has.
  code: Schema.NullOr(Schema.String),
  finishedAt: Schema.NullOr(Schema.DateTimeUtc),
  id: Schema.String,
  kind: LivePostChangeKindSchema,
  // How many parts are still to delete: 0 once done.
  partsLeft: Schema.Int,
  postId: Schema.String,
  requestedAt: Schema.DateTimeUtc,
  status: LivePostChangeStatusSchema,
  targetId: Schema.String,
}).annotate({ identifier: "LivePostChange" });

export type LivePostChange = typeof LivePostChangeSchema.Type;

/** A channel of the post that could not be unpublished, and why. */
export const LivePostRefusedTargetSchema = Schema.Struct({
  reason: LivePostRefusalSchema,
  targetId: Schema.String,
}).annotate({ identifier: "LivePostRefusedTarget" });

export type LivePostRefusedTarget = typeof LivePostRefusedTargetSchema.Type;

/**
 * What asking to unpublish a whole post made: a change on each channel
 * where it can be, and why not on the others.
 */
export const PostUnpublishSchema = Schema.Struct({
  changes: Schema.Array(LivePostChangeSchema),
  refused: Schema.Array(LivePostRefusedTargetSchema),
}).annotate({ identifier: "PostUnpublish" });

export type PostUnpublish = typeof PostUnpublishSchema.Type;

/** A post's changes once live, newest first. */
export const LivePostChangesSchema = Schema.Struct({
  items: Schema.Array(LivePostChangeSchema),
}).annotate({ identifier: "LivePostChanges" });

export type LivePostChanges = typeof LivePostChangesSchema.Type;
