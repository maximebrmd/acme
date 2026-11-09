import { Option, Schema } from "effect";

import { platforms } from "#shared/domain/platform.ts";
import type { Platform } from "#shared/domain/platform.ts";

import type { OptionProblem } from "./option-problem.ts";
import { TikTokOptions } from "./tiktok-options.ts";
import { YouTubeOptions } from "./youtube-options.ts";

/**
 * What a post's target says that only its channel's platform knows, such as
 * a YouTube video's title or who sees a TikTok post, tagged by `platform`.
 * They are stored with the target and handed to the platform's adapter.
 *
 * A platform's options are one class, in a file of its own beside this one:
 * fields that are all optional, so a draft can hold them unfinished, the
 * `platform` tag, and a `problems` method that says what the platform would
 * refuse in them once the post is scheduled. Adding a platform's options is
 * adding its class to this union. A platform outside it takes no options.
 */
export const TargetOptionsSchema = Schema.Union([
  YouTubeOptions,
  TikTokOptions,
]);

export type TargetOptions = typeof TargetOptionsSchema.Type;

/** The platforms that take options. */
export type OptionsPlatform = TargetOptions["platform"];

const decodeOptions = Schema.decodeUnknownOption(TargetOptionsSchema);

/**
 * The platform's options with nothing chosen, which is what a target
 * without options has. None for a platform that takes no options.
 */
export const noOptionsOn = (platform: Platform): Option.Option<TargetOptions> =>
  decodeOptions({ platform });

/** Whether the platform takes options. */
export const takesOptions = (platform: Platform): boolean =>
  Option.isSome(noOptionsOn(platform));

/** The platforms that take options. */
export const optionsPlatforms: readonly Platform[] =
  platforms.filter(takesOptions);

/**
 * What the channel's platform would refuse in a target's options, or in
 * none at all. Options of another platform are for the caller to refuse.
 */
export const optionProblemsOn = (
  platform: Platform,
  options: Option.Option<TargetOptions>
): readonly OptionProblem[] =>
  Option.orElse(options, () => noOptionsOn(platform)).pipe(
    Option.filter((chosen) => chosen.platform === platform),
    Option.match({
      onNone: () => [],
      onSome: (chosen) => chosen.problems(),
    })
  );
