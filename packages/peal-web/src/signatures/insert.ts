import { signedText } from "peal-contract";

// Putting a signature under one of a post's texts, as the composer holds
// them.

/** A post's text, and the text it has instead on some channels. */
export interface PostTexts {
  readonly overrides: Readonly<Record<string, string>>;
  readonly text: string;
}

/**
 * The texts with the signature under one of them: the text for all
 * channels, or the text of `channelId`. A channel without a text of its
 * own gets one, the common text signed, as the server does for a
 * channel's default signature. A text that already ends with the
 * signature stays as it is.
 */
export const withSignature = (
  { overrides, text }: PostTexts,
  channelId: string | undefined,
  signature: string
): PostTexts => {
  if (channelId === undefined) {
    return { overrides, text: signedText(text, signature) };
  }

  const own = overrides[channelId] ?? "";

  return {
    overrides: {
      ...overrides,
      [channelId]: signedText(own.trim() === "" ? text : own, signature),
    },
    text,
  };
};
