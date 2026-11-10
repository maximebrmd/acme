import { Context } from "effect";
import type { Effect } from "effect";

import type { SignatureId } from "#publishing/domain/signature-id.ts";
import type { Signature } from "#publishing/domain/signature.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A workspace's signatures, as they are kept. */
export class SignatureStore extends Context.Service<
  SignatureStore,
  {
    /**
     * Holds back, until the transaction it runs in ends, any other
     * transaction that claims the workspace's signatures: reading them,
     * then writing one, takes turns.
     */
    readonly claim: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** The workspace's signatures, oldest first. */
    readonly list: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly Signature[], DatabaseError>;
    readonly insert: (
      signature: Signature
    ) => Effect.Effect<void, DatabaseError>;
    /** Writes what a member writes of the signature. */
    readonly update: (
      signature: Signature
    ) => Effect.Effect<void, DatabaseError>;
    readonly remove: (
      workspaceId: WorkspaceId,
      signatureId: SignatureId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/SignatureStore") {}
