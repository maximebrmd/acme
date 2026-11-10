import { Context } from "effect";
import type { Effect, Redacted } from "effect";

/** A new secret, with what is kept of it. */
export interface IssuedLinkSecret {
  readonly digest: string;
  readonly secret: Redacted.Redacted;
}

/**
 * The secrets of connect links: the token in a link's address, and the
 * nonce the browser that starts its sign-in keeps in a cookie. Random, and
 * kept only as their digest, so whoever reads the database opens no link.
 */
export class ConnectLinkTokens extends Context.Service<
  ConnectLinkTokens,
  {
    /** The digest a secret is kept as. */
    readonly digestOf: (secret: Redacted.Redacted) => Effect.Effect<string>;
    readonly issue: Effect.Effect<IssuedLinkSecret>;
  }
>()("peal-server/channels/application/ConnectLinkTokens") {}
