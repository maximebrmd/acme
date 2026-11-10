import { Option, Schema } from "effect";
import { ChannelUpdateSchema } from "peal-contract";
import type { ChannelUpdate } from "peal-contract";

const decode = Schema.decodeUnknownOption(ChannelUpdateSchema);

/**
 * What renaming a channel sends, from what the member typed: the name
 * without the spaces around it, or null, which takes the name back, for
 * nothing but spaces. None when the contract refuses the name (too long).
 */
export const labelUpdateOf = (typed: string): Option.Option<ChannelUpdate> => {
  const label = typed.trim();

  return label === "" ? Option.some({ label: null }) : decode({ label });
};
