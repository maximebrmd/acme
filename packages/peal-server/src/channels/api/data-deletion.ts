import { Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  DataDeletionNotFound,
  MetaAppNotConfigured,
  SignedRequestRefused,
} from "peal-contract";

import { DeauthorizePlatformUser } from "#channels/application/deauthorize-platform-user.ts";
import { DeletePlatformUserData } from "#channels/application/delete-platform-user-data.ts";

// A refused signed request is logged with its reason, never its content.
const refusedRequest =
  (app: string) =>
  ({ reason }: { readonly reason: string }) =>
    Effect.logWarning("A signed request from Meta was refused").pipe(
      Effect.annotateLogs({ app, reason }),
      Effect.andThen(Effect.fail(new SignedRequestRefused()))
    );

/**
 * Meta's data deletion and deauthorization callbacks and the deletions'
 * status page, which nobody signs in for: a request's signature, checked
 * against the app's secret, is its authority, and a status names nobody.
 */
export const DataDeletionHandlers = HttpApiBuilder.group(
  Api,
  "dataDeletion",
  Effect.fn(function* dataDeletionHandlers(handlers) {
    const deletions = yield* DeletePlatformUserData;
    const deauthorizations = yield* DeauthorizePlatformUser;

    return handlers.handleAll({
      deauthorize: ({ params, payload }) =>
        deauthorizations.deauthorize(params.app, payload.signed_request).pipe(
          Effect.tap((marked) =>
            Effect.logInfo("A Meta user removed Peal").pipe(
              Effect.annotateLogs({ app: params.app, marked })
            )
          ),
          Effect.asVoid,
          Effect.catchTags({
            DatabaseError: Effect.die,
            InvalidSignedRequest: refusedRequest(params.app),
            MetaAppNotConfigured: () => Effect.fail(new MetaAppNotConfigured()),
          })
        ),
      request: ({ params, payload }) =>
        deletions.request(params.app, payload.signed_request).pipe(
          Effect.map(({ deletion, statusUrl }) => ({
            confirmation_code: deletion.code,
            url: statusUrl,
          })),
          Effect.catchTags({
            DatabaseError: Effect.die,
            InvalidSignedRequest: refusedRequest(params.app),
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
