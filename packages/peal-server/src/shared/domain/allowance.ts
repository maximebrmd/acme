import { Option, Result } from "effect";

import { PlanLimitReached } from "./plan-limit-reached.ts";
import type { PlanLimit } from "./plan-limit.ts";

/**
 * How many of something a workspace may have: none for no limit, as on a
 * server that does not bill.
 */
export type Allowance = Option.Option<number>;

/**
 * Whether `adding` more fit, with `used` already taken: PlanLimitReached
 * once they would pass the allowance. A workspace over its allowance, as
 * after moving to a smaller plan, keeps what it has and adds nothing.
 */
export const roomFor = (
  limit: PlanLimit,
  allowance: Allowance,
  used: number,
  adding: number
): Result.Result<void, PlanLimitReached> =>
  Option.match(allowance, {
    onNone: () => Result.succeed(undefined),
    onSome: (allowed) =>
      used + adding <= allowed
        ? Result.succeed(undefined)
        : Result.fail(
            new PlanLimitReached({
              allowed,
              limit,
              needed: used + adding,
              used,
            })
          ),
  });

/** Whether one more fits, with `used` already taken (`roomFor`). */
export const roomForOneMore = (
  limit: PlanLimit,
  allowance: Allowance,
  used: number
): Result.Result<void, PlanLimitReached> => roomFor(limit, allowance, used, 1);

/**
 * Whether a workspace holds no more than its allowance: PlanLimitReached
 * when `held` passes it, as after a trial or a move to a smaller plan,
 * until enough are removed.
 */
export const withinAllowance = (
  limit: PlanLimit,
  allowance: Allowance,
  held: number
): Result.Result<void, PlanLimitReached> => roomFor(limit, allowance, held, 0);
