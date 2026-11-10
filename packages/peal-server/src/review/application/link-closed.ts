import { Schema } from "effect";

/**
 * Why a link no longer shows its post: the link `expired` or was `revoked`,
 * or the post was `published` (or is going out), `cancelled` or `deleted`.
 */
export const LinkClosureSchema = Schema.Literals([
  "expired",
  "revoked",
  "published",
  "cancelled",
  "deleted",
]);

export type LinkClosure = typeof LinkClosureSchema.Type;

/** The link no longer works, and why. */
export class LinkClosed extends Schema.TaggedError<LinkClosed>()("LinkClosed", {
  reason: LinkClosureSchema,
}) {}
