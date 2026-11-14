import type { Option } from "effect";
import { Context, Effect, Layer } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Principal } from "#workspace/domain/principal.ts";

/** Where a credential stands against the rate limit, this request counted. */
export interface RequestStanding {
  readonly allowed: boolean;
  readonly limit: number;
  /**
   * The policy's name in the `RateLimit` headers: `default` (the
   * server's setting), `free` (a billing account without a payment
   * method) or `override` (what staff set for the workspace).
   */
  readonly policy: "default" | "free" | "override";
  readonly remaining: number;
  readonly resetAfterSeconds: number;
  readonly windowSeconds: number;
  /** The limit a payment method would give, on the free tier's policy. */
  readonly withPaymentMethod: Option.Option<number>;
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
    /**
     * `actingIn` is the workspace the request acts in, when it names one:
     * the limit staff set for it applies to a token bound to none.
     */
    readonly admit: (
      principal: Principal,
      actingIn: Option.Option<WorkspaceId>
    ) => Effect.Effect<Option.Option<RequestStanding>>;
  }
>()("peal-server/workspace/application/RequestLimits") {
  /** No limit: for tests of what the limit is not about. */
  static readonly unlimited = Layer.succeed(
    RequestLimits,
    RequestLimits.of({ admit: () => Effect.succeedNone })
  );
}
