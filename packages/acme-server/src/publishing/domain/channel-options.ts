import { Option, Schema } from "effect";

import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

import { TargetOptionsSchema } from "./target-options.ts";
import type { TargetOptions } from "./target-options.ts";

/**
 * The options a post is given on one of its channels, which its target on
 * that channel keeps.
 */
export class ChannelOptions extends Schema.Class<ChannelOptions>(
  "acme-server/publishing/domain/ChannelOptions"
)({
  channelId: ChannelIdSchema,
  options: TargetOptionsSchema,
}) {}

/** Options for some of a post's channels, one at most for each. */
export const ChannelOptionsListSchema = Schema.Array(ChannelOptions).check(
  Schema.makeFilter(
    (list: readonly ChannelOptions[]) =>
      new Set(list.map(({ channelId }) => channelId)).size === list.length,
    { expected: "options for each channel once" }
  )
);

/** The options the post is given on the channel, if any. */
export const optionsOn = (
  options: readonly ChannelOptions[],
  channelId: ChannelId
): Option.Option<TargetOptions> =>
  Option.fromUndefinedOr(
    options.find((chosen) => chosen.channelId === channelId)
  ).pipe(Option.map((chosen) => chosen.options));
