import { Context } from "effect";
import type { Effect } from "effect";

import type { TikTokPosting } from "#publishing/domain/tiktok-creator.ts";
import type { BadRequest } from "#shared/domain/bad-request.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { RateLimited } from "#shared/domain/rate-limited.ts";
import type { TokenExpired } from "#shared/domain/token-expired.ts";

/**
 * Why a creator's settings could not be read: the channel is disconnected
 * or turned off (`BadRequest` with a code of
 * `#publishing/domain/own-refusals.ts`), must be reconnected
 * (`TokenExpired`), or TikTok did not answer or asked to slow down.
 */
export type CreatorFailure =
  | BadRequest
  | PlatformUnavailable
  | RateLimited
  | TokenExpired;

/**
 * The posting settings of TikTok channels' creators, read from TikTok each
 * time with the channel's token: the composer shows them, scheduling checks
 * a post against them, as TikTok's guidelines ask.
 */
export class TikTokCreators extends Context.Service<
  TikTokCreators,
  {
    readonly read: (
      channelId: ChannelId
    ) => Effect.Effect<TikTokPosting, CreatorFailure>;
    /**
     * Whether this server can post photos to TikTok, which TikTok takes
     * only from an address verified for the app.
     */
    readonly takesPhotos: boolean;
  }
>()("peal-server/publishing/application/TikTokCreators") {}
