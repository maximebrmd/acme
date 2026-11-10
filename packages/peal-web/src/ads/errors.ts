import { Cause, Exit, Option, Schema } from "effect";
import {
  AdAccountBusy,
  AdAccountSpendCapExceeded,
  AdAccountUnusable,
  AdNetworkUnavailable,
  AdSignInFailed,
  BoostInvalid,
  BoostStateConflict,
  CeilingCurrencyMismatch,
  PostNotPromotable,
  SpendCeilingExceeded,
} from "peal-contract";
import type { BoostViolation } from "peal-contract";

// Why an ads action failed, as the Ads.errors catalogue explains it, from
// the API's errors: every refusal the contract names has its own words.

/** A failure the catalogue explains without anything more. */
export const AdsErrorKeySchema = Schema.Literals([
  "accountNotFound",
  "adsUnavailable",
  "boostNotFound",
  "connectionNotFound",
  "forbidden",
  "keyReused",
  "spendingNotEnabled",
  "spendingUnavailable",
  "unknown",
]);

export type AdsErrorKey = typeof AdsErrorKeySchema.Type;

export type AdsError =
  | { readonly key: AdsErrorKey }
  // The account has boosts that run, may run or are being made.
  | { readonly boosts: number; readonly key: "accountBusy" }
  | {
      readonly key: "accountUnusable";
      readonly reason: AdAccountUnusable["reason"];
    }
  | {
      readonly key: "boostInvalid";
      readonly violations: readonly BoostViolation[];
    }
  // Amounts are in the minor units of `currency`.
  | {
      readonly ceiling: number;
      readonly committed: number;
      readonly currency: string;
      readonly key: "ceilingExceeded";
      readonly requested: number;
    }
  | { readonly accountCurrency: string; readonly key: "currencyMismatch" }
  | {
      readonly key: "networkUnavailable";
      readonly retryAfterSeconds: number | null;
    }
  | {
      readonly key: "notPromotable";
      readonly reason: PostNotPromotable["reason"];
    }
  | { readonly key: "signInFailed"; readonly reason: AdSignInFailed["reason"] }
  | {
      readonly currency: string;
      readonly key: "spendCapExceeded";
      readonly requested: number;
      readonly room: number;
    }
  // Where the boost stands, which the action cannot start from.
  | { readonly key: "stateConflict"; readonly state: string };

// The API's errors that need nothing more to be explained, by tag.
const reasons = new Map<string, AdsErrorKey>([
  ["AdAccountNotFound", "accountNotFound"],
  ["AdConnectionNotFound", "connectionNotFound"],
  ["AdSpendingNotEnabled", "spendingNotEnabled"],
  ["AdSpendingUnavailable", "spendingUnavailable"],
  ["AdsUnavailable", "adsUnavailable"],
  ["BoostKeyReused", "keyReused"],
  ["BoostNotFound", "boostNotFound"],
  ["Forbidden", "forbidden"],
]);

const isBusy = Schema.is(AdAccountBusy);
const isUnusable = Schema.is(AdAccountUnusable);
const isInvalid = Schema.is(BoostInvalid);
const isOverCeiling = Schema.is(SpendCeilingExceeded);
const isOverCap = Schema.is(AdAccountSpendCapExceeded);
const isCurrencyMismatch = Schema.is(CeilingCurrencyMismatch);
const isNetworkUnavailable = Schema.is(AdNetworkUnavailable);
const isNotPromotable = Schema.is(PostNotPromotable);
const isSignInFailed = Schema.is(AdSignInFailed);
const isStateConflict = Schema.is(BoostStateConflict);

// The refusals that carry amounts.
const explainRoom = (error: {
  readonly _tag: string;
}): Option.Option<AdsError> => {
  if (isOverCeiling(error)) {
    return Option.some({
      ceiling: error.ceiling,
      committed: error.committed,
      currency: error.currency,
      key: "ceilingExceeded",
      requested: error.requested,
    });
  }

  if (isOverCap(error)) {
    return Option.some({
      currency: error.currency,
      key: "spendCapExceeded",
      requested: error.requested,
      room: error.room,
    });
  }

  return isCurrencyMismatch(error)
    ? Option.some({
        accountCurrency: error.accountCurrency,
        key: "currencyMismatch",
      })
    : Option.none();
};

// The refusals that say why, or where things stand.
const explainReason = (error: {
  readonly _tag: string;
}): Option.Option<AdsError> => {
  if (isBusy(error)) {
    return Option.some({ boosts: error.boosts, key: "accountBusy" });
  }

  if (isUnusable(error)) {
    return Option.some({ key: "accountUnusable", reason: error.reason });
  }

  if (isInvalid(error)) {
    return Option.some({ key: "boostInvalid", violations: error.violations });
  }

  if (isNetworkUnavailable(error)) {
    return Option.some({
      key: "networkUnavailable",
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }

  if (isNotPromotable(error)) {
    return Option.some({ key: "notPromotable", reason: error.reason });
  }

  if (isSignInFailed(error)) {
    return Option.some({ key: "signInFailed", reason: error.reason });
  }

  return isStateConflict(error)
    ? Option.some({ key: "stateConflict", state: error.state })
    : Option.none();
};

/** What the catalogue explains an API error with. */
export const explainAdsError = (error: { readonly _tag: string }): AdsError =>
  explainRoom(error).pipe(
    Option.orElse(() => explainReason(error)),
    Option.getOrElse((): AdsError => ({
      key: reasons.get(error._tag) ?? "unknown",
    }))
  );

/**
 * How an ads call ended, for the catalogue to explain, or none if it
 * worked. Anything but the API's own errors, such as the server being down,
 * is unknown.
 */
export const adsErrorOf = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): Option.Option<AdsError> =>
  Exit.isSuccess(exit)
    ? Option.none()
    : Option.some(
        Cause.findErrorOption(exit.cause).pipe(
          Option.map(explainAdsError),
          Option.getOrElse((): AdsError => ({ key: "unknown" }))
        )
      );
