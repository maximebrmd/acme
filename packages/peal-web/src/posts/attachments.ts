import type { Media, MediaAttachment } from "peal-contract";
import { maxMediaPerPost } from "peal-contract/post-text";
import { Array as Arr } from "effect";

// The images and videos a post shows, in order, as the composer edits them.
// Each function returns a new list and leaves the one it is given alone.

/** How many more images or videos the post can show. */
export const roomLeft = (attachments: readonly MediaAttachment[]): number =>
  Math.max(0, maxMediaPerPost - attachments.length);

/**
 * The attachments with `added` after them, in the order given, each with
 * its library description as alt text. Media attached already stays where
 * it is, and what the post has no room for is left out.
 */
export const attach = (
  attachments: readonly MediaAttachment[],
  added: readonly Media[]
): readonly MediaAttachment[] => {
  const attached = new Set(attachments.map(({ mediaId }) => mediaId));

  const fresh = Arr.dedupeWith(
    added.filter(({ id }) => !attached.has(id)),
    (left, right) => left.id === right.id
  );

  return [
    ...attachments,
    ...fresh
      .slice(0, roomLeft(attachments))
      .map(({ altText, id }) => ({ altText: altText ?? "", mediaId: id })),
  ];
};

/** The attachments without this media. */
export const detach = (
  attachments: readonly MediaAttachment[],
  mediaId: string
): readonly MediaAttachment[] =>
  attachments.filter((attachment) => attachment.mediaId !== mediaId);

/**
 * The attachments with this media moved `offset` places, earlier when
 * negative, and never past either end.
 */
export const move = (
  attachments: readonly MediaAttachment[],
  mediaId: string,
  offset: number
): readonly MediaAttachment[] => {
  const from = attachments.findIndex(
    (attachment) => attachment.mediaId === mediaId
  );

  const moved = attachments[from];

  if (moved === undefined) {
    return attachments;
  }

  const to = Math.min(Math.max(from + offset, 0), attachments.length - 1);
  const rest = attachments.toSpliced(from, 1);

  return rest.toSpliced(to, 0, moved);
};

/** The attachments with this alt text for this media. */
export const describe = (
  attachments: readonly MediaAttachment[],
  mediaId: string,
  altText: string
): readonly MediaAttachment[] =>
  attachments.map((attachment) =>
    attachment.mediaId === mediaId ? { ...attachment, altText } : attachment
  );

/** Whether the alt text says nothing: empty, or only spaces. */
export const lacksAltText = ({ altText }: MediaAttachment): boolean =>
  altText.trim() === "";
