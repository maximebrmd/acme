import { Cause, Exit, Option, Schema } from "effect";

/** Why a staff action failed, as the Staff.errors catalogue explains it. */
export const StaffErrorKeySchema = Schema.Literals([
  "banned",
  "expired",
  "gone",
  "notStaff",
  "self",
  "staff",
  "unknown",
  "verified",
]);

export type StaffErrorKey = typeof StaffErrorKeySchema.Type;

const RefusedSchema = Schema.Struct({
  _tag: Schema.Literal("StaffActionRefused"),
  reason: Schema.Literals(["banned", "expired", "self", "staff", "verified"]),
});

const decodeRefused = Schema.decodeUnknownOption(RefusedSchema);

// The API's other answers, by tag.
const reasons = new Map<string, StaffErrorKey>([
  ["NotFound", "notStaff"],
  ["UserNotFound", "gone"],
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
                Option.fromUndefinedOr(reasons.get(failure._tag))
              )
            )
          ),
          Option.getOrElse((): StaffErrorKey => "unknown")
        )
      );
