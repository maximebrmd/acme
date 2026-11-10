import { Effect, Schema } from "effect";
import { Flag } from "effect/cli";
import { TargetOptionsSchema } from "peal-contract";
import type { ChannelOptions, PostPart } from "peal-contract";
import { maxFollowUps, maxPartDelaySeconds } from "peal-contract/post-text";

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

/** `--then <text>`, repeated: the parts of the post after its first. */
export const thenFlag = (description: string) =>
  Flag.String("then").pipe(
    Flag.withMetavar("<text>"),
    Flag.withDescription(description),
    Flag.atLeast(0)
  );

/** `--then-delay <seconds>`: the wait before each part after the first. */
export const thenDelayFlag = Flag.Int("then-delay").pipe(
  Flag.withMetavar("<seconds>"),
  Flag.withDescription(
    `How long each --then part waits after the part before it went out, in seconds: 0, the default, sends them one after the other; ${String(maxPartDelaySeconds)} (a day) at most.`
  ),
  Flag.withDefault(0)
);

/**
 * The parts `--then` and `--then-delay` make, in the order given: text
 * alone, as the command line attaches media to the first part only.
 */
export const followUpsOf = (texts: readonly string[], delaySeconds: number) =>
  Effect.gen(function* parts() {
    if (
      !Number.isInteger(delaySeconds) ||
      delaySeconds < 0 ||
      delaySeconds > maxPartDelaySeconds
    ) {
      return yield* new Refused({
        reason: `--then-delay takes whole seconds from 0 to ${String(maxPartDelaySeconds)}, not ${String(delaySeconds)}.`,
      });
    }

    // A wait with no part to wait before would be dropped without a word.
    if (texts.length === 0 && delaySeconds !== 0) {
      return yield* new Refused({
        reason:
          "--then-delay sets the wait before each --then part, and there is none: give the parts with --then, or leave --then-delay out.",
      });
    }

    if (texts.length > maxFollowUps) {
      return yield* new Refused({
        reason: `A post has ${String(maxFollowUps)} parts after its first at most: there are ${String(texts.length)} --then.`,
      });
    }

    return texts.map((text): PostPart => ({
      delaySeconds,
      media: [],
      overrides: [],
      text,
    }));
  });
