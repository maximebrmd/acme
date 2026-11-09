import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import {
  DataDeletion,
  platformsSignedInWith,
} from "#channels/domain/data-deletion.ts";
import type { MetaAppKind } from "#channels/domain/data-deletion.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids } from "#shared/application/ids.ts";

import { DataDeletionLinks } from "./data-deletion-links.ts";
import { DataDeletions } from "./data-deletions.ts";
import type { InvalidSignedRequest } from "./invalid-signed-request.ts";
import type { MetaAppNotConfigured } from "./meta-app-not-configured.ts";
import { SignedRequests } from "./signed-requests.ts";

const isCode = Schema.is(DataDeletion.fields.code);

/** A request carried out, and where its status shows. */
export interface DeletionReceipt {
  readonly deletion: DataDeletion;
  readonly statusUrl: string;
}

/**
 * Meta's data deletion callbacks: when one of its users asks, through
 * Facebook or Threads, for the data Acme holds about them to be deleted,
 * Meta sends a request signed with the app's secret. Acme deletes the
 * channels that user connected, in every workspace, with their tokens, and
 * answers with a confirmation code whose status anyone holding it can read.
 *
 * Nobody signs in for these: the signature is the authorization.
 */
export class DeletePlatformUserData extends Context.Service<
  DeletePlatformUserData,
  {
    readonly request: (
      app: MetaAppKind,
      signedRequest: string
    ) => Effect.Effect<
      DeletionReceipt,
      DatabaseError | InvalidSignedRequest | MetaAppNotConfigured
    >;
    /** The request with this confirmation code, if there was one. */
    readonly status: (
      code: string
    ) => Effect.Effect<Option.Option<DataDeletion>, DatabaseError>;
  }
>()("acme-server/channels/application/DeletePlatformUserData") {
  static readonly layer = Layer.effect(
    DeletePlatformUserData,
    Effect.gen(function* DeletePlatformUserDataLive() {
      const signed = yield* SignedRequests;
      const deletions = yield* DataDeletions;
      const ids = yield* Ids;
      const links = yield* DataDeletionLinks;

      const request = Effect.fn("DeletePlatformUserData.request")(
        function* request(app: MetaAppKind, signedRequest: string) {
          const { userId } = yield* signed.verify(app, signedRequest);

          // An id without its dashes: Meta asks for an alphanumeric code.
          const code = (yield* ids.next).replaceAll("-", "");

          const deletion = yield* deletions.erase({
            app,
            code,
            now: yield* DateTime.now,
            platforms: platformsSignedInWith(app),
            signedRequest,
            userId,
          });

          const receipt: DeletionReceipt = {
            deletion,
            statusUrl: links.statusUrl(deletion.code),
          };

          return receipt;
        }
      );

      const status = (code: string) =>
        isCode(code)
          ? deletions.find(code)
          : Effect.succeed(Option.none<DataDeletion>());

      return DeletePlatformUserData.of({
        request,
        status: (code) =>
          status(code).pipe(Effect.withSpan("DeletePlatformUserData.status")),
      });
    })
  );
}
