import { Effect, Option, Schema } from "effect";
import type { PostToValidate as CheckInput } from "peal-contract";

import type { CheckPostRequest } from "#publishing/application/post-checks.ts";
import { ChannelOptionsListSchema } from "#publishing/domain/channel-options.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

import { presetsFrom } from "./post-input.ts";

// A post to check names channels and media as strings. An id that is not
// even of the right form names nothing here: it is answered with the
// others that name nothing, and what it came with (a text, options, alt
// text) is left out of the rest of the check.

const isChannelId = Schema.is(ChannelIdSchema);

const isMediaId = Schema.is(MediaAssetIdSchema);

const isTimeZone = Schema.is(TimeZoneIdSchema);

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

    const named = [
      ...input.channelIds,
      ...content.overrides.map(({ channelId }) => channelId),
      ...options.map(({ channelId }) => channelId),
    ];

    const read: CheckInputRead = {
      malformedChannels: [
        ...new Set(named.filter((channelId) => !isChannelId(channelId))),
      ],
      malformedMedia: content.media
        .map(({ mediaId }) => mediaId)
        .filter((mediaId) => !isMediaId(mediaId)),
      request: {
        allowDuplicate: input.allowDuplicate ?? false,
        channelIds: yield* decodeChannelIds(
          input.channelIds.filter(isChannelId)
        ),
        content: yield* decodeContent({
          media: content.media.filter(({ mediaId }) => isMediaId(mediaId)),
          overrides: content.overrides.filter(({ channelId }) =>
            isChannelId(channelId)
          ),
          text: content.text,
        }),
        options: yield* decodeOptions(
          options.filter(({ channelId }) => isChannelId(channelId))
        ),
        presets,
        when: Option.fromUndefinedOr(when).pipe(
          Option.map((timing) => ({
            at: timing._tag === "at" ? Option.some(timing.at) : Option.none(),
          }))
        ),
      },
      zoneKnown: when === undefined || isTimeZone(when.timeZone ?? "UTC"),
    };

    return read;
  }).pipe(Effect.catchTag("SchemaError", Effect.die));
