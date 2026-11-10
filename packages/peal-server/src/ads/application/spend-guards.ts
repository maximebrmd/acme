import { DateTime, Effect, Option } from "effect";

import { capRoom } from "#ads/domain/ad-account-facts.ts";
import type { AdAccount } from "#ads/domain/ad-account.ts";
import { committedIn, monthsTouched } from "#ads/domain/commitment.ts";
import type { BoostId } from "#ads/domain/ids.ts";
import type { SpendAuthorization } from "#ads/domain/spend-authorization.ts";

import { AccountSpendCapExceeded } from "./account-spend-cap-exceeded.ts";
import { AdAccountUnusable } from "./ad-account-unusable.ts";
import { BoostStore } from "./ports/boost-store.ts";
import { SpendCeilingExceeded } from "./spend-ceiling-exceeded.ts";
import { SpendingNotEnabled } from "./spending-not-enabled.ts";

/** A run to count against an account's ceiling and cap. */
export interface RunToCount {
  readonly committed: number;
  readonly endsAt: DateTime.Utc;
  /** The boost it is, when it is already stored: it is not counted twice. */
  readonly id: Option.Option<BoostId>;
  readonly startsAt: DateTime.Utc;
}

/** What room an account has for a run, when it has room. */
export interface SpendRoom {
  /** What the account's own cap leaves after its boosts; none without a cap. */
  readonly capRoom: Option.Option<number>;
  readonly ceiling: number;
  /** What its other boosts commit in the fullest month the run touches. */
  readonly committed: number;
}

/**
 * The account, if its network lets it run ads and its sign-in works: only
 * an active account takes a boost.
 */
export const ensureUsable = (
  account: AdAccount
): Effect.Effect<AdAccount, AdAccountUnusable> => {
  if (account.access !== "working") {
    return Effect.fail(new AdAccountUnusable({ reason: "reconnectNeeded" }));
  }

  return account.status === "active"
    ? Effect.succeed(account)
    : Effect.fail(new AdAccountUnusable({ reason: "status" }));
};

/**
 * Checks a run against what the owner allowed and what the account's own
 * cap leaves, counting what the account's other boosts already commit:
 *
 * - spending must be on;
 * - in every calendar month of the account's zone the run touches, what
 *   the boosts made through Peal commit, this one included, stays within
 *   the monthly ceiling;
 * - when the account has a spend cap at its network, what the cap leaves,
 *   less what the boosts still running commit, covers the run whole.
 *
 * It reads, and reserves nothing: call it inside `AccountStore.spendingOn`
 * with the write it guards, so two runs are counted one after the other.
 */
export const ensureRoom = Effect.fn("Ads.ensureRoom")(function* ensureRoom(
  account: AdAccount,
  authorization: SpendAuthorization,
  run: RunToCount
) {
  const boosts = yield* BoostStore;

  if (authorization._tag === "off") {
    return yield* new SpendingNotEnabled();
  }

  // Every run that can touch a month this one touches: runs last 90 days
  // at most, and are told apart by month below.
  const others = yield* boosts.committedOn(
    account.id,
    {
      from: DateTime.subtract(run.startsAt, { days: 124 }),
      to: DateTime.add(run.endsAt, { days: 124 }),
    },
    run.id
  );

  const committed = committedIn(
    monthsTouched(run.startsAt, run.endsAt, account.timeZone),
    others,
    account.timeZone
  );

  if (committed + run.committed > authorization.monthlyCeiling) {
    return yield* new SpendCeilingExceeded({
      ceiling: authorization.monthlyCeiling,
      committed,
      currency: account.currency,
      requested: run.committed,
    });
  }

  const cap = capRoom(account);

  const left = Option.isSome(cap)
    ? Option.some(
        Math.max(
          0,
          cap.value - (yield* boosts.outstandingOn(account.id, run.id))
        )
      )
    : Option.none<number>();

  if (Option.exists(left, (room) => room < run.committed)) {
    return yield* new AccountSpendCapExceeded({
      currency: account.currency,
      requested: run.committed,
      room: Option.getOrElse(left, () => 0),
    });
  }

  const room: SpendRoom = {
    capRoom: left,
    ceiling: authorization.monthlyCeiling,
    committed,
  };

  return room;
});
