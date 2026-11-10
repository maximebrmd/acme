import { Context, Schema } from "effect";
import type { Effect } from "effect";

import { AccountSpendCapExceeded } from "#ads/application/account-spend-cap-exceeded.ts";
import { AdAccountUnusable } from "#ads/application/ad-account-unusable.ts";
import { AdNetworkUnavailable } from "#ads/application/ad-network-unavailable.ts";
import { BoostNotFound } from "#ads/application/boost-not-found.ts";
import { BoostStateConflict } from "#ads/application/boost-state-conflict.ts";
import { SpendCeilingExceeded } from "#ads/application/spend-ceiling-exceeded.ts";
import { SpendingNotEnabled } from "#ads/application/spending-not-enabled.ts";
import { SpendingUnavailable } from "#ads/application/spending-unavailable.ts";
import { AdAccountIdSchema, BoostIdSchema } from "#ads/domain/ids.ts";
import { ActorSubjectSchema } from "#shared/domain/access.ts";

/**
 * How an attempt to place a boost ended: `settled` when the boost runs,
 * failed or is unconfirmed, or was stopped meanwhile; `retry` when the
 * network refused for now, or could not say what it holds, and nothing
 * can be decided yet.
 */
export const PlaceResultSchema = Schema.Literals(["settled", "retry"]);

export type PlaceResult = typeof PlaceResultSchema.Type;

/** What a member asks of a boost that exists. */
export const BoostActionSchema = Schema.Literals(["pause", "resume", "stop"]);

export type BoostAction = typeof BoostActionSchema.Type;

/** A change a member asks of a boost, with who asks. */
export const ControlRequestSchema = Schema.Struct({
  accountId: AdAccountIdSchema,
  action: BoostActionSchema,
  boostId: BoostIdSchema,
  by: ActorSubjectSchema,
});

export type ControlRequest = typeof ControlRequestSchema.Type;

/** Why a change to a boost was not made. */
export const ControlFailureSchema = Schema.Union([
  AccountSpendCapExceeded,
  AdAccountUnusable,
  AdNetworkUnavailable,
  BoostNotFound,
  BoostStateConflict,
  SpendCeilingExceeded,
  SpendingNotEnabled,
  SpendingUnavailable,
]);

export type ControlFailure = typeof ControlFailureSchema.Type;

/**
 * Sends a boost's requests to its network, one at a time per ad account:
 * the server's adapter goes through the account's gate, so two boosts of
 * an account, a pause and a sync never call it together.
 */
export class BoostGateway extends Context.Service<
  BoostGateway,
  {
    /** Makes, or goes on making, a boost that was requested. */
    readonly place: (request: {
      readonly accountId: typeof AdAccountIdSchema.Type;
      readonly boostId: typeof BoostIdSchema.Type;
    }) => Effect.Effect<PlaceResult>;
    /**
     * Fails a boost its job gave up placing, in turn with the account's
     * other calls: never while a placement of it may be turning it on.
     */
    readonly giveUp: (request: {
      readonly accountId: typeof AdAccountIdSchema.Type;
      readonly boostId: typeof BoostIdSchema.Type;
    }) => Effect.Effect<void>;
    /** Pauses, resumes or stops a boost. */
    readonly control: (
      request: ControlRequest
    ) => Effect.Effect<void, ControlFailure>;
  }
>()("peal-server/ads/application/BoostGateway") {}
