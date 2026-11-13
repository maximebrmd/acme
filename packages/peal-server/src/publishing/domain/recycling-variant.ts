import { Schema } from "effect";

import type { ChannelId } from "#shared/domain/ids.ts";

import { PostContent } from "./post-content.ts";
import { PartOverridesSchema } from "./post-part.ts";
import { PostTextSchema } from "./post-text.ts";
import { changedOverride, TextOverride } from "./text-override.ts";

/**
 * A text an occurrence says instead of the source's: it replaces the first
 * part's text and its texts by channel (none unless given), and leaves the
 * media, the later parts and the options as the source has them.
 */
export class RecyclingVariant extends Schema.Class<RecyclingVariant>(
  "peal-server/publishing/domain/RecyclingVariant"
)({
  overrides: PartOverridesSchema,
  text: PostTextSchema,
}) {}

/**
 * What a variant makes of the source's content on these channels: its
 * text, and its texts on those channels, with the media each channel had
 * of its own in the source kept under them (under the variant's own text
 * when it gives the channel none). Media and later parts stay the source's.
 */
export const sayingVariant = (
  content: PostContent,
  channelIds: readonly ChannelId[],
  { overrides, text }: RecyclingVariant
): PostContent => {
  const said = overrides.filter(({ channelId }) =>
    channelIds.includes(channelId)
  );

  const ownMedia = content.overrides.flatMap(({ channelId, media }) =>
    media === undefined || !channelIds.includes(channelId)
      ? []
      : [{ channelId, media }]
  );

  const withMedia = said.map((override) => {
    const own = ownMedia.find(
      ({ channelId }) => channelId === override.channelId
    );

    return own === undefined || override.media !== undefined
      ? override
      : changedOverride(override, { media: own.media });
  });

  const mediaOnly = ownMedia
    .filter(
      ({ channelId }) => !said.some((kept) => kept.channelId === channelId)
    )
    .map(
      ({ channelId, media }) => new TextOverride({ channelId, media, text })
    );

  return new PostContent({
    followUps: content.followUps,
    media: content.media,
    overrides: [...withMedia, ...mediaOnly],
    text,
  });
};
