import { Schema } from "effect";

import { BadRequest } from "./bad-request.ts";
import { MediaRejected } from "./media-rejected.ts";
import { PlatformUnavailable } from "./platform-unavailable.ts";
import { RateLimited } from "./rate-limited.ts";
import { TokenExpired } from "./token-expired.ts";

/**
 * Why a platform refused a publishing call. Every member means the platform
 * did not accept the post, so nothing went live; a call whose outcome is not
 * known is an `unconfirmed` result instead (see `./publish-result.ts`).
 *
 * Workflows store these in their history, so members may be added but never
 * renamed or removed.
 */
export const PublishFailureSchema = Schema.Union([
  PlatformUnavailable,
  RateLimited,
  TokenExpired,
  MediaRejected,
  BadRequest,
]);

export type PublishFailure = typeof PublishFailureSchema.Type;
