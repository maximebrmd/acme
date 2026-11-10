import { signedText } from "peal-contract";

import type { PartDraft } from "#posts/parts.ts";

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

/** A post's texts, and the parts that follow it. */
export interface ThreadTexts extends PostTexts {
  readonly parts: readonly PartDraft[];
}

/**
 * The texts with the signature under the last part, as the server signs a
 * post of several parts: the post itself when no part follows it.
 */
export const withSignatureUnderLastPart = (
  texts: ThreadTexts,
  channelId: string | undefined,
  signature: string
): ThreadTexts => {
  const last = texts.parts.at(-1);

  if (last === undefined) {
    return { ...texts, ...withSignature(texts, channelId, signature) };
  }

  const signed = withSignature(
    {
      overrides: Object.fromEntries(
        last.overrides.map(({ channelId: id, text }) => [id, text])
      ),
      text: last.text,
    },
    channelId,
    signature
  );

  return {
    ...texts,
    parts: [
      ...texts.parts.slice(0, -1),
      {
        ...last,
        overrides: Object.entries(signed.overrides)
          .map(([id, text]) => ({ channelId: id, text }))
          .toSorted((a, b) => a.channelId.localeCompare(b.channelId)),
        text: signed.text,
      },
    ],
  };
};
