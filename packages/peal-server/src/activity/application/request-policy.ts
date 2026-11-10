import { Context } from "effect";

import type { RateLimitPolicy } from "#activity/domain/rate-limit.ts";

/** The rate limit the server applies, from its settings. */
export class RequestPolicy extends Context.Service<
  RequestPolicy,
  RateLimitPolicy
>()("peal-server/activity/application/RequestPolicy") {}
