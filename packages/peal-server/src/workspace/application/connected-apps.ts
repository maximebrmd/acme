import { Context, DateTime, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import {
  ownSession,
  ownSessionOrCommandLine,
} from "#workspace/domain/own-session.ts";
import type { SessionRequired } from "#workspace/domain/session-required.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { ConnectedAppNotFound } from "./connected-app-not-found.ts";
import { ConnectedAppStore } from "./connected-app-store.ts";
import type { ConnectedAppRecord } from "./connected-app-store.ts";

/**
 * The OAuth clients that act for the user, which only they see, in person or
 * from Peal's command line, and only they revoke, in person: a client could
 * otherwise revoke the others, or itself be kept from being revoked.
 */
export class ConnectedApps extends Context.Service<
  ConnectedApps,
  {
    readonly list: (
      principal: UserPrincipal
    ) => Effect.Effect<
      readonly ConnectedAppRecord[],
      DatabaseError | SessionRequired
    >;
    readonly revoke: (
      principal: UserPrincipal,
      clientId: string
    ) => Effect.Effect<
      void,
      ConnectedAppNotFound | DatabaseError | SessionRequired
    >;
  }
>()("peal-server/workspace/application/ConnectedApps") {
  static readonly layer = Layer.effect(
    ConnectedApps,
    Effect.gen(function* ConnectedAppsLive() {
      const store = yield* ConnectedAppStore;

      const list = Effect.fn("ConnectedApps.list")(function* list(
        principal: UserPrincipal
      ) {
        const userId = yield* Effect.fromResult(
          ownSessionOrCommandLine(principal)
        );

        return yield* store.list(userId, yield* DateTime.now);
      });

      const revoke = Effect.fn("ConnectedApps.revoke")(function* revoke(
        principal: UserPrincipal,
        clientId: string
      ) {
        const userId = yield* Effect.fromResult(ownSession(principal));

        const revoked = yield* store.revoke(
          userId,
          clientId,
          yield* DateTime.now
        );

        yield* revoked
          ? Effect.void
          : Effect.fail(new ConnectedAppNotFound({ clientId }));
      });

      return ConnectedApps.of({ list, revoke });
    })
  );
}
