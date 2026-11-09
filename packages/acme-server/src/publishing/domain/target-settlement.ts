import { Schema } from "effect";

import {
  PublishedSchema,
  UnconfirmedSchema,
} from "#shared/domain/publish-result.ts";

import { FailureReasonSchema } from "./post-target-status.ts";

const RefusedSchema = Schema.TaggedStruct("failed", {
  // The platform's own reason, for support. Never content.
  code: Schema.optionalKey(Schema.String),
  reason: FailureReasonSchema,
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
