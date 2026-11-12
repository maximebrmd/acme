import { Schema } from "effect";

/**
 * Why a read of a feed gave nothing: no answer in time (`timeout`), the
 * host asked to wait (`rateLimited`) or failed (`serverError`), the
 * address is not found (`notFound`) or gone for good (`gone`), what it
 * gave is not a feed (`notAFeed`) or is larger than Peal reads
 * (`tooLarge`), the outbound guard refused its host (`refused`), or
 * nothing else could be read of it (`unreachable`). A code, kept on the
 * feed and shown: never what the host said. Stored: add a member, never
 * rename or remove one.
 */
export const FeedReadFailureSchema = Schema.Literals([
  "timeout",
  "rateLimited",
  "serverError",
  "notFound",
  "gone",
  "notAFeed",
  "tooLarge",
  "refused",
  "unreachable",
]);

export type FeedReadFailure = typeof FeedReadFailureSchema.Type;
