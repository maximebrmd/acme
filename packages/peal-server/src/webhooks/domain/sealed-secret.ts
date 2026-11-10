import { Schema } from "effect";

/**
 * An endpoint's signing secret as stored: encrypted, and bound to its
 * endpoint, so a copy moved to another endpoint's row does not decrypt.
 */
export const SealedSecretSchema = Schema.NonEmptyString.pipe(
  Schema.brand("SealedSecret")
);

export type SealedSecret = typeof SealedSecretSchema.Type;
