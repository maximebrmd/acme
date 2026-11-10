import { Schema } from "effect";

/**
 * Why a review link no longer shows its post: the link `expired` or was
 * `revoked`, or the post was `published` (or is going out), `cancelled` or
 * `deleted`.
 */
export const ReviewLinkClosureSchema = Schema.Literals([
  "expired",
  "revoked",
  "published",
  "cancelled",
  "deleted",
]).annotate({ identifier: "ReviewLinkClosure" });

export type ReviewLinkClosure = typeof ReviewLinkClosureSchema.Type;

/** The review link no longer works, and why. */
export class ReviewLinkClosed extends Schema.TaggedError<ReviewLinkClosed>()(
  "ReviewLinkClosed",
  { reason: ReviewLinkClosureSchema },
  {
    description:
      "The review link no longer shows its post. `reason` says why: the link expired or was revoked, or the post was published, cancelled or deleted.",
    httpApiStatus: 410,
  }
) {}
