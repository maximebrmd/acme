import { useTranslations } from "next-intl";
import type { Media } from "peal-contract";

import { useFileSize } from "./use-file-size.ts";

/** What the library shows of a file on one line: its kind, size and shape. */
export const useMediaFacts = (media: Media): readonly string[] => {
  const t = useTranslations("Media.library");
  const fileSize = useFileSize();

  return [
    t("kind", { kind: media.kind }),
    fileSize(media.byteSize),
    ...(media.dimensions === null ? [] : [t("dimensions", media.dimensions)]),
    ...(media.durationMs === null
      ? []
      : [
          t("duration", {
            seconds: Math.round(media.durationMs / 100) / 10,
          }),
        ]),
    ...(media.pageCount === null
      ? []
      : [t("pages", { count: media.pageCount })]),
  ];
};
