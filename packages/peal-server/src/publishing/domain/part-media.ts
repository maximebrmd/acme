import { Schema } from "effect";

import { MediaAttachment } from "./media-attachment.ts";

/** The most images and videos a part holds: what the largest carousels take. */
export const maxMediaPerPost = 20;

const isUniqueBy =
  <A>(key: (item: A) => string) =>
  (items: readonly A[]): boolean =>
    new Set(items.map(key)).size === items.length;

/** The media one part shows, in order: each file once. */
export const PartMediaSchema = Schema.Array(MediaAttachment).check(
  Schema.isMaxLength(maxMediaPerPost),
  Schema.makeFilter(
    isUniqueBy((attachment: MediaAttachment) => attachment.mediaId),
    { expected: "each media attached once" }
  )
);
