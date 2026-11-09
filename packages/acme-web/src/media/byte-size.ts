/** A unit Intl formats sizes in, as `style: "unit"` names it. */
export type SizeUnit = "byte" | "kilobyte" | "megabyte" | "gigabyte";

const units: readonly SizeUnit[] = ["byte", "kilobyte", "megabyte", "gigabyte"];

/** A size in one unit. */
export interface ReadableSize {
  readonly unit: SizeUnit;
  readonly value: number;
}

/**
 * A size in bytes as people read it: in the largest unit that keeps the
 * value at 1 or more, counting 1,024 of each unit in the next, as file
 * managers do.
 */
export const readableSize = (bytes: number): ReadableSize => {
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return { unit: units[index] ?? "byte", value };
};
