import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A workspace's subscription, as a contract number names it. */
export interface NamedContract {
  readonly stripeSubscriptionId: string;
  readonly workspaceId: WorkspaceId;
}

/**
 * The contract numbers given to the members who manage a subscription's
 * billing, in its confirmation: whoever gives one holds the contract's
 * papers, and may cancel it or withdraw from it without signing in.
 */
export class ContractReferences extends Context.Service<
  ContractReferences,
  {
    /** Deletes the workspace's numbers, in the caller's transaction. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** The subscription a contract number names, if any. */
    readonly find: (
      reference: string
    ) => Effect.Effect<Option.Option<NamedContract>, DatabaseError>;
    /**
     * The subscription's contract number: always the same, and kept so
     * `find` knows it.
     */
    readonly issue: (
      contract: NamedContract
    ) => Effect.Effect<string, DatabaseError>;
  }
>()("peal-server/billing/application/ContractReferences") {}
