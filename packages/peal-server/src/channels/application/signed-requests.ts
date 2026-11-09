import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { MetaAppKind } from "#channels/domain/data-deletion.ts";

import type { InvalidSignedRequest } from "./invalid-signed-request.ts";
import type { MetaAppNotConfigured } from "./meta-app-not-configured.ts";

/** What a signed request Meta sent says, once its signature checks out. */
export interface SignedRequest {
  /** When Meta made the request, if it said. */
  readonly issuedAt: Option.Option<DateTime.Utc>;
  /** The app-scoped id of the user the request is about. */
  readonly userId: string;
}

/**
 * Reads the signed requests Meta sends to Peal's callbacks, checking each
 * against the secret of the app it came through.
 */
export class SignedRequests extends Context.Service<
  SignedRequests,
  {
    readonly verify: (
      app: MetaAppKind,
      signedRequest: string
    ) => Effect.Effect<
      SignedRequest,
      InvalidSignedRequest | MetaAppNotConfigured
    >;
  }
>()("peal-server/channels/application/SignedRequests") {}
