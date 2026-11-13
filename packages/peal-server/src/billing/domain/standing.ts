import { Option, Schema } from "effect";

import type { PaidPlan } from "#shared/domain/plan.ts";

import { allowancesOf } from "./plans.ts";
import type { Allowances } from "./plans.ts";

/**
 * The limits a workspace holds things against: the channels connected, the
 * members, and the bytes of media stored. The others count what happens in
 * a period, and start again from zero.
 */
export const HeldLimitSchema = Schema.Literals([
  "channels",
  "members",
  "mediaStorage",
]);

export type HeldLimit = typeof HeldLimitSchema.Type;

/** What a workspace holds of each held limit. */
export type Holdings = { readonly [L in HeldLimit]: number };

/** A workspace holds `used` of something its plan allows `allowed` of. */
export const ExcessSchema = Schema.Struct({
  allowed: Schema.Int,
  limit: HeldLimitSchema,
  used: Schema.Int,
});

export type Excess = typeof ExcessSchema.Type;

/**
 * What a workspace holds beyond what `allowances` give, as after its trial
 * ended or its subscription was cancelled: nothing is deleted when a plan
 * shrinks, so it can hold more than its plan allows.
 */
export const excessesOf = (
  allowances: Allowances,
  held: Holdings
): readonly Excess[] =>
  HeldLimitSchema.literals.flatMap((limit) =>
    Option.match(allowances[limit], {
      onNone: () => [],
      onSome: (allowed) =>
        held[limit] > allowed ? [{ allowed, limit, used: held[limit] }] : [],
    })
  );

/**
 * Whether the workspace must come back within its plan before it does
 * anything else: it holds more channels or members than its plan allows,
 * which someone chooses among, or a larger plan holds. Until then it
 * schedules and publishes nothing. Media over the plan only refuses
 * uploads: the library stays open to delete from.
 */
export const mustReduce = (excesses: readonly Excess[]): boolean =>
  excesses.some(({ limit }) => limit !== "mediaStorage");

/**
 * The plan that holds everything the workspace has, to offer a workspace
 * over its plan: `payAsYouGo`, the only one sold, unless its media is
 * beyond even what per-account pricing stores for its accounts.
 */
export const planHolding = (held: Holdings): Option.Option<PaidPlan> =>
  excessesOf(
    allowancesOf("payAsYouGo", { accounts: held.channels, freeTier: true }),
    held
  ).length === 0
    ? Option.some("payAsYouGo")
    : Option.none();
