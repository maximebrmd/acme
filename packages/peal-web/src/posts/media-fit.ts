import { Option } from "effect";
import type { Media, MediaKind, Platform } from "peal-contract";
import { measureText, platformRules } from "peal-contract/post-text";
import type { FormatLimits, MediaRules } from "peal-contract/post-text";

// What each platform would refuse in the post's images and videos, checked
// as the server checks them (src/publishing/domain/content-rules.ts in
// peal-server) with the contract's copy of the rules, so the composer shows
// it before scheduling.

/** An attachment of the post, with its media once the API described it. */
export interface AttachedMedia {
  readonly altText: string;
  readonly media: Option.Option<Media>;
  readonly mediaId: string;
}

/** Which of the post's images or videos: its kind, and its place from 1. */
export interface MediaPlace {
  readonly kind: MediaKind;
  readonly position: number;
}

/** Something about the post's media that the platform would refuse. */
export type MediaProblem =
  | {
      readonly _tag: "tooManyMedia";
      readonly count: number;
      readonly maximum: number;
    }
  | {
      readonly _tag: "tooManyVideos";
      readonly count: number;
      readonly maximum: number;
    }
  | { readonly _tag: "mixedMedia" }
  | (MediaPlace &
      (
        | {
            readonly _tag: "mediaTypeUnsupported";
            readonly contentType: string;
          }
        | {
            readonly _tag: "mediaTooLarge";
            readonly byteSize: number;
            readonly maximum: number;
          }
        | {
            readonly _tag: "mediaTooSmall";
            readonly byteSize: number;
            readonly minimum: number;
          }
        | {
            readonly _tag: "videoTooLong";
            readonly durationMs: number;
            readonly maximumMs: number;
          }
        | {
            readonly _tag: "videoTooShort";
            readonly durationMs: number;
            readonly minimumMs: number;
          }
        | {
            readonly _tag: "tooManyPixels";
            readonly height: number;
            readonly maximum: number;
            readonly width: number;
          }
        | {
            readonly _tag: "sideOutOfRange";
            readonly height: number;
            readonly maximum: number;
            readonly minimum: number;
            readonly width: number;
          }
        | {
            readonly _tag: "aspectRatioUnsupported";
            readonly height: number;
            readonly maximum: number;
            readonly minimum: number;
            readonly width: number;
          }
        | {
            readonly _tag: "altTextTooLong";
            readonly length: number;
            readonly maximum: number;
          }
      ));

/** How the post's media fits a channel's platform. */
export interface MediaFit {
  /**
   * How many images or videos have no alt text, where the platform shows
   * alt text to people who need it; none elsewhere. A warning, not a
   * refusal: the post still goes out.
   */
  readonly missingAltText: number;
  readonly problems: readonly MediaProblem[];
}

const durationProblems = (
  { maxDurationMs, minDurationMs }: FormatLimits,
  place: MediaPlace,
  durationMs: number
): readonly MediaProblem[] => [
  ...(maxDurationMs !== undefined && durationMs > maxDurationMs
    ? [
        {
          ...place,
          _tag: "videoTooLong" as const,
          durationMs,
          maximumMs: maxDurationMs,
        },
      ]
    : []),
  ...(minDurationMs !== undefined && durationMs < minDurationMs
    ? [
        {
          ...place,
          _tag: "videoTooShort" as const,
          durationMs,
          minimumMs: minDurationMs,
        },
      ]
    : []),
];

const dimensionProblems = (
  { aspectRatio, maxPixels, sideRange }: FormatLimits,
  place: MediaPlace,
  { height, width }: { readonly height: number; readonly width: number }
): readonly MediaProblem[] => {
  const ratio = width / height;

  return [
    ...(sideRange !== undefined &&
    [width, height].some(
      (side) => side < sideRange.minimum || side > sideRange.maximum
    )
      ? [
          {
            ...place,
            _tag: "sideOutOfRange" as const,
            height,
            maximum: sideRange.maximum,
            minimum: sideRange.minimum,
            width,
          },
        ]
      : []),
    ...(maxPixels !== undefined && width * height > maxPixels
      ? [
          {
            ...place,
            _tag: "tooManyPixels" as const,
            height,
            maximum: maxPixels,
            width,
          },
        ]
      : []),
    ...(aspectRatio !== undefined &&
    (ratio < aspectRatio.minimum || ratio > aspectRatio.maximum)
      ? [
          {
            ...place,
            _tag: "aspectRatioUnsupported" as const,
            height,
            maximum: aspectRatio.maximum,
            minimum: aspectRatio.minimum,
            width,
          },
        ]
      : []),
  ];
};

const fileProblems = (
  rules: MediaRules,
  media: Media,
  altText: string,
  position: number
): readonly MediaProblem[] => {
  const place: MediaPlace = { kind: media.kind, position };
  const limits = rules.formats[media.contentType];

  if (limits === undefined) {
    return [
      {
        ...place,
        _tag: "mediaTypeUnsupported",
        contentType: media.contentType,
      },
    ];
  }

  const { maxByteSize, minByteSize } = limits;
  const { maxAltTextLength } = rules;
  const altTextLength = measureText(altText, "codePoints");

  return [
    ...(maxByteSize !== undefined && media.byteSize > maxByteSize
      ? [
          {
            ...place,
            _tag: "mediaTooLarge" as const,
            byteSize: media.byteSize,
            maximum: maxByteSize,
          },
        ]
      : []),
    ...(minByteSize !== undefined && media.byteSize < minByteSize
      ? [
          {
            ...place,
            _tag: "mediaTooSmall" as const,
            byteSize: media.byteSize,
            minimum: minByteSize,
          },
        ]
      : []),
    ...(media.durationMs === null
      ? []
      : durationProblems(limits, place, media.durationMs)),
    ...(media.dimensions === null
      ? []
      : dimensionProblems(limits, place, media.dimensions)),
    ...(maxAltTextLength !== undefined && altTextLength > maxAltTextLength
      ? [
          {
            ...place,
            _tag: "altTextTooLong" as const,
            length: altTextLength,
            maximum: maxAltTextLength,
          },
        ]
      : []),
  ];
};

/**
 * How the attached media fits `platform`: each file's type, size, duration,
 * dimensions and alt text, whether a file that goes alone has company, then
 * how many videos there are and whether they come with images. Media not described yet is checked once it is; how
 * many the platform shows is the text's fit (see character-count.ts).
 */
export const mediaFitOn = (
  platform: Platform,
  attached: readonly AttachedMedia[]
): MediaFit => {
  const rules = platformRules[platform].media;

  // A platform whose media rules are not known may take images and videos
  // nobody can check here; a document goes only where the rules say so.
  if (rules === undefined) {
    return {
      missingAltText: 0,
      problems: attached.flatMap(({ media }, index) =>
        Option.toArray(media).flatMap((file) =>
          file.kind === "document"
            ? [
                {
                  _tag: "mediaTypeUnsupported" as const,
                  contentType: file.contentType,
                  kind: file.kind,
                  position: index + 1,
                },
              ]
            : []
        )
      ),
    };
  }

  const known = attached.flatMap(({ altText, media }, index) =>
    Option.toArray(media).map((file) => ({
      altText,
      file,
      position: index + 1,
    }))
  );

  const videos = known.filter(({ file }) => file.kind === "video").length;
  const mixed = !rules.mixesKinds && videos > 0 && videos < known.length;
  const { maxVideos } = rules;

  // A file that takes fewer companions than the platform's own count, as
  // X's GIFs, which go alone. Past that count, the text's fit says so.
  const { maxMedia } = platformRules[platform];

  const fewest = Math.min(
    ...known.map(
      ({ file }) => rules.formats[file.contentType]?.maxMediaWith ?? Infinity
    )
  );

  const tooMany =
    known.length > fewest &&
    (maxMedia === undefined || attached.length <= maxMedia);

  return {
    // A document has no alt text to miss.
    missingAltText: rules.showsAltText
      ? attached.filter(
          ({ altText, media }) =>
            altText.trim() === "" &&
            !Option.exists(media, ({ kind }) => kind === "document")
        ).length
      : 0,
    problems: [
      ...known.flatMap(({ altText, file, position }) =>
        fileProblems(rules, file, altText, position)
      ),
      ...(tooMany
        ? [
            {
              _tag: "tooManyMedia" as const,
              count: known.length,
              maximum: fewest,
            },
          ]
        : []),
      ...(maxVideos !== undefined && videos > maxVideos
        ? [
            {
              _tag: "tooManyVideos" as const,
              count: videos,
              maximum: maxVideos,
            },
          ]
        : []),
      ...(mixed ? [{ _tag: "mixedMedia" as const }] : []),
    ],
  };
};

/** Whether the platform would take the post's media as it is. */
export const mediaFits = (fit: MediaFit): boolean => fit.problems.length === 0;

/** Where a platform shows alt text to people who need it. */
export const showsAltText = (platform: Platform): boolean =>
  platformRules[platform].media?.showsAltText ?? false;
