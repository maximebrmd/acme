import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * The contract numbers given to the members who manage a subscription's
 * billing, in its confirmation: whoever gives one holds the contract's
 * papers, and may cancel it or withdraw from it without signing in.
 */
export class ContractReferences extends Context.Service<
  ContractReferences,
  {
    /** The subscription a contract number names, if any. */
    readonly find: (
      reference: string
    ) => Effect.Effect<Option.Option<string>, DatabaseError>;
    /**
     * The subscription's contract number: always the same, and kept so
     * `find` knows it.
     */
    readonly issue: (
      stripeSubscriptionId: string
    ) => Effect.Effect<string, DatabaseError>;
  }
>()("peal-server/billing/application/ContractReferences") {}
