import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

// The review context's ids: UUIDv7s, from the `Ids` port.

export const ReviewLinkIdSchema = Uuid7Schema.pipe(
  Schema.brand("ReviewLinkId")
);

export type ReviewLinkId = typeof ReviewLinkIdSchema.Type;

export const ReviewCommentIdSchema = Uuid7Schema.pipe(
  Schema.brand("ReviewCommentId")
);

export type ReviewCommentId = typeof ReviewCommentIdSchema.Type;

export const ApprovalRequestIdSchema = Uuid7Schema.pipe(
  Schema.brand("ApprovalRequestId")
);

export type ApprovalRequestId = typeof ApprovalRequestIdSchema.Type;
