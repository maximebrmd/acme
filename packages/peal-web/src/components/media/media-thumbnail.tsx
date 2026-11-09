"use client";

import { FilmIcon, ImageIcon } from "lucide-react";
import Image from "next/image";
import type { Media } from "peal-contract";

/**
 * The file itself, shown small and filling its box: images as they are,
 * videos by their first frame. Nothing is stored yet for pending media, nor
 * any more for rejected, so their kind's icon stands in. `sizes` is how
 * wide the box is, as `<img sizes>` reads it.
 */
export const MediaThumbnail = ({
  media,
  sizes,
}: {
  readonly media: Media;
  readonly sizes: string;
}) => {
  const { url } = media;

  if (url === null) {
    const Icon = media.kind === "image" ? ImageIcon : FilmIcon;

    return (
      <div className="bg-muted flex size-full items-center justify-center">
        <Icon aria-hidden className="text-muted-foreground size-8" />
      </div>
    );
  }

  return media.kind === "image" ? (
    <Image
      src={url}
      alt={media.altText ?? ""}
      fill
      unoptimized
      sizes={sizes}
      className="object-cover"
    />
  ) : (
    <video
      // Seeking a little in makes browsers fetch and show a first frame.
      src={`${url}#t=0.1`}
      muted
      playsInline
      preload="metadata"
      aria-label={media.altText ?? undefined}
      className="size-full object-cover"
    />
  );
};
