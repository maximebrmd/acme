import { Context } from "effect";
import type { Effect } from "effect";

/** A new link's token, and the hash it is found by. */
export interface IssuedToken {
  readonly hash: string;
  /** Shown once, to whoever made the link: never stored or logged. */
  readonly token: string;
}

/**
 * The tokens review links are opened with: 256 random bits each, of which
 * only the SHA-256 is kept.
 */
export class LinkTokens extends Context.Service<
  LinkTokens,
  {
    readonly issue: Effect.Effect<IssuedToken>;
    /** The hash a token is stored under. */
    readonly hashOf: (token: string) => Effect.Effect<string>;
  }
>()("peal-server/review/application/LinkTokens") {}
