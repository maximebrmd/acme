import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

import { ConnectLinks } from "./connect-links.ts";

/**
 * The end of the time connect links are kept once they are over: the
 * daily run that forgets them.
 */
export class PurgeConnectLinks extends Context.Service<
  PurgeConnectLinks,
  { readonly run: Effect.Effect<number, DatabaseError> }
>()("peal-server/channels/application/PurgeConnectLinks") {
  static readonly layer = Layer.effect(
    PurgeConnectLinks,
    Effect.gen(function* PurgeConnectLinksLive() {
      const links = yield* ConnectLinks;

      return PurgeConnectLinks.of({ run: links.purge });
    })
  );
}
