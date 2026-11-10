import { Cause, Exit, Option, Schema } from "effect";
import { WithdrawalUnavailable } from "peal-contract";

import type { FunctionError } from "./form.ts";

const isWithdrawalRefused = Schema.is(WithdrawalUnavailable);

const byTag: ReadonlyMap<string, FunctionError> = new Map([
  ["BillingNotEnabled", "notEnabled"],
  ["BillingUnavailable", "unavailable"],
  ["CaptchaRefused", "captcha"],
  ["Forbidden", "forbidden"],
  ["NothingToCancel", "nothingToCancel"],
  ["TooManyContractRequests", "tooMany"],
]);

const withdrawalRefusals = {
  business: "withdrawalBusiness",
  expired: "withdrawalExpired",
  notSubscribed: "withdrawalNotSubscribed",
} as const;

/** Why a request failed, for the function to say; none when it worked. */
export const functionErrorOf = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): Option.Option<FunctionError> => {
  if (Exit.isSuccess(exit)) {
    return Option.none();
  }

  return Option.some(
    Cause.findErrorOption(exit.cause).pipe(
      Option.flatMap((failure): Option.Option<FunctionError> =>
        isWithdrawalRefused(failure)
          ? Option.some(withdrawalRefusals[failure.reason])
          : Option.fromUndefinedOr(byTag.get(failure._tag))
      ),
      Option.getOrElse((): FunctionError => "generic")
    )
  );
};
