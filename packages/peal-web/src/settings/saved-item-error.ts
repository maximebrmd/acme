import { Cause, Exit, Option, Schema } from "effect";
import {
  TooManyChannelSets,
  TooManyQueues,
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
  "invalidTimeZone",
  "nameTaken",
  "notFound",
  "setNotFound",
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
  ["InvalidTimeZone", "invalidTimeZone"],
  ["PostNotFound", "notFound"],
  ["QueueNameTaken", "nameTaken"],
  ["QueueNotFound", "notFound"],
  ["SignatureNameTaken", "nameTaken"],
  ["SignatureNotFound", "notFound"],
  ["TagNameTaken", "nameTaken"],
  ["TagNotFound", "notFound"],
  ["UnknownChannels", "unknownChannels"],
  ["UnknownTags", "notFound"],
]);

const isTooMany = Schema.is(
  Schema.Union([
    TooManyTags,
    TooManySignatures,
    TooManyChannelSets,
    TooManyQueues,
  ])
);

// A channel set is not found as a queue names it: the queue is there.
const explain =
  (inQueue: boolean) =>
  (error: { readonly _tag: string }): SavedItemError => {
    if (isTooMany(error)) {
      return { allowed: error.allowed, key: "tooMany" };
    }

    if (inQueue && error._tag === "ChannelSetNotFound") {
      return { key: "setNotFound" };
    }

    return { key: reasons.get(error._tag) ?? "unknown" };
  };

/**
 * How a call ended, for the catalogue to explain, or none if it worked.
 * Anything but the API's own errors, such as the server being down, is
 * unknown.
 */
export const savedItemErrorOf = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>,
  // Whether the change was to a queue, which names a channel set.
  inQueue = false
): Option.Option<SavedItemError> =>
  Exit.isSuccess(exit)
    ? Option.none()
    : Option.some(
        Cause.findErrorOption(exit.cause).pipe(
          Option.map(explain(inQueue)),
          Option.getOrElse((): SavedItemError => ({ key: "unknown" }))
        )
      );
