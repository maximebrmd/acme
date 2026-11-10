import { Duration } from "effect";

/**
 * How long Peal remembers an idempotency key: a request sent again with the
 * key within this time answers the post the first one made, and makes no
 * other. After it, the key is free, and the same request makes a new post.
 * Long enough for any client's retries, short enough that a key reused by
 * mistake the next day is not refused.
 */
export const idempotencyKeyLifetime = Duration.hours(24);

/** The longest idempotency key Peal takes. */
export const maxIdempotencyKeyLength = 255;
