import { Cause, Exit, Option, Schema } from "effect";
import {
  PostNotRecyclable,
  RecyclingVariantsInvalid,
  TooManyRecyclingRules,
} from "peal-contract";
import type { NotRecyclableReason } from "peal-contract";

// Why a change to a recycling rule failed, as the Recycling.errors
// catalogue explains it, from the API's errors.

export type RuleError =
  | {
      readonly key:
        | "endsTooSoon"
        | "ended"
        | "forbidden"
        | "notFound"
        | "unknown";
    }
  | { readonly key: "notRecyclable"; readonly reason: NotRecyclableReason }
  | { readonly allowed: number; readonly key: "tooMany" }
  | { readonly count: number; readonly key: "variantsInvalid" };

const isNotRecyclable = Schema.is(PostNotRecyclable);
const isTooMany = Schema.is(TooManyRecyclingRules);
const isVariantsInvalid = Schema.is(RecyclingVariantsInvalid);

const keys = new Map<
  string,
  "endsTooSoon" | "ended" | "forbidden" | "notFound"
>([
  ["Forbidden", "forbidden"],
  ["PostNotFound", "notFound"],
  ["QueueNotFound", "notFound"],
  ["RecyclingEndsTooSoon", "endsTooSoon"],
  ["RecyclingRuleEnded", "ended"],
  ["RecyclingRuleNotFound", "notFound"],
]);

const explain = (error: { readonly _tag: string }): RuleError => {
  if (isNotRecyclable(error)) {
    return { key: "notRecyclable", reason: error.reason };
  }

  if (isTooMany(error)) {
    return { allowed: error.allowed, key: "tooMany" };
  }

  if (isVariantsInvalid(error)) {
    return { count: error.variants.length, key: "variantsInvalid" };
  }

  return { key: keys.get(error._tag) ?? "unknown" };
};

/** How a call ended, for the catalogue to explain, or none if it worked. */
export const ruleErrorOf = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): Option.Option<RuleError> =>
  Exit.isSuccess(exit)
    ? Option.none()
    : Option.some(
        Cause.findErrorOption(exit.cause).pipe(
          Option.map(explain),
          Option.getOrElse((): RuleError => ({ key: "unknown" }))
        )
      );
