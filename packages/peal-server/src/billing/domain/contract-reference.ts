import { Option } from "effect";

// Crockford's base 32: no I, L, O or U, which read as digits or as each
// other.
const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const groups = 3;
const groupLength = 4;
const length = groups * groupLength;
const bitsPerCharacter = 5;

// The letters people type for the digits they look like.
const mistaken: ReadonlyMap<string, string> = new Map([
  ["I", "1"],
  ["L", "1"],
  ["O", "0"],
]);

const grouped = (characters: string): string =>
  Array.from({ length: groups }, (_unused, group) =>
    characters.slice(group * groupLength, (group + 1) * groupLength)
  ).join("-");

/**
 * A contract's number, as its members read it in the confirmation of their
 * subscription: the first 60 bits of `bytes` as twelve characters in three
 * groups (`7K3M-9QXD-42TN`). The bytes come from a keyed hash of the
 * subscription, so nobody without the server's secret can compute a number,
 * and guessing one takes 2^60 tries: whoever gives it holds the contract's
 * papers.
 */
export const referenceFrom = (bytes: Uint8Array): string => {
  let bits = 0n;

  for (const byte of bytes.slice(0, 8)) {
    bits = bits * 256n + BigInt(byte);
  }

  // The 60 bits that lead the first 8 bytes.
  bits /= 16n;

  let characters = "";

  for (let index = 0; index < length; index += 1) {
    const shift = BigInt((length - 1 - index) * bitsPerCharacter);

    characters += alphabet[Number((bits / 2n ** shift) % 32n)] ?? "0";
  }

  return grouped(characters);
};

/**
 * The contract number someone typed, as `referenceFrom` writes it: without
 * regard to case, spaces or dashes, and with the letters I, L and O read as
 * the digits they pass for. None when it is no contract number.
 */
export const readReference = (typed: string): Option.Option<string> => {
  const characters = typed
    .toUpperCase()
    .replaceAll(/[\s-]/gu, "")
    .split("")
    .map((character) => mistaken.get(character) ?? character);

  return characters.length === length &&
    characters.every((character) => alphabet.includes(character))
    ? Option.some(grouped(characters.join("")))
    : Option.none();
};

/**
 * Whether two contract numbers are the same, in a time that does not tell
 * how much of one matches the other.
 */
export const sameReference = (one: string, other: string): boolean => {
  let difference = one.length === other.length ? 0 : 1;

  for (let index = 0; index < one.length; index += 1) {
    difference += one.codePointAt(index) === other.codePointAt(index) ? 0 : 1;
  }

  return difference === 0;
};
