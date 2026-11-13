import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { UserId } from "#shared/domain/ids.ts";

/** Whom an unsubscribe token is for, and which generation of their links. */
export interface DigestLinkHolder {
  readonly links: number;
  readonly userId: UserId;
}

/**
 * The weekly digest's one-click unsubscribe tokens (RFC 8058): signed with
 * the server's secret for one user and one generation of their links. They
 * never expire; turning the digest on again moves the generation, which
 * revokes every token sent before.
 */
export class DigestLinks extends Context.Service<
  DigestLinks,
  {
    readonly tokenOf: (userId: UserId, links: number) => Effect.Effect<string>;
    /** The holder a token was signed for; none for any other string. */
    readonly read: (
      token: string
    ) => Effect.Effect<Option.Option<DigestLinkHolder>>;
  }
>()("peal-server/notifications/application/DigestLinks") {}
