import { Effect, Schema } from "effect";
import { Flag } from "effect/cli";
import { TargetOptionsSchema } from "peal-contract";
import type { ChannelOptions } from "peal-contract";

import { Refused } from "#refused.ts";

/**
 * The channels a post is for: `--channel <id>`, repeated, or several ids
 * in one, separated by commas (`--channels a,b`).
 */
export const channelsFlag = (description: string) =>
  Flag.String("channel").pipe(
    Flag.withAlias("channels"),
    Flag.withMetavar("<channel-id>"),
    Flag.withDescription(description),
    Flag.atLeast(0)
  );

/** The ids the flag was given, each once, in the order given. */
export const channelIdsOf = (given: readonly string[]): string[] => [
  ...new Set(
    given.flatMap((value) =>
      value.split(",").flatMap((part) => {
        const id = part.trim();

        return id === "" ? [] : [id];
      })
    )
  ),
];

export const optionsFlag = (description: string) =>
  Flag.String("options").pipe(
    Flag.withMetavar("<channel-id>=<json>"),
    Flag.withDescription(description),
    Flag.atLeast(0)
  );

const decodeOptions = Schema.decodeUnknownEffect(
  Schema.fromJsonString(TargetOptionsSchema)
);

/** `--options <channel-id>=<json>`: a channel's platform options, as JSON. */
export const optionsOf = (given: string) =>
  Effect.gen(function* parse() {
    const at = given.indexOf("=");

    if (at <= 0) {
      return yield* new Refused({
        reason: `--options takes <channel-id>=<json>, not ${given}.`,
      });
    }

    const channelId = given.slice(0, at);

    const options = yield* decodeOptions(given.slice(at + 1)).pipe(
      Effect.mapError(
        (failure) =>
          new Refused({
            reason: `The options for channel ${channelId} are not a platform's options: ${failure.message}`,
          })
      )
    );

    const chosen: ChannelOptions = { channelId, options };

    return chosen;
  });
