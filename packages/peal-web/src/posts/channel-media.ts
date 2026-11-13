import type { MediaAttachment, PostContent, TextOverride } from "peal-contract";

/** The media some channels show instead of the post's, by channel. */
export type ChannelMedia = Readonly<Record<string, readonly MediaAttachment[]>>;

/** The media a saved post gives some of its channels, by channel. */
export const channelMediaOf = (
  content: PostContent | undefined
): Record<string, readonly MediaAttachment[]> =>
  Object.fromEntries(
    (content?.overrides ?? []).flatMap(({ channelId, media }) =>
      media === undefined ? [] : [[channelId, media]]
    )
  );

/**
 * The texts of their own a saved post's channels have, by channel. An
 * override sends a text with its media, so a channel given media alone
 * repeats the post's text: it follows the post's text again, rather than
 * keep the words it had when it was saved.
 */
export const channelTextsOf = (
  content: PostContent | undefined
): Record<string, string> =>
  Object.fromEntries(
    (content?.overrides ?? []).flatMap(({ channelId, media, text }) =>
      media !== undefined && text === content?.text ? [] : [[channelId, text]]
    )
  );

/** What the composer holds of the texts and media by channel. */
export interface ByChannel {
  /** The channels the post goes to. */
  readonly channelIds: readonly string[];
  readonly channelMedia: ChannelMedia;
  /** The texts of their own, as typed: a blank one follows the post's. */
  readonly overrides: Readonly<Record<string, string>>;
  /** The post's own text. */
  readonly text: string;
}

// The text a channel sends with media of its own: its own, else the
// post's; none when both are blank, as an override needs a text.
const textWithMedia = (own: string, text: string) => {
  if (own.trim() !== "") {
    return own;
  }

  return text.trim() === "" ? undefined : text;
};

/**
 * The overrides to send, for the channels the post goes to only: a text of
 * its own when it is not blank, and media of its own when it has them,
 * under the post's text when it has no text of its own.
 */
export const overridesFrom = ({
  channelIds,
  channelMedia,
  overrides,
  text,
}: ByChannel): readonly TextOverride[] =>
  channelIds.flatMap((channelId) => {
    const own = overrides[channelId] ?? "";
    const media = channelMedia[channelId];

    if (media === undefined) {
      return own.trim() === "" ? [] : [{ channelId, text: own }];
    }

    const sent = textWithMedia(own, text);

    return sent === undefined ? [] : [{ channelId, media, text: sent }];
  });

/**
 * The channels whose media of their own cannot be sent yet: neither they
 * nor the post have a text, which an override needs.
 */
export const mediaWaitingForText = (composed: ByChannel): readonly string[] => {
  const sent = new Set(
    overridesFrom(composed).map(({ channelId }) => channelId)
  );

  return composed.channelIds.filter(
    (channelId) =>
      composed.channelMedia[channelId] !== undefined && !sent.has(channelId)
  );
};

/**
 * The media by channel with `media` as the channel's own, or without any
 * of its own when `media` is undefined: it then shows the post's.
 */
export const withChannelMedia = (
  channelMedia: ChannelMedia,
  channelId: string,
  media: readonly MediaAttachment[] | undefined
): Record<string, readonly MediaAttachment[]> => {
  const others = Object.entries(channelMedia).filter(
    ([id]) => id !== channelId
  );

  return Object.fromEntries(
    media === undefined ? others : [...others, [channelId, media]]
  );
};
