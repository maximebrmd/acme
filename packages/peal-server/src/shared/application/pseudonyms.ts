import { Context } from "effect";
import type { Effect } from "effect";

/**
 * Keyed pseudonyms of what identifies a person, for the records kept once
 * their account closes, and for counts kept by person that must not name
 * them: the same email address, whatever its case, or the same member of a
 * platform gives the same pseudonym on this server, and nobody without the
 * server's secret can tell whose it is, nor compute it for an address or a
 * member.
 */
export class Pseudonyms extends Context.Service<
  Pseudonyms,
  {
    readonly ofEmail: (email: string) => Effect.Effect<string>;
    /** A platform's member, by the identifier the platform gives them. */
    readonly ofPlatformMember: (
      platform: string,
      memberId: string
    ) => Effect.Effect<string>;
  }
>()("peal-server/shared/application/Pseudonyms") {}
