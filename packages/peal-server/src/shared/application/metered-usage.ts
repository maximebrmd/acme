import { Context, DateTime, Effect, Layer, Option } from "effect";

import { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import type { AllowanceReason } from "#shared/domain/allowance-reached.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Meter } from "#shared/domain/meter.ts";

import type { DatabaseError } from "./database-error.ts";

/**
 * Units of a meter a workspace was granted, and when: what `giveBack`
 * takes back, from the month (UTC) and the day they counted in. A context
 * that gives units back later (a reply that never went out) rebuilds it
 * from what it kept: the workspace, the meter, the units and the instant
 * it claimed them.
 */
export interface MeterClaim {
  readonly at: DateTime.Utc;
  readonly meter: Meter;
  readonly units: number;
  readonly workspaceId: WorkspaceId;
}

/**
 * A meter of a workspace's billing account this month, as clients are
 * told it: what it includes, what was used, the most it may use (its
 * allowance, and for one with a ceiling what the ceiling pays for), its
 * price past the allowance and its ceiling, in US dollar cents.
 */
export interface MeterState {
  readonly allowance: number;
  /** The units it may use this month at most; none for no end. */
  readonly allowed: Option.Option<number>;
  /** What it spends past the allowance at most a month, in cents. */
  readonly ceiling: Option.Option<number>;
  readonly meter: Meter;
  readonly paymentMethod: boolean;
  /** `cents` for every `per` units past the allowance. */
  readonly price: { readonly cents: number; readonly per: number };
  /** Why a claim past `allowed` is refused. */
  readonly pastAllowed: AllowanceReason;
  /** Whether the owner confirmed the allowance and the price. */
  readonly priceConfirmed: boolean;
  readonly resetsAt: DateTime.Utc;
  readonly used: number;
}

/**
 * The refusal a meter answers now, when it is paused: the billing account
 * used what its month allows it (without a payment method, on a legacy
 * plan, while a payment fails, or at a ceiling); none otherwise. For what
 * spends a meter later (a boost, whose ad a sync counts), so it is
 * refused before anything is reserved.
 */
export const pausedOf = (state: MeterState): Option.Option<AllowanceReached> =>
  Option.isSome(state.allowed) && state.used >= state.allowed.value
    ? Option.some(
        new AllowanceReached({
          allowed: state.allowed.value,
          meter: state.meter,
          reason: state.pastAllowed,
          resetsAt: state.resetsAt,
          used: state.used,
        })
      )
    : Option.none();

/**
 * The meters every context spends through: the units a workspace uses of
 * what Peal pays for by use, counted per billing account and calendar
 * month (UTC), across its workspaces. A claim is granted within the
 * account's allowance, or, for an account that pays, past it (billed, up
 * to its ceiling where the meter has one); otherwise it is refused
 * (`AllowanceReached`) and nothing is counted. Claims sent together are
 * counted one after the other, so none passes what is paid for. In the
 * caller's transaction when it runs in one: the units commit with the
 * fact they count, or not at all. The billing context backs it.
 */
export class MeteredUsage extends Context.Service<
  MeteredUsage,
  {
    /**
     * Claims `units` of the meter, in the month and on the day of `at`
     * (now when not given): a context that gives the units back later
     * from what it kept passes the instant it keeps, so both count in the
     * same month.
     */
    readonly claim: (
      workspaceId: WorkspaceId,
      meter: Meter,
      units: number,
      at?: DateTime.Utc
    ) => Effect.Effect<MeterClaim, AllowanceReached | DatabaseError>;
    /**
     * Takes back units that bought nothing (a generation that failed, a
     * reply that never went out), never below zero; what was reported to
     * be billed is reported back.
     */
    readonly giveBack: (
      claim: MeterClaim
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Takes back units of a request that failed or was interrupted once
     * the provider had it, free up to the meter's allowance a month per
     * billing account (`forgiven`); past that they count, so failures
     * cannot buy an unbounded number of generations.
     */
    readonly forgive: (claim: MeterClaim) => Effect.Effect<void, DatabaseError>;
    /**
     * The meter of the workspace's billing account now; none on a server
     * that does not bill, where nothing is refused.
     */
    readonly state: (
      workspaceId: WorkspaceId,
      meter: Meter
    ) => Effect.Effect<Option.Option<MeterState>, DatabaseError>;
  }
>()("peal-server/shared/application/MeteredUsage") {
  /**
   * Grants every claim and counts nothing: for tests of other things, and
   * what a context runs on when no billing counts for it.
   */
  static readonly layerUnmetered = Layer.succeed(
    MeteredUsage,
    MeteredUsage.of({
      claim: (workspaceId, meter, units, at) =>
        (at === undefined ? DateTime.now : Effect.succeed(at)).pipe(
          Effect.map((claimed): MeterClaim => ({
            at: claimed,
            meter,
            units,
            workspaceId,
          }))
        ),
      forgive: () => Effect.void,
      giveBack: () => Effect.void,
      state: () => Effect.succeedNone,
    })
  );
}
