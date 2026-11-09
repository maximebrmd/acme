"use client";

import type { ContentViolation } from "peal-contract";
import { Match, Option } from "effect";
import { useFormatter, useTranslations } from "next-intl";

import { useFileSize } from "#components/media/use-file-size.ts";
import type { AttachedMedia, MediaProblem } from "#posts/media-fit.ts";

const minute = 60_000;

/** The format a content type names, as the catalogues' `format` selects it. */
const formatOf = (contentType: string): string =>
  contentType.split("/").at(1) ?? contentType;

/** Durations as people read them: whole minutes, or seconds. */
const useDuration = () => {
  const format = useFormatter();

  return (ms: number): string =>
    ms >= minute && ms % minute === 0
      ? format.number(ms / minute, { style: "unit", unit: "minute" })
      : format.number(ms / 1000, {
          maximumFractionDigits: 1,
          style: "unit",
          unit: "second",
        });
};

/** The short text of each media problem, beside a channel's counter. */
export const useMediaProblemText = () => {
  const t = useTranslations("PostMedia");
  const size = useFileSize();
  const duration = useDuration();

  return (problem: MediaProblem): string =>
    Match.valueTags(problem, {
      altTextTooLong: ({ kind, maximum, position }) =>
        t("problem.altTextTooLong", { kind, maximum, position }),
      aspectRatioUnsupported: ({ kind, position }) =>
        t("problem.aspectRatioUnsupported", { kind, position }),
      mediaTooLarge: ({ kind, maximum, position }) =>
        t("problem.mediaTooLarge", { kind, maximum: size(maximum), position }),
      mediaTooSmall: ({ kind, minimum, position }) =>
        t("problem.mediaTooSmall", { kind, minimum: size(minimum), position }),
      mediaTypeUnsupported: ({ contentType, kind, position }) =>
        t("problem.mediaTypeUnsupported", {
          format: t("format", { format: formatOf(contentType) }),
          kind,
          position,
        }),
      mixedMedia: () => t("problem.mixedMedia"),
      sideOutOfRange: ({ kind, maximum, minimum, position }) =>
        t("problem.sideOutOfRange", { kind, maximum, minimum, position }),
      tooManyMedia: ({ count, maximum }) =>
        t("problem.tooManyMedia", { count, maximum }),
      tooManyPixels: ({ kind, maximum, position }) =>
        t("problem.tooManyPixels", { kind, maximum, position }),
      tooManyVideos: ({ count, maximum }) =>
        t("problem.tooManyVideos", { count, maximum }),
      videoTooLong: ({ kind, maximumMs, position }) =>
        t("problem.videoTooLong", {
          kind,
          maximum: duration(maximumMs),
          position,
        }),
      videoTooShort: ({ kind, minimumMs, position }) =>
        t("problem.videoTooShort", {
          kind,
          minimum: duration(minimumMs),
          position,
        }),
    });
};

type MediaViolationTag =
  | "altTextTooLong"
  | "aspectRatioUnsupported"
  | "mediaTooLarge"
  | "mediaTooSmall"
  | "mediaTypeUnsupported"
  | "mixedMedia"
  | "sideOutOfRange"
  | "tooManyPixels"
  | "tooManyVideos"
  | "videoTooLong"
  | "videoTooShort";

type Of<Tag extends MediaViolationTag> = Extract<
  ContentViolation,
  { readonly _tag: Tag }
>;

/**
 * What to say of each media violation the API reports, as handlers for
 * `Match.valueTags`: `channelName` names its channel, and `media`, the
 * post's attachments, tells which image or video it is.
 */
export const useMediaViolationTexts = (
  media: readonly AttachedMedia[],
  channelName: (channelId: string) => string
) => {
  const t = useTranslations("PostMedia");
  const size = useFileSize();
  const duration = useDuration();
  const format = useFormatter();

  // The channel, and the attachment by its kind and place in the post;
  // "other" once the post no longer shows it.
  const named = ({
    channelId,
    mediaId,
  }: {
    readonly channelId: string;
    readonly mediaId: string;
  }) => {
    const index = media.findIndex((item) => item.mediaId === mediaId);

    const kind = Option.fromUndefinedOr(media[index]).pipe(
      Option.flatMap((item) => item.media),
      Option.match({ onNone: () => "other", onSome: (found) => found.kind })
    );

    return { channel: channelName(channelId), kind, position: index + 1 };
  };

  const ratio = (value: number) =>
    format.number(value, { maximumFractionDigits: 2 });

  return {
    altTextTooLong: (violation: Of<"altTextTooLong">) =>
      t("violation.altTextTooLong", {
        ...named(violation),
        length: violation.length,
        maximum: violation.maximum,
      }),
    aspectRatioUnsupported: (violation: Of<"aspectRatioUnsupported">) =>
      t("violation.aspectRatioUnsupported", {
        ...named(violation),
        height: violation.height,
        maximum: ratio(violation.maximum),
        minimum: ratio(violation.minimum),
        width: violation.width,
      }),
    mediaTooLarge: (violation: Of<"mediaTooLarge">) =>
      t("violation.mediaTooLarge", {
        ...named(violation),
        maximum: size(violation.maximum),
        size: size(violation.byteSize),
      }),
    mediaTooSmall: (violation: Of<"mediaTooSmall">) =>
      t("violation.mediaTooSmall", {
        ...named(violation),
        minimum: size(violation.minimum),
        size: size(violation.byteSize),
      }),
    mediaTypeUnsupported: (violation: Of<"mediaTypeUnsupported">) =>
      t("violation.mediaTypeUnsupported", {
        ...named(violation),
        format: t("format", { format: formatOf(violation.contentType) }),
      }),
    mixedMedia: ({ channelId }: Of<"mixedMedia">) =>
      t("violation.mixedMedia", { channel: channelName(channelId) }),
    sideOutOfRange: (violation: Of<"sideOutOfRange">) =>
      t("violation.sideOutOfRange", {
        ...named(violation),
        height: violation.height,
        maximum: violation.maximum,
        minimum: violation.minimum,
        width: violation.width,
      }),
    tooManyPixels: (violation: Of<"tooManyPixels">) =>
      t("violation.tooManyPixels", {
        ...named(violation),
        height: violation.height,
        maximum: violation.maximum,
        width: violation.width,
      }),
    tooManyVideos: ({ channelId, count, maximum }: Of<"tooManyVideos">) =>
      t("violation.tooManyVideos", {
        channel: channelName(channelId),
        count,
        maximum,
      }),
    videoTooLong: (violation: Of<"videoTooLong">) =>
      t("violation.videoTooLong", {
        ...named(violation),
        duration: duration(violation.durationMs),
        maximum: duration(violation.maximumMs),
      }),
    videoTooShort: (violation: Of<"videoTooShort">) =>
      t("violation.videoTooShort", {
        ...named(violation),
        duration: duration(violation.durationMs),
        minimum: duration(violation.minimumMs),
      }),
  };
};
