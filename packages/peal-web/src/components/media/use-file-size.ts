import { useFormatter } from "next-intl";

import { readableSize } from "#media/byte-size.ts";

/** Formats a file's size in the reader's language: "3.6 kB", "22,3 Mo". */
export const useFileSize = () => {
  const format = useFormatter();

  return (bytes: number): string => {
    const { unit, value } = readableSize(bytes);

    return format.number(value, {
      maximumFractionDigits: 1,
      style: "unit",
      unit,
    });
  };
};
