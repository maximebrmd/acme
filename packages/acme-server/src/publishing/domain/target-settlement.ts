import { Schema } from "effect";

import {
  PublishedSchema,
  UnconfirmedReasonSchema,
} from "#shared/domain/publish-result.ts";

import { FailureReasonSchema } from "./post-target-status.ts";

const RefusedSchema = Schema.TaggedStruct("failed", {
  // The platform's own reason, for support. Never content.
  code: Schema.optionalKey(Schema.String),
  reason: FailureReasonSchema,
});

// Whether the post went live is not known.
const UnconfirmedSchema = Schema.TaggedStruct("unconfirmed", {
  // When the call that may have published it started. Settlements stored
  // before it existed have none: the target's start stands in for it.
  attemptedAt: Schema.optionalKey(Schema.DateTimeUtc),
  reason: UnconfirmedReasonSchema,
});

// The post was cancelled between two attempts.
const CancelledSchema = Schema.TaggedStruct("cancelled", {});

/**
 * How publishing a post on one channel ended, once no attempt is left to
 * make: published, unconfirmed, failed and why, or cancelled.
 *
 * Workflows store it in their history, so members and fields may be added but
 * never renamed or removed.
 */
export const TargetSettlementSchema = Schema.Union([
  PublishedSchema,
  UnconfirmedSchema,
  RefusedSchema,
  CancelledSchema,
]);

export type TargetSettlement = typeof TargetSettlementSchema.Type;

/** A token refused for good: the channel needs the user to reconnect it. */
export const needsReconnect = (settlement: TargetSettlement): boolean =>
  settlement._tag === "failed" && settlement.reason === "tokenExpired";
