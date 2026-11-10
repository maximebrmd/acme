import { Duration } from "effect";

/**
 * How long a partner's idempotency key answers the workspace its first
 * request created, as a post's does.
 */
export const creationKeyLifetime = Duration.hours(24);

/** The longest idempotency key Peal takes. */
export const maxCreationKeyLength = 255;
