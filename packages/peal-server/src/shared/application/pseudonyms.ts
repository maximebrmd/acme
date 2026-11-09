import { Context } from "effect";
import type { Effect } from "effect";

/**
 * Keyed pseudonyms of what identifies a person, for the records kept once
 * their account closes: the same email address, whatever its case, gives
 * the same pseudonym on this server, and nobody without the server's secret
 * can tell whose it is, nor compute it for an address.
 */
export class Pseudonyms extends Context.Service<
  Pseudonyms,
  { readonly ofEmail: (email: string) => Effect.Effect<string> }
>()("peal-server/shared/application/Pseudonyms") {}
