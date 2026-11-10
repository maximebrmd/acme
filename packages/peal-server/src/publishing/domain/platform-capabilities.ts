import type { Platform } from "#shared/domain/platform.ts";
import { platforms } from "#shared/domain/platform.ts";

import type { AccountStanding } from "./account-restriction.ts";
import { isDescribed } from "./field-description.ts";
import type { FieldDescription } from "./field-description.ts";
import { lookupsOn } from "./lookup.ts";
import type { LookupDescription, LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { platformRules } from "./platform-rules.ts";
import type { PlatformRules } from "./platform-rules.ts";
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
  readonly lookups: readonly LookupDescription[];
  readonly optionConstraints: readonly OptionConstraint[];
  readonly options: readonly FieldDescription<LookupName>[];
  readonly platform: Platform;
  readonly rules: PlatformRules;
  readonly version: typeof capabilitiesVersion;
}

/** What a post on one channel may hold: its platform's, and its account's. */
export interface ChannelCapabilities {
  readonly account: AccountStanding;
  readonly capabilities: PlatformCapabilities;
}

/**
 * The platform's capabilities. `countsPosts` comes from the analytics
 * context, which knows where it reads counts.
 */
export const capabilitiesOf = (
  platform: Platform,
  countsPosts: boolean
): PlatformCapabilities => ({
  countsPosts,
  lookups: lookupsOn(platform),
  optionConstraints: optionConstraintsOn(platform),
  options: describeOptionsOn(platform).filter(isDescribed),
  platform,
  rules: platformRules[platform],
  version: capabilitiesVersion,
});

/** Every platform's capabilities, in the platforms' order. */
export const everyCapabilities = (
  counted: (platform: Platform) => boolean
): readonly PlatformCapabilities[] =>
  platforms.map((platform) => capabilitiesOf(platform, counted(platform)));
