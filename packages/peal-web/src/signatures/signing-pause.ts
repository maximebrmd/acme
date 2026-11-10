import type { Post, PostContent } from "peal-contract";

/** What the composer knows once the save of a schedule action answered. */
export interface SignedSave {
  /** Whether the request asked for the default signatures. */
  readonly asked: boolean;
  /** Whether the request created the post, rather than saving one. */
  readonly created: boolean;
  /** The post as the server saved it. */
  readonly saved: Pick<Post, "content">;
  /** What the composer sent, which its counters counted. */
  readonly sent: Pick<PostContent, "overrides" | "text">;
}

// A post's text on each channel that has one of its own, by channel.
const ownTexts = (content: Pick<PostContent, "overrides">) =>
  new Map(content.overrides.map(({ channelId, text }) => [channelId, text]));

/** Whether the server saved other texts than those the composer sent. */
export const textsChanged = (
  sent: SignedSave["sent"],
  saved: SignedSave["saved"]
): boolean => {
  const before = ownTexts(sent);
  const after = ownTexts(saved.content);

  return (
    sent.text !== saved.content.text ||
    before.size !== after.size ||
    [...after].some(([channelId, text]) => before.get(channelId) !== text)
  );
};

/**
 * Whether scheduling stops after its save, for the person to read what
 * they are about to schedule: only when that save created the post with
 * the default signatures, and they changed a text. The counters never
 * counted a signature the person has not seen; the next Schedule saves a
 * post that exists, asks for no signature, and goes on.
 */
export const pausesToCheck = ({
  asked,
  created,
  saved,
  sent,
}: SignedSave): boolean => asked && created && textsChanged(sent, saved);
