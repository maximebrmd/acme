import { Option, Schema } from "effect";
import { accountNumberNames, postCountNames } from "peal-contract";
import type {
  AccountStanding as AccountStandingView,
  ChannelCapabilities as ChannelCapabilitiesView,
  FieldDescription as FieldView,
  LookupDescription as LookupDescriptionView,
  MediaFormat as MediaFormatView,
  PlatformCapabilities as PlatformCapabilitiesView,
} from "peal-contract";

import type { DescribedChannel } from "#publishing/application/posting-capabilities.ts";
import type { AccountStanding } from "#publishing/domain/account-restriction.ts";
import type { FieldDescription } from "#publishing/domain/field-description.ts";
import type { LookupName } from "#publishing/domain/lookup.ts";
import {
  MediaContentTypeSchema,
  mediaKinds,
} from "#publishing/domain/media-file.ts";
import type {
  OptionLookup,
  PlatformCapabilities,
} from "#publishing/domain/platform-capabilities.ts";
import type {
  FormatLimits,
  MediaRules,
  PlatformRules,
} from "#publishing/domain/platform-rules.ts";

// Absent values are null in what clients read.
const orNull = <A>(value: A | undefined): A | null => value ?? null;

const fieldView = (field: FieldDescription<LookupName>): FieldView => ({
  contentTypes: field.contentTypes ?? [],
  forbiddenCharacters: field.forbiddenCharacters ?? [],
  ifLeftOut: orNull(field.ifLeftOut),
  lookup: orNull(field.lookup),
  maxByteSize: orNull(field.maxByteSize),
  maxLength: orNull(field.maxLength),
  maximum: orNull(field.maximum),
  minimum: orNull(field.minimum),
  name: field.name,
  pattern: orNull(field.pattern),
  required: field.required,
  type: field.type,
  values: field.values,
});

/**
 * A lookup as the contract describes it, to the API and the MCP tools
 * alike.
 */
// What Peal can do to a post once it is live, as clients read it: each
// action, and why not, when it is known. Editing is not built yet: it is
// false everywhere, with the reason only where the platform stops it.
const livePostView = (ability: PlatformCapabilities["livePost"]) => ({
  edit: false,
  ...Option.match(ability.editBlockedBy, {
    onNone: () => ({}),
    onSome: (blocker) => ({ editBlockedBy: blocker }),
  }),
  unpublish: Option.isNone(ability.unpublish),
  ...Option.match(ability.unpublish, {
    onNone: () => ({}),
    onSome: (blocker) => ({ unpublishBlockedBy: blocker }),
  }),
});

export const lookupDescriptionView = (
  lookup: OptionLookup
): LookupDescriptionView => ({
  fills: lookup.fills,
  input: lookup.input.map(fieldView),
  name: lookup.name,
  paged: lookup.paged,
  platform: lookup.platform,
});

const formatView = (
  contentType: MediaFormatView["contentType"],
  limits: FormatLimits
): MediaFormatView => ({
  contentType,
  kind: mediaKinds[contentType],
  maxAspectRatio: orNull(limits.aspectRatio?.maximum),
  maxByteSize: orNull(limits.maxByteSize),
  maxDurationMs: orNull(limits.maxDurationMs),
  maxMediaWith: orNull(limits.maxMediaWith),
  maxPixels: orNull(limits.maxPixels),
  maxSide: orNull(limits.sideRange?.maximum),
  minAspectRatio: orNull(limits.aspectRatio?.minimum),
  minByteSize: orNull(limits.minByteSize),
  minDurationMs: orNull(limits.minDurationMs),
  minSide: orNull(limits.sideRange?.minimum),
});

// The file types the platform takes, in the order Peal lists its own.
const formatsView = (media: MediaRules): readonly MediaFormatView[] =>
  MediaContentTypeSchema.literals.flatMap((contentType) => {
    const limits = media.formats[contentType];

    return limits === undefined ? [] : [formatView(contentType, limits)];
  });

// What the rules take of a post's images and videos, with the most files
// and the longest alt text Peal takes there.
const mediaView = (
  rules: PlatformRules,
  limits: { readonly maxAltTextLength: number; readonly maxMedia: number }
): PlatformCapabilitiesView["media"] => ({
  altText: {
    maxLength: limits.maxAltTextLength,
    shown: orNull(rules.media?.showsAltText),
  },
  formats: rules.media === undefined ? null : formatsView(rules.media),
  maxCount: limits.maxMedia,
  maxVideos: orNull(rules.media?.maxVideos),
  mixesKinds: orNull(rules.media?.mixesKinds),
  required: rules.mediaRequired,
});

const isPostCount = Schema.is(Schema.Literals(postCountNames));

const isAccountNumber = Schema.is(Schema.Literals(accountNumberNames));

/**
 * A platform's capabilities as the contract describes them, to the API and
 * the MCP tools alike: absent limits null.
 */
export const platformCapabilitiesView = (
  capabilities: PlatformCapabilities
): PlatformCapabilitiesView => {
  const { rules } = capabilities;

  const view: PlatformCapabilitiesView = {
    analytics: {
      accountNumbers: capabilities.counted.account.filter(isAccountNumber),
      perPost: capabilities.countsPosts,
      postCounts: capabilities.counted.post.filter(isPostCount),
    },
    followUps:
      rules.followUps === undefined
        ? null
        : { kind: rules.followUps.kind, maxCount: rules.followUps.maximum },
    livePost: livePostView(capabilities.livePost),
    lookups: capabilities.lookups.map(lookupDescriptionView),
    media: mediaView(rules, capabilities),
    options: {
      constraints: capabilities.optionConstraints,
      fields: capabilities.options.map(fieldView),
    },
    platform: capabilities.platform,
    text: {
      forbiddenCharacters: rules.forbiddenCharacters ?? [],
      limits: capabilities.textLimits,
      maxHashtags: orNull(rules.maxHashtags),
      maxLinks: orNull(rules.maxLinks),
      maxMentions: orNull(rules.maxMentions),
    },
    version: capabilities.version,
  };

  const formats = capabilities.postFormats;

  return formats === undefined
    ? view
    : {
        ...view,
        postFormats: formats.map((format) => ({
          description: format.description,
          media: mediaView(format.rules, format),
          name: format.name,
          sendsText: format.rules.sendsText !== false,
        })),
      };
};

const standingView = (account: AccountStanding): AccountStandingView =>
  account._tag === "read"
    ? {
        _tag: "read",
        blocked: orNull(account.blocked),
        restrictions: account.restrictions,
      }
    : account;

/** A channel's capabilities as the contract describes them. */
export const channelCapabilitiesView = (
  described: DescribedChannel
): ChannelCapabilitiesView => ({
  account: standingView(described.account),
  capabilities: platformCapabilitiesView(described.capabilities),
  channelId: described.channelId,
});
