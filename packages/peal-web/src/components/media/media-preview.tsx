"use client";

import {
  ExternalLinkIcon,
  FileTextIcon,
  FilmIcon,
  ImageIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { Media } from "peal-contract";

import { useMediaFacts } from "./use-media-facts.ts";

const icons = {
  document: FileTextIcon,
  image: ImageIcon,
  video: FilmIcon,
} as const;

/**
 * What a media is called in the library: the name its file had, as text,
 * or its kind for a file without one (made by the assistant, or added
 * before Peal kept names).
 */
export const useMediaName = (): ((media: Media) => string) => {
  const t = useTranslations("Media.library");

  return (media) => media.fileName ?? t("kind", { kind: media.kind });
};

// The file at the size the window allows: an image whole, a video to
// play. A document is handed to the browser in a tab of its own, never
// shown here; neither is a file the store does not hold.
const LargeFile = ({ media }: { readonly media: Media }) => {
  const t = useTranslations("Media.library");
  const { dimensions, url } = media;

  if (url === null) {
    const Icon = icons[media.kind];

    return (
      <div className="bg-muted flex h-48 flex-col items-center justify-center gap-2 rounded-md">
        <Icon aria-hidden className="text-muted-foreground size-8" />
        <p className="text-muted-foreground text-sm">{t("previewMissing")}</p>
      </div>
    );
  }

  if (media.kind === "document") {
    return (
      <div className="bg-muted flex h-48 flex-col items-center justify-center gap-3 rounded-md">
        <FileTextIcon aria-hidden className="text-muted-foreground size-8" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
        >
          {t("openDocument")}
          <ExternalLinkIcon aria-hidden className="size-3.5" />
        </a>
      </div>
    );
  }

  if (media.kind === "video") {
    return (
      // Muted until the person turns the sound on: Peal holds no captions
      // for a member's video.
      <video
        src={url}
        controls
        muted
        playsInline
        preload="metadata"
        aria-label={media.altText ?? undefined}
        className="max-h-[70vh] w-full rounded-md bg-black"
      />
    );
  }

  return dimensions === null ? (
    <div className="relative h-[60vh]">
      <Image
        src={url}
        alt={media.altText ?? ""}
        fill
        unoptimized
        sizes="(min-width: 1024px) 56rem, 100vw"
        className="object-contain"
      />
    </div>
  ) : (
    <Image
      src={url}
      alt={media.altText ?? ""}
      width={dimensions.width}
      height={dimensions.height}
      unoptimized
      className="mx-auto h-auto max-h-[70vh] w-auto max-w-full rounded-md object-contain"
    />
  );
};

/**
 * One media at full size, with what the library knows of it: the inside
 * of the preview dialog, apart from the dialog so that tests render it.
 * The name and the description are the members' text, shown as text.
 */
export const MediaPreviewBody = ({ media }: { readonly media: Media }) => {
  const t = useTranslations("Media.library");
  const facts = useMediaFacts(media);

  return (
    <div className="flex flex-col gap-4">
      <LargeFile media={media} />
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">{facts.join(" · ")}</p>
        <p
          className={
            media.altText === null
              ? "text-muted-foreground text-sm italic"
              : "text-sm whitespace-pre-line"
          }
        >
          {media.altText ?? t("noAltText")}
        </p>
      </div>
    </div>
  );
};
