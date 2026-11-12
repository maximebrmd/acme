import { createHmac } from "node:crypto";

// What an authenticator app computes from the key a page shows: a time-based
// code (RFC 6238, as the server's library makes them: HMAC-SHA-1, 30-second
// periods, six digits), from the key in Base32 (RFC 4648). The key is the
// one the run's server made for the run's account: none is written here.

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const bytesOf = (key: string): Buffer => {
  const bits = key
    .replaceAll("=", "")
    .toUpperCase()
    .split("")
    .map((letter) => alphabet.indexOf(letter).toString(2).padStart(5, "0"))
    .join("");

  return Buffer.from(
    Array.from({ length: Math.floor(bits.length / 8) }, (_, index) =>
      Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2)
    )
  );
};

/** The code an authenticator app shows now for this key. */
export const codeOf = (key: string, at: number = Date.now()): string => {
  const counter = Buffer.alloc(8);

  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));

  const digest = createHmac("sha1", bytesOf(key)).update(counter).digest();
  // The low four bits of the last byte, and the 31 bits read from there.
  const offset = (digest.at(-1) ?? 0) % 16;
  const value = digest.readUInt32BE(offset) % 2 ** 31;

  return String(value % 1_000_000).padStart(6, "0");
};
