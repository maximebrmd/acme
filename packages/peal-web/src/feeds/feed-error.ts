import { Cause, Exit, Option, Schema } from "effect";
import {
  FeedAddressRefused,
  FeedReadsLimited,
  FeedTemplateInvalid,
  FeedUnreadable,
  TooManyFeeds,
} from "peal-contract";

// Why a change to a feed failed, as the Feeds.errors catalogue explains
// it, from the API's errors.

export type FeedError =
  | {
      readonly key:
        | "forbidden"
        | "noChannelSet"
        | "noQueue"
        | "notFound"
        | "unknown"
        | "unknownChannels";
    }
  | { readonly key: "address"; readonly reason: FeedAddressRefused["reason"] }
  | { readonly key: "unreadable"; readonly reason: FeedUnreadable["reason"] }
  | {
      readonly key: "template";
      readonly placeholder: string;
      readonly reason: FeedTemplateInvalid["reason"];
    }
  | { readonly key: "readsLimited"; readonly minutes: number }
  | { readonly allowed: number; readonly key: "tooMany" };

const isAddress = Schema.is(FeedAddressRefused);
const isUnreadable = Schema.is(FeedUnreadable);
const isTemplate = Schema.is(FeedTemplateInvalid);
const isLimited = Schema.is(FeedReadsLimited);
const isTooMany = Schema.is(TooManyFeeds);

const keys = new Map<
  string,
  "forbidden" | "noChannelSet" | "noQueue" | "notFound" | "unknownChannels"
>([
  ["ChannelSetNotFound", "noChannelSet"],
  ["FeedNotFound", "notFound"],
  ["Forbidden", "forbidden"],
  ["QueueNotFound", "noQueue"],
  ["UnknownChannels", "unknownChannels"],
]);

const explain = (error: { readonly _tag: string }): FeedError => {
  if (isAddress(error)) {
    return { key: "address", reason: error.reason };
  }

  if (isUnreadable(error)) {
    return { key: "unreadable", reason: error.reason };
  }

  if (isTemplate(error)) {
    return {
      key: "template",
      placeholder: error.placeholder ?? "",
      reason: error.reason,
    };
  }

  if (isLimited(error)) {
    return {
      key: "readsLimited",
      minutes: Math.max(1, Math.ceil(error.retryAfterSeconds / 60)),
    };
  }

  if (isTooMany(error)) {
    return { allowed: error.allowed, key: "tooMany" };
  }

  return { key: keys.get(error._tag) ?? "unknown" };
};

/** How a call ended, for the catalogue to explain, or none if it worked. */
export const feedErrorOf = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): Option.Option<FeedError> =>
  Exit.isSuccess(exit)
    ? Option.none()
    : Option.some(
        Cause.findErrorOption(exit.cause).pipe(
          Option.map(explain),
          Option.getOrElse((): FeedError => ({ key: "unknown" }))
        )
      );
