import { Option, Schema } from "effect";

import type { PostTarget } from "#publishing/domain/post-target.ts";
import { TargetOptionsSchema } from "#publishing/domain/target-options.ts";

const encodeOptions = Schema.encodeSync(TargetOptionsSchema);

/**
 * The options a post has on a channel, as plain values the contract
 * describes, for the contexts that show a post without publishing's
 * domain: none on a channel whose platform takes none.
 */
export const plainOptions = ({ options }: PostTarget) =>
  options.pipe(Option.map((chosen) => encodeOptions(chosen)));
