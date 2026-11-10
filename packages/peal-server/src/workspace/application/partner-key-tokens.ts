import { Context } from "effect";
import type { Effect, Redacted } from "effect";

/** A new partner key, with what is kept of it. */
export interface IssuedPartnerKey {
  /** What the key is kept as. */
  readonly digest: string;
  /** Its first characters, to tell keys apart. */
  readonly start: string;
  readonly token: Redacted.Redacted;
}

/**
 * The partner keys themselves: random, and kept only as their digest, so
 * whoever reads the database holds no key.
 */
export class PartnerKeyTokens extends Context.Service<
  PartnerKeyTokens,
  {
    /** The digest a key is kept as. */
    readonly digestOf: (token: Redacted.Redacted) => Effect.Effect<string>;
    readonly issue: Effect.Effect<IssuedPartnerKey>;
  }
>()("peal-server/workspace/application/PartnerKeyTokens") {}
