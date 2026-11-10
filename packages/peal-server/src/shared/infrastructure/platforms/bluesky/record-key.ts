import { DateTime } from "effect";

// AT Protocol record keys for posts are TIDs: 13 characters of base32
// ("sortable" alphabet), the first 11 encoding microseconds since the epoch
// and the last 2 a clock id below 1024.
const alphabet = "234567abcdefghijklmnopqrstuvwxyz";

const base32 = (value: number, length: number): string => {
  let remaining = value;
  let encoded = "";

  while (remaining > 0) {
    encoded = `${alphabet.charAt(remaining % 32)}${encoded}`;
    remaining = Math.floor(remaining / 32);
  }

  return encoded.padStart(length, alphabet.charAt(0));
};

// The largest prime below 2^32: hashes stay exact in a double.
const modulus = 4_294_967_291;

// A polynomial hash over the key's code points. Idempotency keys are
// already hashes, so this only folds them into a number.
const hashOf = (text: string): number => {
  let hash = 0;

  for (const character of text) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % modulus;
  }

  return hash;
};

/**
 * The record key of an attempt's post, chosen before it is sent, so the
 * post can be read back by it, and a second create with it is refused: a
 * TID whose time is the attempt's start, in milliseconds, with microseconds
 * and a clock id drawn from the attempt's idempotency key. Every run of the
 * attempt computes the same key, and two attempts in the same millisecond
 * almost never share one.
 */
export const recordKeyOf = (
  startedAt: DateTime.Utc,
  idempotencyKey: string
): string => {
  const hash = hashOf(idempotencyKey);

  const micros = DateTime.toEpochMillis(startedAt) * 1000 + (hash % 1000);
  const clockId = Math.floor(hash / 1000) % 1024;

  return `${base32(micros, 11)}${base32(clockId, 2)}`;
};
