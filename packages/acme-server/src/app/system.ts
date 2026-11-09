import { Api, DatabaseUnavailable } from "acme-contract";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { makeDatabasePing } from "#app/database-ping.ts";

export const SystemHandlers = HttpApiBuilder.group(
  Api,
  "system",
  Effect.fn(function* systemHandlers(handlers) {
    const pingDatabase = yield* makeDatabasePing;

    return handlers.handleAll({
      health: () => Effect.void,
      ready: () =>
        pingDatabase.pipe(
          Effect.tapError((failure) =>
            Effect.logWarning("The database is unreachable", failure)
          ),
          Effect.mapError(() => new DatabaseUnavailable())
        ),
    });
  })
);
