import { Context } from "effect";
import type { Effect, Redacted } from "effect";

import type { AdSignInFailed } from "#ads/application/ad-sign-in-failed.ts";
import type { SealedToken } from "#ads/application/ports/grant-store.ts";
import type { AdGrantId } from "#ads/domain/ids.ts";

/**
 * Seals and opens a grant's token: encrypted at rest with the server's
 * keyring, and bound to the grant, so a token moved to another row opens
 * nothing. A server without a key seals none (`notConfigured`), and a token
 * that no longer opens (its key left the keyring) reads as none.
 */
export class GrantSecrets extends Context.Service<
  GrantSecrets,
  {
    /**
     * A new state for a sign-in, which the network sends back: random, and
     * kept only as its hash.
     */
    readonly newState: Effect.Effect<{
      readonly hash: string;
      readonly state: string;
    }>;
    /** The hash a state is kept under. */
    readonly hashOf: (state: string) => Effect.Effect<string>;
    readonly seal: (
      token: Redacted.Redacted,
      grantId: AdGrantId
    ) => Effect.Effect<SealedToken, AdSignInFailed>;
    readonly open: (
      sealed: SealedToken,
      grantId: AdGrantId
    ) => Effect.Effect<Redacted.Redacted, { readonly _tag: "Unopenable" }>;
  }
>()("peal-server/ads/application/GrantSecrets") {}
