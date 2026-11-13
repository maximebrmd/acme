import { Cause, Exit, Option, Schema } from "effect";

/** Why a staff action failed, as the Staff.errors catalogue explains it. */
export const StaffErrorKeySchema = Schema.Literals([
  "accountGone",
  "banned",
  "mergePartner",
  "mergeSame",
  "mergeStandalone",
  "mergeSubscribed",
  "expired",
  "gone",
  "linkGone",
  "notStaff",
  "self",
  "staff",
  "twoStepOff",
  "unknown",
  "verified",
  "workspaceGone",
]);

export type StaffErrorKey = typeof StaffErrorKeySchema.Type;

const RefusedSchema = Schema.Struct({
  _tag: Schema.Literal("StaffActionRefused"),
  reason: Schema.Literals([
    "banned",
    "expired",
    "self",
    "staff",
    "twoStepOff",
    "verified",
  ]),
});

const decodeRefused = Schema.decodeUnknownOption(RefusedSchema);

const NotMergedSchema = Schema.Struct({
  _tag: Schema.Literal("AccountsNotMerged"),
  reason: Schema.Literals(["partner", "same", "standalone", "subscribed"]),
});

const decodeNotMerged = Schema.decodeUnknownOption(NotMergedSchema);

const mergeKeys = {
  partner: "mergePartner",
  same: "mergeSame",
  standalone: "mergeStandalone",
  subscribed: "mergeSubscribed",
} as const;

// The API's other answers, by tag.
const reasons = new Map<string, StaffErrorKey>([
  ["BillingAccountNotFound", "accountGone"],
  ["NotFound", "notStaff"],
  ["ShortLinkNotFound", "linkGone"],
  ["UserNotFound", "gone"],
  ["WorkspaceNotFound", "workspaceGone"],
]);

/**
 * The catalogue key that explains how a staff action ended, or none if it
 * worked. Anything but the API's own errors, such as the server being down,
 * is unknown.
 */
export const staffErrorKey = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): Option.Option<StaffErrorKey> =>
  Exit.isSuccess(exit)
    ? Option.none()
    : Option.some(
        Cause.findErrorOption(exit.cause).pipe(
          Option.flatMap((failure) =>
            decodeRefused(failure).pipe(
              Option.map(({ reason }): StaffErrorKey => reason),
              Option.orElse(() =>
                decodeNotMerged(failure).pipe(
                  Option.map(({ reason }): StaffErrorKey => mergeKeys[reason])
                )
              ),
              Option.orElse(() =>
                Option.fromUndefinedOr(reasons.get(failure._tag))
              )
            )
          ),
          Option.getOrElse((): StaffErrorKey => "unknown")
        )
      );
