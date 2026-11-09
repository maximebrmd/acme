import { TargetConfirmationSchema } from "acme-contract";
import { Option, Schema } from "effect";

const decodeConfirmation = Schema.decodeUnknownOption(TargetConfirmationSchema);

/**
 * Whether the API takes `address` as the address of a post a member found
 * on its platform: an http or https URL, as the contract checks it.
 */
export const isWebAddress = (address: string): boolean =>
  Option.isSome(decodeConfirmation({ _tag: "published", permalink: address }));
