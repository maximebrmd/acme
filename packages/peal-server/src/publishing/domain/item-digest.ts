import { Schema } from "effect";

/** An item's identity, as Peal keeps it: the SHA-256 of it, in hex. */
export const ItemDigestSchema = Schema.String.check(
  Schema.isPattern(/^[0-9a-f]{64}$/u)
).pipe(Schema.brand("ItemDigest"));

export type ItemDigest = typeof ItemDigestSchema.Type;
