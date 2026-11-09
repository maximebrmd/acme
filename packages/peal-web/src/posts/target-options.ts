import { maxYouTubeTitleLength, TargetOptionsSchema } from "acme-contract";
import type {
  ChannelOptions,
  ContentViolation,
  OptionsPlatform,
  Platform,
  Post,
  TargetOptions,
} from "acme-contract";
import { Match, Option, Schema } from "effect";
import type { useTranslations } from "next-intl";

// The options a post has on a channel whose platform takes some, as the
// composer shows them: a field description per platform, the values the
// member edits, and the options the API takes from them.

/** A message of the `Posts.Options` namespace. */
export type OptionsText = Parameters<
  ReturnType<typeof useTranslations<"Posts.Options">>
>[0];

interface Described {
  /** The option's name, as the API and its violations write it. */
  readonly name: string;
  readonly label: OptionsText;
  readonly hint?: OptionsText;
  /** Why the platform refuses the option's value (`optionInvalid`). */
  readonly invalid?: OptionsText;
}

/** One line of text; `maxLength` characters (code points) at most. */
export interface TextField extends Described {
  readonly kind: "text";
  readonly maxLength?: number;
  readonly required?: true;
}

/** Tags, typed separated by commas. */
export interface TagsField extends Described {
  readonly kind: "tags";
}

/** One of `choices`, with nothing chosen at first. */
export interface ChoiceField extends Described {
  readonly kind: "choice";
  readonly choices: readonly {
    readonly label: OptionsText;
    readonly value: string;
  }[];
  readonly required?: true;
}

/** Yes or no, with neither chosen at first. */
export interface YesNoField extends Described {
  readonly kind: "yesNo";
  readonly no: OptionsText;
  readonly required?: true;
  readonly yes: OptionsText;
}

/**
 * A box to tick, holding `initial` on a new target. `inverted` ticks it when
 * the option is false, as "Allow comments" shows `disableComment`. Under
 * `within`, it shows only while that toggle is ticked, and is cleared when
 * it is not.
 */
export interface ToggleField extends Described {
  readonly kind: "toggle";
  readonly initial: boolean;
  readonly inverted?: true;
  readonly within?: string;
}

export type OptionField =
  | ChoiceField
  | TagsField
  | TextField
  | ToggleField
  | YesNoField;

/**
 * The fields of each platform that takes options, in the order the composer
 * shows them. A platform's options added to the contract need an entry here.
 */
export const optionFields = {
  tiktok: [
    {
      choices: [
        { label: "tiktok.privacyPublic", value: "PUBLIC_TO_EVERYONE" },
        { label: "tiktok.privacyFriends", value: "MUTUAL_FOLLOW_FRIENDS" },
        { label: "tiktok.privacyFollowers", value: "FOLLOWER_OF_CREATOR" },
        { label: "tiktok.privacySelf", value: "SELF_ONLY" },
      ],
      kind: "choice",
      label: "tiktok.privacyLevel",
      name: "privacyLevel",
      required: true,
    },
    // TikTok asks that interactions stay off until the creator allows them.
    {
      initial: true,
      inverted: true,
      kind: "toggle",
      label: "tiktok.allowComment",
      name: "disableComment",
    },
    {
      initial: true,
      inverted: true,
      kind: "toggle",
      label: "tiktok.allowDuet",
      name: "disableDuet",
    },
    {
      initial: true,
      inverted: true,
      kind: "toggle",
      label: "tiktok.allowStitch",
      name: "disableStitch",
    },
    {
      hint: "tiktok.commercialContentHint",
      initial: false,
      invalid: "tiktok.commercialContentInvalid",
      kind: "toggle",
      label: "tiktok.commercialContent",
      name: "commercialContent",
    },
    {
      hint: "tiktok.brandOrganicHint",
      initial: false,
      kind: "toggle",
      label: "tiktok.brandOrganic",
      name: "brandOrganic",
      within: "commercialContent",
    },
    {
      hint: "tiktok.brandContentHint",
      initial: false,
      invalid: "tiktok.brandContentInvalid",
      kind: "toggle",
      label: "tiktok.brandContent",
      name: "brandContent",
      within: "commercialContent",
    },
    {
      initial: false,
      kind: "toggle",
      label: "tiktok.aiGenerated",
      name: "aiGenerated",
    },
  ],
  youtube: [
    {
      hint: "youtube.titleHint",
      invalid: "youtube.titleInvalid",
      kind: "text",
      label: "youtube.title",
      maxLength: maxYouTubeTitleLength,
      name: "title",
      required: true,
    },
    {
      hint: "youtube.madeForKidsHint",
      kind: "yesNo",
      label: "youtube.madeForKids",
      name: "madeForKids",
      no: "youtube.madeForKidsNo",
      required: true,
      yes: "youtube.madeForKidsYes",
    },
    {
      choices: [
        { label: "youtube.privacyPublic", value: "public" },
        { label: "youtube.privacyUnlisted", value: "unlisted" },
        { label: "youtube.privacyPrivate", value: "private" },
      ],
      hint: "youtube.privacyHint",
      kind: "choice",
      label: "youtube.privacy",
      name: "privacy",
    },
    {
      hint: "youtube.tagsHint",
      invalid: "youtube.tagsInvalid",
      kind: "tags",
      label: "youtube.tags",
      name: "tags",
    },
    {
      hint: "youtube.categoryIdHint",
      invalid: "youtube.categoryIdInvalid",
      kind: "text",
      label: "youtube.categoryId",
      name: "categoryId",
    },
    {
      initial: true,
      kind: "toggle",
      label: "youtube.notifySubscribers",
      name: "notifySubscribers",
    },
    {
      initial: false,
      kind: "toggle",
      label: "youtube.containsSyntheticMedia",
      name: "containsSyntheticMedia",
    },
  ],
} satisfies { readonly [P in OptionsPlatform]: readonly OptionField[] };

const fieldsByPlatform: ReadonlyMap<string, readonly OptionField[]> = new Map(
  Object.entries(optionFields)
);

const none: readonly OptionField[] = [];

/** The platform's fields, none if it takes no options. */
export const fieldsOf = (platform: Platform): readonly OptionField[] =>
  fieldsByPlatform.get(platform) ?? none;

/** The platform's field named `name`, if it has one. */
export const fieldOf = (
  platform: Platform,
  name: string
): Option.Option<OptionField> =>
  Option.fromUndefinedOr(
    fieldsOf(platform).find((field) => field.name === name)
  );

/**
 * What the member has filled in on one channel: text and tags as typed
 * (tags separated by commas), choices by their value, yes or no and boxes
 * as booleans. A field missing is not filled in.
 */
export type OptionValues = Readonly<Record<string, boolean | string>>;

// One field's value, as an entry of the values.
const entry = (
  name: string,
  value: boolean | string
): readonly [string, boolean | string] => [name, value];

const StoredValueSchema = Schema.Union([
  Schema.String,
  Schema.Boolean,
  Schema.Array(Schema.String),
]);

// An option's value as the API holds it.
type StoredValue = typeof StoredValueSchema.Type;

const StoredSchema = Schema.Record(Schema.String, StoredValueSchema);

const decodeStored = Schema.decodeUnknownOption(StoredSchema);

const decodeText = Schema.decodeUnknownOption(Schema.String);

const decodeBoolean = Schema.decodeUnknownOption(Schema.Boolean);

const decodeTags = Schema.decodeUnknownOption(Schema.Array(Schema.String));

const tagSeparator = ", ";

// The value a stored option shows in its field.
const valueOf = (
  field: OptionField,
  stored: StoredValue | undefined
): Option.Option<boolean | string> =>
  Match.value(field).pipe(
    Match.discriminatorsExhaustive("kind")({
      choice: () => decodeText(stored),
      tags: () =>
        decodeTags(stored).pipe(Option.map((tags) => tags.join(tagSeparator))),
      text: () => decodeText(stored),
      toggle: () => decodeBoolean(stored),
      yesNo: () => decodeBoolean(stored),
    })
  );

// What a field holds on a new target: its box as it says, nothing else.
const initialOf = (field: OptionField): Option.Option<boolean | string> =>
  field.kind === "toggle" ? Option.some(field.initial) : Option.none();

/**
 * The values a target's stored options fill in. Boxes left out keep the
 * value the platform gives them when the option is left out, which is the
 * field's `initial`.
 */
export const valuesOf = (
  platform: Platform,
  options: TargetOptions | null
): OptionValues => {
  const stored = decodeStored(options ?? {}).pipe(
    Option.getOrElse((): typeof StoredSchema.Type => ({}))
  );

  return Object.fromEntries(
    fieldsOf(platform).flatMap((field) =>
      Option.match(
        valueOf(field, stored[field.name]).pipe(
          Option.orElse(() => initialOf(field))
        ),
        {
          onNone: () => [],
          onSome: (value) => [entry(field.name, value)],
        }
      )
    )
  );
};

/** What a new target starts with: every box as its field says. */
export const initialValues = (platform: Platform): OptionValues =>
  valuesOf(platform, null);

/** The values of a post's channels' options, by channel id. */
export type ValuesByChannel = Readonly<Record<string, OptionValues>>;

/** The values each of the post's targets has, by channel. */
export const valuesOfPost = (
  post: Post | undefined,
  platformOf: (channelId: string) => Option.Option<Platform>
): ValuesByChannel =>
  Object.fromEntries(
    (post?.targets ?? []).flatMap(({ channelId, options }) =>
      Option.match(platformOf(channelId), {
        onNone: () => [],
        onSome: (platform) =>
          fieldsOf(platform).length === 0
            ? []
            : [[channelId, valuesOf(platform, options)]],
      })
    )
  );

/**
 * The values with one field changed. A box under another is cleared when
 * that one is unticked.
 */
export const withValue = (
  platform: Platform,
  values: OptionValues,
  name: string,
  value: boolean | string | undefined
): OptionValues => {
  const cleared = fieldsOf(platform).flatMap((field) =>
    field.kind === "toggle" && field.within === name && value !== true
      ? [field.name]
      : []
  );

  const kept = Object.entries(values).filter(
    ([key]) => key !== name && !cleared.includes(key)
  );

  const changed = [
    ...(value === undefined ? [] : [entry(name, value)]),
    ...cleared.map((key) => entry(key, false)),
  ];

  return Object.fromEntries([...kept, ...changed]);
};

const tagsOf = (typed: string): readonly string[] =>
  typed
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");

// A field's value as the API takes it, none when it is not filled in.
const optionOf = (
  field: OptionField,
  value: boolean | string | undefined
): Option.Option<boolean | string | readonly string[]> => {
  if (value === undefined || value === "") {
    return Option.none();
  }

  if (field.kind === "tags") {
    return decodeText(value).pipe(
      Option.map(tagsOf),
      Option.filter((tags) => tags.length > 0)
    );
  }

  return Option.some(value);
};

const decodeOptions = Schema.decodeUnknownOption(TargetOptionsSchema);

/**
 * The options the values give on a channel of the platform, as the API
 * takes them; none on a platform that takes no options.
 */
export const optionsOf = (
  platform: Platform,
  values: OptionValues
): Option.Option<TargetOptions> =>
  decodeOptions({
    ...Object.fromEntries(
      fieldsOf(platform).flatMap((field) =>
        Option.match(optionOf(field, values[field.name]), {
          onNone: () => [],
          onSome: (option) => [[field.name, option]],
        })
      )
    ),
    platform,
  });

/** The options of the post on each of these channels that takes some. */
export const channelOptionsOf = (
  channels: readonly { readonly id: string; readonly platform: Platform }[],
  values: ValuesByChannel
): readonly ChannelOptions[] =>
  channels.flatMap(({ id, platform }) =>
    Option.match(optionsOf(platform, values[id] ?? initialValues(platform)), {
      onNone: () => [],
      onSome: (options) => [{ channelId: id, options }],
    })
  );

/** A violation about one option of a channel. */
export type OptionViolation = Extract<
  ContentViolation,
  { readonly _tag: "optionInvalid" | "optionMissing" | "optionTooLong" }
>;

/** The violations about the channel's options, by field. */
export const violationsByField = (
  violations: readonly ContentViolation[],
  channelId: string
): ReadonlyMap<string, OptionViolation> => {
  const byField = new Map<string, OptionViolation>();

  for (const violation of violations) {
    if (
      (violation._tag === "optionInvalid" ||
        violation._tag === "optionMissing" ||
        violation._tag === "optionTooLong") &&
      violation.channelId === channelId
    ) {
      byField.set(violation.field, violation);
    }
  }

  return byField;
};
