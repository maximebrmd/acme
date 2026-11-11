import { Option, Schema } from "effect";

import { MediaAssetIdSchema } from "#shared/domain/ids.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";

import type { ChannelOptions } from "./channel-options.ts";
import { shownMedia } from "./post-content.ts";
import type { PostContent } from "./post-content.ts";
import { mediaFieldsOn, TargetOptionsSchema } from "./target-options.ts";
import type { TargetOptions } from "./target-options.ts";

// A file of the library an option names (a video's thumbnail, a reel's
// cover) is not media the post shows: no platform gets it as the post's
// media. It is a file the post depends on all the same, which must be the
// workspace's and ready, cannot be deleted under a post that goes out,
// and is dropped from a copy once gone.

/** A file an option names, and the option that names it. */
export interface NamedMedia {
  readonly field: string;
  readonly mediaId: MediaAssetId;
}

const encodeOptions = Schema.encodeSync(TargetOptionsSchema);

const decodeOptions = Schema.decodeUnknownSync(TargetOptionsSchema);

const decodeMediaId = Schema.decodeUnknownOption(MediaAssetIdSchema);

/** The files the options name, in the order of their fields. */
export const mediaNamedBy = (options: TargetOptions): readonly NamedMedia[] => {
  const fields = mediaFieldsOn(options.platform);

  return Object.entries(encodeOptions(options)).flatMap(([field, value]) =>
    fields.includes(field)
      ? Option.toArray(
          decodeMediaId(value).pipe(
            Option.map((mediaId): NamedMedia => ({ field, mediaId }))
          )
        )
      : []
  );
};

/**
 * Every file the post depends on: the media it shows in any of its parts,
 * then those its options name on its channels, each once. What a platform
 * shows as the post's media is `shownMedia`, never this.
 */
export const referencedMedia = (
  content: PostContent,
  options: readonly ChannelOptions[]
): readonly MediaAssetId[] => [
  ...new Set([
    ...shownMedia(content).map(({ mediaId }) => mediaId),
    ...options.flatMap((chosen) =>
      mediaNamedBy(chosen.options).map(({ mediaId }) => mediaId)
    ),
  ]),
];

/** Whether the options name the file. */
export const namesMedia = (
  options: TargetOptions,
  mediaId: MediaAssetId
): boolean => mediaNamedBy(options).some((named) => named.mediaId === mediaId);

/**
 * The options without those that name a file `kept` refuses, as a copy
 * keeps what the workspace still has.
 */
export const keepingMedia = (
  options: TargetOptions,
  kept: (mediaId: MediaAssetId) => boolean
): TargetOptions => {
  const gone = new Set(
    mediaNamedBy(options)
      .filter(({ mediaId }) => !kept(mediaId))
      .map(({ field }) => field)
  );

  return gone.size === 0
    ? options
    : decodeOptions(
        Object.fromEntries(
          Object.entries(encodeOptions(options)).filter(
            ([field]) => !gone.has(field)
          )
        )
      );
};
