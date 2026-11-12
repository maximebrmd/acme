import { Option, Schema } from "effect";

/** How many characters a short link's code has. */
export const codeLength = 7;

/** The characters a code is made of: digits, then ASCII letters. */
export const codeAlphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * A short link's code: `codeLength` characters of `codeAlphabet`, about 41
 * bits. Not a secret: it is in every post that holds it.
 */
export const ShortCodeSchema = Schema.String.check(
  Schema.isPattern(new RegExp(`^[0-9A-Za-z]{${codeLength}}$`, "u"))
).pipe(Schema.brand("ShortCode"));

export type ShortCode = typeof ShortCodeSchema.Type;

// The largest multiple of the alphabet's size a byte holds: a byte above
// it is skipped, so every character is as likely as the others.
const fairBytes = Math.floor(256 / codeAlphabet.length) * codeAlphabet.length;

/**
 * The code random bytes make, one character a byte, skipping bytes that
 * would favour the first characters; none when too few were fair.
 */
export const codeOf = (bytes: Uint8Array): Option.Option<ShortCode> => {
  const characters = [...bytes]
    .filter((byte) => byte < fairBytes)
    .slice(0, codeLength)
    .map((byte) => codeAlphabet.charAt(byte % codeAlphabet.length));

  return characters.length === codeLength
    ? Option.some(ShortCodeSchema.make(characters.join("")))
    : Option.none();
};
