import { Context } from "effect";
import type { Effect } from "effect";

import type { LookupQuery, LookupResult } from "#publishing/domain/lookup.ts";
import type { BadRequest } from "#shared/domain/bad-request.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { RateLimited } from "#shared/domain/rate-limited.ts";
import type { TokenExpired } from "#shared/domain/token-expired.ts";

import type { LookupInputRejected } from "./lookup-input-rejected.ts";

/**
 * Why a lookup got no answer: the channel is disconnected or turned off
 * (`BadRequest` with a code of `#publishing/domain/own-refusals.ts`), must
 * be reconnected (`TokenExpired`), the platform did not answer
 * (`PlatformUnavailable`) or asked to slow down (`RateLimited`), or it
 * refused what the input asked (`LookupInputRejected`). Nothing changed
 * either way: a lookup only reads.
 */
export type LookupFailure =
  | BadRequest
  | LookupInputRejected
  | PlatformUnavailable
  | RateLimited
  | TokenExpired;

/**
 * The platforms' answers to lookups, read each time with the channel's
 * token. One adapter per lookup, registered by name: a platform added
 * later adds its adapters and nothing here.
 */
export class PlatformLookups extends Context.Service<
  PlatformLookups,
  {
    /** Runs the query on the channel, whose platform has that lookup. */
    readonly run: (
      channelId: ChannelId,
      query: LookupQuery
    ) => Effect.Effect<LookupResult, LookupFailure>;
  }
>()("peal-server/publishing/application/PlatformLookups") {}
