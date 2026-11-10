import { Context } from "effect";
import type { Effect } from "effect";

/**
 * The tokens of the links sent to a request's address: random, and kept
 * only as their digest, so whoever reads the database follows no link.
 */
export class RequestTokens extends Context.Service<
  RequestTokens,
  {
    /** The digest a token is kept as. */
    readonly digestOf: (token: string) => Effect.Effect<string>;
    /** A new token, with its digest. */
    readonly issue: Effect.Effect<{
      readonly digest: string;
      readonly token: string;
    }>;
  }
>()("peal-server/billing/application/RequestTokens") {}
