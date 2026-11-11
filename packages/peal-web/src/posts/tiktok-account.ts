import { Option } from "effect";
import type { TikTokAccount, TikTokCreator } from "peal-contract";

import type { OptionsText, OptionValues } from "./target-options.ts";

// What TikTok's content sharing guidelines ask of the composer, from the
// creator's settings TikTok gives (`GET …/channels/:id/tiktok-creator`):
// the audiences the account offers, with none chosen for the creator; the
// interactions they turned off, unticked and greyed out; no Duets or
// Stitches on photo posts; "Only me" closed to branded content; the label
// a disclosure puts on the post; and the consent line before Schedule.

/** How one of TikTok's fields shows on a channel. */
export interface FieldLimits {
  /** The choices it offers, all when none is given. */
  readonly choices?: ReadonlySet<string>;
  /** Choices shown but not offered, with why. */
  readonly closedChoices?: ReadonlyMap<string, OptionsText>;
  /** Shown unticked and greyed out, with why. */
  readonly locked?: OptionsText;
  readonly hidden?: true;
  /** A line under the field, about what the account allows. */
  readonly note?: OptionsText;
}

/** How TikTok's fields show on one channel, and what goes under them. */
export interface CreatorLimits {
  /** By field name; a field missing shows as described. */
  readonly fields: ReadonlyMap<string, FieldLimits>;
  /** The label TikTok puts on the post, once disclosed as commercial. */
  readonly label: Option.Option<OptionsText>;
  /** What the creator agrees to by posting. */
  readonly consent: OptionsText;
}

const interactions = [
  ["disableComment", "commentDisabled"],
  ["disableDuet", "duetDisabled"],
  ["disableStitch", "stitchDisabled"],
] as const satisfies readonly (readonly [string, keyof TikTokCreator])[];

const branded = (values: OptionValues) =>
  values["commercialContent"] === true && values["brandContent"] === true;

const promoted = (values: OptionValues) =>
  values["commercialContent"] === true && values["brandOrganic"] === true;

/** The creator, when TikTok says they can post. */
export const creatorOf = (
  account: Option.Option<TikTokAccount>
): Option.Option<TikTokCreator> =>
  account.pipe(
    Option.flatMap(({ posting }) =>
      posting._tag === "ready" ? Option.some(posting.creator) : Option.none()
    )
  );

/**
 * How TikTok's fields show on a channel whose creator `account` describes
 * (none while it loads, or when TikTok could not say), with what the post
 * holds now, `photos` when it shows photos only.
 */
export const creatorLimits = (
  account: Option.Option<TikTokAccount>,
  values: OptionValues,
  photos: boolean
): CreatorLimits => {
  const creator = creatorOf(account);
  const fields = new Map<string, FieldLimits>();

  // The audiences the account offers; "Only me" closed to branded content.
  const choices = creator.pipe(
    Option.map(
      ({ privacyLevels }): ReadonlySet<string> => new Set(privacyLevels)
    )
  );

  const closedChoices: ReadonlyMap<string, OptionsText> = branded(values)
    ? new Map([["SELF_ONLY", "tiktok.brandedNotPrivate"]])
    : new Map();

  fields.set(
    "privacyLevel",
    Option.match(choices, {
      onNone: () => ({ closedChoices }),
      onSome: (offered) => ({ choices: offered, closedChoices }),
    })
  );

  for (const [field, setting] of interactions) {
    const hidden = photos && field !== "disableComment";

    if (hidden) {
      fields.set(field, { hidden: true });
    } else if (Option.exists(creator, (found) => found[setting])) {
      fields.set(field, { locked: "tiktok.turnedOff" });
    }
  }

  let label = Option.none<OptionsText>();

  if (branded(values)) {
    label = Option.some("tiktok.labelPaidPartnership");
  } else if (promoted(values)) {
    label = Option.some("tiktok.labelPromotional");
  }

  return {
    consent: branded(values) ? "tiktok.consentBranded" : "tiktok.consentMusic",
    fields,
    label,
  };
};

/**
 * The values with what the creator's settings forbid taken back: an
 * interaction they turned off goes off again, and an audience the account
 * does not offer is unchosen. The same values when nothing changes.
 */
export const fittedToCreator = (
  account: Option.Option<TikTokAccount>,
  values: OptionValues
): OptionValues => {
  const creator = creatorOf(account);

  if (Option.isNone(creator)) {
    return values;
  }

  const { privacyLevels } = creator.value;
  const level = values["privacyLevel"];

  const turnedOff = interactions.flatMap(([field, setting]) =>
    creator.value[setting] && values[field] !== true ? [field] : []
  );

  const unoffered =
    level !== undefined && !privacyLevels.some((offered) => offered === level);

  if (turnedOff.length === 0 && !unoffered) {
    return values;
  }

  return Object.fromEntries([
    ...Object.entries(values).filter(
      ([field]) => !(unoffered && field === "privacyLevel")
    ),
    ...turnedOff.map((field) => [field, true] as const),
  ]);
};
