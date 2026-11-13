import { Cause, Exit, Option, Schema } from "effect";
import { TransferRefused, WithdrawalUnavailable } from "peal-contract";

import type { AccountError } from "#components/billing/billing-account-view.tsx";
import type { BillingError } from "#components/billing/billing-view.tsx";

const isWithdrawalRefused = Schema.is(WithdrawalUnavailable);

const isTransferRefused = Schema.is(TransferRefused);

const reasons: ReadonlyMap<string, BillingError> = new Map([
  ["AlreadySubscribed", "alreadySubscribed"],
  ["ConsentChanged", "consentChanged"],
  ["Forbidden", "forbidden"],
  ["NothingToCancel", "nothingToCancel"],
  ["PlanTooSmall", "planTooSmall"],
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

const accountReasons: ReadonlyMap<string, AccountError> = new Map([
  ["Forbidden", "forbidden"],
  ["PlanLimitReached", "planLimit"],
  ["TransferNotFound", "notFound"],
]);

/**
 * Why a request about the workspace's billing account failed; none when it
 * worked. A transfer refused for a subscription says so; any other is
 * generic.
 */
export const accountErrorOf = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): Option.Option<AccountError> => {
  if (Exit.isSuccess(exit)) {
    return Option.none();
  }

  return Option.some(
    Cause.findErrorOption(exit.cause).pipe(
      Option.flatMap((failure): Option.Option<AccountError> => {
        if (isTransferRefused(failure)) {
          return Option.some(
            failure.reason === "subscribed" ? "subscribed" : "generic"
          );
        }

        return Option.fromUndefinedOr(accountReasons.get(failure._tag));
      }),
      Option.getOrElse((): AccountError => "generic")
    )
  );
};
