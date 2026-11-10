import { Cause, Exit, Option, Schema } from "effect";
import {
  TooManyChannelSets,
  TooManySignatures,
  TooManyTags,
} from "peal-contract";

// Why a change to something a workspace keeps for its posts (a tag, a
// signature, a channel set) failed, as the SavedItems.errors catalogue
// explains it, from the API's errors.

/** A failure the catalogue explains without anything more. */
export const SavedItemErrorKeySchema = Schema.Literals([
  "forbidden",
  "invalid",
  "nameTaken",
  "notFound",
  "unknown",
  "unknownChannels",
]);

export type SavedItemErrorKey = typeof SavedItemErrorKeySchema.Type;

export type SavedItemError =
  | { readonly key: SavedItemErrorKey }
  // The workspace keeps as many as it may: `allowed`.
  | { readonly allowed: number; readonly key: "tooMany" };

// The API's errors that need nothing more to be explained, by tag.
const reasons = new Map<string, SavedItemErrorKey>([
  ["ChannelSetNameTaken", "nameTaken"],
  ["ChannelSetNotFound", "notFound"],
  ["Forbidden", "forbidden"],
  ["PostContentInvalid", "invalid"],
  ["PostNotFound", "notFound"],
  ["SignatureNameTaken", "nameTaken"],
  ["SignatureNotFound", "notFound"],
  ["TagNameTaken", "nameTaken"],
  ["TagNotFound", "notFound"],
  ["UnknownChannels", "unknownChannels"],
  ["UnknownTags", "notFound"],
]);

const isTooMany = Schema.is(
  Schema.Union([TooManyTags, TooManySignatures, TooManyChannelSets])
);

const explain = (error: { readonly _tag: string }): SavedItemError =>
  isTooMany(error)
    ? { allowed: error.allowed, key: "tooMany" }
    : { key: reasons.get(error._tag) ?? "unknown" };

/**
 * How a call ended, for the catalogue to explain, or none if it worked.
 * Anything but the API's own errors, such as the server being down, is
 * unknown.
 */
export const savedItemErrorOf = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): Option.Option<SavedItemError> =>
  Exit.isSuccess(exit)
    ? Option.none()
    : Option.some(
        Cause.findErrorOption(exit.cause).pipe(
          Option.map(explain),
          Option.getOrElse((): SavedItemError => ({ key: "unknown" }))
        )
      );
