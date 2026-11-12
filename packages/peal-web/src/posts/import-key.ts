// The idempotency key an import is sent under. `crypto.randomUUID` exists
// in secure contexts only: a server opened over plain HTTP at another
// address than localhost has `getRandomValues` alone, from which a version
// 4 UUID is made as RFC 9562 lays it out.

/** What the key is made with: the browser's `crypto`. */
export interface KeySource {
  readonly getRandomValues: (array: Uint8Array) => Uint8Array;
  readonly randomUUID?: () => string;
}

const hex = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

export const newImportKey = (source: KeySource): string => {
  if (source.randomUUID !== undefined) {
    return source.randomUUID();
  }

  const bytes = source.getRandomValues(new Uint8Array(16));

  // The version (4) in the high half of byte 6, the variant (10) in the
  // top two bits of byte 8.
  bytes[6] = ((bytes[6] ?? 0) % 16) + 0x40;
  bytes[8] = ((bytes[8] ?? 0) % 64) + 0x80;

  const digits = hex(bytes);

  return [
    digits.slice(0, 8),
    digits.slice(8, 12),
    digits.slice(12, 16),
    digits.slice(16, 20),
    digits.slice(20),
  ].join("-");
};
