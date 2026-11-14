import { Cause, Exit, Option, Schema } from "effect";
import { FollowUpNotPossible, TooManyFollowUpRules } from "peal-contract";
import type { FollowUpRefusal, Platform } from "peal-contract";

// Why a change to a follow-up rule failed, as the FollowUps.errors
// catalogue explains it, from the API's errors.

export type FollowUpError =
  | {
      readonly key: "ended" | "forbidden" | "notFound" | "taken" | "unknown";
    }
  | {
      readonly key: "notPossible";
      readonly reason: FollowUpRefusal;
      /** The channels that would repost once connected again. */
      readonly reconnect: readonly {
        readonly channelId: string;
        readonly platform: Platform;
      }[];
    }
  | { readonly allowed: number; readonly key: "tooMany" };

const isNotPossible = Schema.is(FollowUpNotPossible);
const isTooMany = Schema.is(TooManyFollowUpRules);

const keys = new Map<string, "ended" | "forbidden" | "notFound" | "taken">([
  ["Forbidden", "forbidden"],
  ["FollowUpRuleEnded", "ended"],
  ["FollowUpRuleNotFound", "notFound"],
  ["FollowUpRuleTaken", "taken"],
  ["PostNotFound", "notFound"],
]);

const explain = (error: { readonly _tag: string }): FollowUpError => {
  if (isNotPossible(error)) {
    return {
      key: "notPossible",
      reason: error.reason,
      reconnect: error.channels
        .filter(({ repost }) => repost === "reconnect")
        .map(({ channelId, platform }) => ({ channelId, platform })),
    };
  }

  if (isTooMany(error)) {
    return { allowed: error.allowed, key: "tooMany" };
  }

  return { key: keys.get(error._tag) ?? "unknown" };
};

/** How a call ended, for the catalogue to explain, or none if it worked. */
export const followUpErrorOf = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): Option.Option<FollowUpError> =>
  Exit.isSuccess(exit)
    ? Option.none()
    : Option.some(
        Cause.findErrorOption(exit.cause).pipe(
          Option.map(explain),
          Option.getOrElse((): FollowUpError => ({ key: "unknown" }))
        )
      );
