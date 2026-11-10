import type { Option } from "effect";

import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { platforms } from "#shared/domain/platform.ts";

import type { AccountStanding } from "./account-restriction.ts";
import { isDescribed } from "./field-description.ts";
import type { FieldDescription } from "./field-description.ts";
import { lookupsOn } from "./lookup.ts";
import type { LookupDescription, LookupName } from "./lookup.ts";
import { maxAltTextLength } from "./media-attachment.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { platformRules } from "./platform-rules.ts";
import type { PlatformRules, TextLimit } from "./platform-rules.ts";
import { maxMediaPerPost } from "./post-content.ts";
import { maxPostTextLength } from "./post-text.ts";
import { describeOptionsOn, optionConstraintsOn } from "./target-options.ts";

/**
 * The version of the description clients read. It goes up when a field
 * changes meaning or leaves; new fields, platforms, lookups and
 * restrictions are added under the same version.
 */
export const capabilitiesVersion = 1;

/**
 * What a post on a platform may hold, as far as Peal checks it before it
 * goes out: the platform's rules (`platformRules`, where a limit left out
 * is one Peal does not know), its options field by field, the rules
 * between them, the lookups that answer their values, and whether Peal
 * reads each post's counts there.
 */
export interface PlatformCapabilities {
  /** Peal reads the counts of each post published there. */
  readonly countsPosts: boolean;
  readonly lookups: readonly OptionLookup[];
  /**
   * The longest alt text of one image or video: the platform's, or Peal's
   * own where the platform's is longer or not known.
   */
  readonly maxAltTextLength: number;
  /**
   * The most images and videos together: the platform's, or Peal's own
   * where the platform takes more or its count is not known.
   */
  readonly maxMedia: number;
  readonly optionConstraints: readonly OptionConstraint[];
  readonly options: readonly FieldDescription<LookupName>[];
  readonly platform: Platform;
  readonly rules: PlatformRules;
  /** Every limit on the text: the platform's, then Peal's own. */
  readonly textLimits: readonly TextLimit[];
  readonly version: typeof capabilitiesVersion;
}

/** A lookup, with the options whose values it answers. */
export interface OptionLookup extends LookupDescription {
  /** The names of the platform's options that refer to it. */
  readonly fills: readonly string[];
}

/** What Peal itself takes of any post's text, as its schema checks it. */
export const ownTextLimit: TextLimit = {
  maximum: maxPostTextLength,
  unit: "utf16Units",
};

const describedOptionsOn = (platform: Platform) =>
  describeOptionsOn(platform).filter(isDescribed);

/**
 * The platform's lookups, each with the options it fills; with
 * `connection`, those a channel that came that way has.
 */
export const optionLookupsOn = (
  platform: Platform,
  connection?: Option.Option<ChannelConnection>
): readonly OptionLookup[] =>
  lookupsOn(platform, connection).map((lookup) => ({
    ...lookup,
    fills: describedOptionsOn(platform).flatMap((field) =>
      field.lookup === lookup.name ? [field.name] : []
    ),
  }));

/** What a post on one channel may hold: its platform's, and its account's. */
export interface ChannelCapabilities {
  readonly account: AccountStanding;
  readonly capabilities: PlatformCapabilities;
}

/**
 * The platform's capabilities. `countsPosts` comes from the analytics
 * context, which knows where it reads counts. A platform's own are those of
 * any of its channels: on LinkedIn, the counts and the lookup only company
 * pages have are there. With `connection`, they are a channel's that came
 * that way, with the lookups it has, and `countsPosts` is the caller's
 * answer for that channel.
 */
export const capabilitiesOf = (
  platform: Platform,
  countsPosts: boolean,
  connection?: Option.Option<ChannelConnection>
): PlatformCapabilities => {
  const rules = platformRules[platform];

  return {
    countsPosts,
    lookups: optionLookupsOn(platform, connection),
    maxAltTextLength: Math.min(
      rules.media?.maxAltTextLength ?? maxAltTextLength,
      maxAltTextLength
    ),
    maxMedia: Math.min(rules.maxMedia ?? maxMediaPerPost, maxMediaPerPost),
    optionConstraints: optionConstraintsOn(platform),
    options: describedOptionsOn(platform),
    platform,
    rules,
    textLimits: [...rules.textLimits, ownTextLimit],
    version: capabilitiesVersion,
  };
};

/** Every platform's capabilities, in the platforms' order. */
export const everyCapabilities = (
  counted: (platform: Platform) => boolean
): readonly PlatformCapabilities[] =>
  platforms.map((platform) => capabilitiesOf(platform, counted(platform)));
