import { useFormatter } from "next-intl";

const gigabyte = 1_000_000_000;

/** Writes bytes in the decimal units the plans are sold in. */
export const useSize = () => {
  const format = useFormatter();

  return (bytes: number) =>
    bytes >= gigabyte
      ? format.number(bytes / gigabyte, {
          maximumFractionDigits: 1,
          style: "unit",
          unit: "gigabyte",
        })
      : format.number(bytes / 1_000_000, {
          maximumFractionDigits: 0,
          style: "unit",
          unit: "megabyte",
        });
};

/** Writes money in the reader's way, from cents. */
export const useMoney = (currency: string) => {
  const format = useFormatter();

  return (cents: number) =>
    format.number(cents / 100, {
      currency: currency.toUpperCase(),
      style: "currency",
    });
};
