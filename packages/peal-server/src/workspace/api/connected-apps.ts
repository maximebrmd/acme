import {
  Api,
  ConnectedAppNotFound,
  CurrentPrincipal,
  Forbidden,
} from "peal-contract";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { ConnectedApps } from "#workspace/application/connected-apps.ts";

import { userPrincipalOf } from "./principal.ts";

const forbidden = () => Effect.fail(new Forbidden());

/** The signed-in user, who must be a person: an API key is nobody. */
export const currentUser = Effect.gen(function* currentUser() {
  const principal = yield* CurrentPrincipal;

  return principal._tag === "user"
    ? userPrincipalOf(principal)
    : yield* new Forbidden();
});

export const ConnectedAppsHandlers = HttpApiBuilder.group(
  Api,
  "connectedApps",
  Effect.fn(function* connectedAppsHandlers(handlers) {
    const apps = yield* ConnectedApps;

    return handlers.handleAll({
      list: () =>
        Effect.gen(function* list() {
          return yield* apps.list(yield* currentUser).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              SessionRequired: forbidden,
            })
          );
        }),
      revoke: ({ params }) =>
        Effect.gen(function* revoke() {
          yield* apps.revoke(yield* currentUser, params.clientId).pipe(
            Effect.catchTags({
              ConnectedAppNotFound: () =>
                Effect.fail(new ConnectedAppNotFound()),
              DatabaseError: Effect.die,
              SessionRequired: forbidden,
            })
          );
        }),
    });
  })
);
