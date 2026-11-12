import { Result, Schema } from "effect";

import { FeedAddressRefused } from "./feed-address-refused.ts";

/** The longest address a feed keeps. */
export const maxFeedUrlLength = 2048;

/**
 * Where a feed is read: an HTTPS address on the default port, without
 * credentials, as `parseFeedAddress` checked it. Whether its host is
 * public is the outbound guard's to say, before every request. It may
 * hold a token of the site's, so it is shown to the workspace only, and
 * logged by its host alone.
 */
export const FeedAddressSchema = Schema.NonEmptyString.pipe(
  Schema.brand("FeedAddress")
);

export type FeedAddress = typeof FeedAddressSchema.Type;

const refused = (reason: FeedAddressRefused["reason"]) =>
  Result.fail(new FeedAddressRefused({ reason }));

/** The address as a feed keeps it, as given but for its fragment. */
export const parseFeedAddress = (
  input: string
): Result.Result<FeedAddress, FeedAddressRefused> => {
  const trimmed = input.trim();

  if (trimmed.length > maxFeedUrlLength || !URL.canParse(trimmed)) {
    return refused("malformed");
  }

  const url = new URL(trimmed);

  if (url.protocol !== "https:" || url.port !== "") {
    return refused("notHttps");
  }

  if (url.username !== "" || url.password !== "") {
    return refused("credentials");
  }

  url.hash = "";

  return Result.succeed(FeedAddressSchema.make(url.href));
};

/** The host a feed is read from: all that logs may say of its address. */
export const feedHostOf = (address: string): string =>
  URL.canParse(address) ? new URL(address).host : "";
