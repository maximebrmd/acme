import { Cause, Exit, Option, Schema } from "effect";
import { WithdrawalUnavailable } from "peal-contract";

import type { BillingError } from "#components/billing/billing-view.tsx";

const isWithdrawalRefused = Schema.is(WithdrawalUnavailable);

const reasons: ReadonlyMap<string, BillingError> = new Map([
  ["Forbidden", "forbidden"],
  ["NothingToCancel", "nothingToCancel"],
  ["TrialUnavailable", "trialUsed"],
]);

/**
 * Why a billing request failed, for the page to say; none when it worked.
 * A withdrawal refused says why, an unknown failure is generic.
 */
export const billingErrorOf = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): Option.Option<BillingError> => {
  if (Exit.isSuccess(exit)) {
    return Option.none();
  }

  return Option.some(
    Cause.findErrorOption(exit.cause).pipe(
      Option.flatMap((failure): Option.Option<BillingError> => {
        if (isWithdrawalRefused(failure)) {
          return Option.some(
            failure.reason === "business"
              ? "withdrawalBusiness"
              : "withdrawalExpired"
          );
        }

        return Option.fromUndefinedOr(reasons.get(failure._tag));
      }),
      Option.getOrElse((): BillingError => "generic")
    )
  );
};
