import type { Option } from "effect";
import { Context, Effect, Layer } from "effect";

import type { Principal } from "#workspace/domain/principal.ts";

/** Where a credential stands against the rate limit, this request counted. */
export interface RequestStanding {
  readonly allowed: boolean;
  readonly limit: number;
  /** The policy's name in the `RateLimit` headers. */
  readonly policy: string;
  readonly remaining: number;
  readonly resetAfterSeconds: number;
  readonly windowSeconds: number;
}

/**
 * The limit on how many requests a key or an application sends, which the
 * activity context counts. A principal that is not counted (a person in
 * their own session) has no standing, and neither has anyone while the
 * count cannot be kept: a limit that cannot be read lets requests through
 * rather than stop the API.
 */
export class RequestLimits extends Context.Service<
  RequestLimits,
  {
    readonly admit: (
      principal: Principal
    ) => Effect.Effect<Option.Option<RequestStanding>>;
  }
>()("peal-server/workspace/application/RequestLimits") {
  /** No limit: for tests of what the limit is not about. */
  static readonly unlimited = Layer.succeed(
    RequestLimits,
    RequestLimits.of({ admit: () => Effect.succeedNone })
  );
}
