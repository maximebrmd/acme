import { Effect, Option, Schema } from "effect";
import type { PostToValidate as CheckInput } from "peal-contract";

import type { CheckPostRequest } from "#publishing/application/post-checks.ts";
import { ChannelOptionsListSchema } from "#publishing/domain/channel-options.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

import { placementFrom, presetsFrom, zoneOf } from "./post-input.ts";

// A post to check names channels and media as strings. An id that is not
// even of the right form names nothing here: it is answered with the
// others that name nothing, and what it came with (a text, options, alt
// text) is left out of the rest of the check.

const isChannelId = Schema.is(ChannelIdSchema);

const isMediaId = Schema.is(MediaAssetIdSchema);

const isTimeZone = Schema.is(TimeZoneIdSchema);

const wellFormedMedia = <Media extends { readonly mediaId: string }>(
  media: readonly Media[]
) => media.filter(({ mediaId }) => isMediaId(mediaId));

const decodeChannelIds = Schema.decodeUnknownEffect(
  Schema.Array(ChannelIdSchema)
);

const decodeContent = Schema.decodeUnknownEffect(PostContent);

const decodeOptions = Schema.decodeUnknownEffect(ChannelOptionsListSchema);

/** A post to check, and what it names that no id is written like. */
export interface CheckInputRead {
  readonly malformedChannels: readonly string[];
  readonly malformedMedia: readonly string[];
  readonly request: CheckPostRequest;
  /** False when the zone its time came with is no IANA zone. */
  readonly zoneKnown: boolean;
}

/** The post to check, with its ids decoded. */
export const checkRequestFrom = (input: CheckInput) =>
  Effect.gen(function* decodingCheck() {
    const { content, options = [], when } = input;
    const presets = yield* presetsFrom(input);

    // The post's parts, its first and those that follow, read alike.
    const parts = [content, ...(content.followUps ?? [])];

    const named = [
      ...input.channelIds,
      ...parts.flatMap(({ overrides }) =>
        overrides.map(({ channelId }) => channelId)
      ),
      ...options.map(({ channelId }) => channelId),
    ];

    const wellFormed = <
      Part extends {
        readonly media: readonly { readonly mediaId: string }[];
        readonly overrides: readonly {
          readonly channelId: string;
          readonly media?: readonly { readonly mediaId: string }[];
        }[];
      },
    >(
      part: Part
    ) => ({
      ...part,
      media: wellFormedMedia(part.media),
      overrides: part.overrides.flatMap((override) => {
        if (!isChannelId(override.channelId)) {
          return [];
        }

        return override.media === undefined
          ? [override]
          : [{ ...override, media: wellFormedMedia(override.media) }];
      }),
    });

    const read: CheckInputRead = {
      malformedChannels: [
        ...new Set(named.filter((channelId) => !isChannelId(channelId))),
      ],
      malformedMedia: [
        ...new Set(
          parts
            .flatMap(({ media, overrides }) => [
              ...media,
              ...overrides.flatMap((override) => override.media ?? []),
            ])
            .flatMap(({ mediaId }) => (isMediaId(mediaId) ? [] : [mediaId]))
        ),
      ],
      request: {
        allowDuplicate: input.allowDuplicate ?? false,
        channelIds: yield* decodeChannelIds(
          input.channelIds.filter(isChannelId)
        ),
        content: yield* decodeContent({
          ...wellFormed({
            media: content.media,
            overrides: content.overrides,
            text: content.text,
          }),
          followUps: (content.followUps ?? []).map(wellFormed),
        }),
        options: yield* decodeOptions(
          options.filter(({ channelId }) => isChannelId(channelId))
        ),
        presets,
        when:
          when === undefined
            ? Option.none()
            : Option.some(yield* placementFrom(when)),
      },
      zoneKnown: when === undefined || isTimeZone(zoneOf(when)),
    };

    return read;
  }).pipe(Effect.catchTag("SchemaError", Effect.die));
