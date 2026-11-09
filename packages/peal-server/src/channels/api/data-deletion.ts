import {
  Api,
  DataDeletionNotFound,
  MetaAppNotConfigured,
  SignedRequestRefused,
} from "acme-contract";
import { Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { DeletePlatformUserData } from "#channels/application/delete-platform-user-data.ts";

/**
 * Meta's data deletion callbacks and their status page, which nobody signs
 * in for: a request's signature, checked against the app's secret, is its
 * authority, and a status names nobody.
 */
export const DataDeletionHandlers = HttpApiBuilder.group(
  Api,
  "dataDeletion",
  Effect.fn(function* dataDeletionHandlers(handlers) {
    const deletions = yield* DeletePlatformUserData;

    return handlers.handleAll({
      request: ({ params, payload }) =>
        deletions.request(params.app, payload.signed_request).pipe(
          Effect.map(({ deletion, statusUrl }) => ({
            confirmation_code: deletion.code,
            url: statusUrl,
          })),
          Effect.catchTags({
            DatabaseError: Effect.die,
            InvalidSignedRequest: ({ reason }) =>
              Effect.logWarning("A data deletion request was refused").pipe(
                Effect.annotateLogs({ app: params.app, reason }),
                Effect.andThen(Effect.fail(new SignedRequestRefused()))
              ),
            MetaAppNotConfigured: () => Effect.fail(new MetaAppNotConfigured()),
          })
        ),
      status: ({ params }) =>
        deletions.status(params.code).pipe(
          Effect.catchTag("DatabaseError", Effect.die),
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new DataDeletionNotFound()),
              onSome: (deletion) =>
                Effect.succeed({
                  app: deletion.app,
                  channelsDeleted: deletion.channelsDeleted,
                  completedAt: deletion.completedAt,
                  confirmationCode: deletion.code,
                  requestedAt: deletion.requestedAt,
                  status: "completed" as const,
                }),
            })
          )
        ),
    });
  })
);
