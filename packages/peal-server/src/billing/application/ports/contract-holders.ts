import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** An account, and the workspaces whose billing it manages. */
export interface ContractHolder {
  readonly userId: UserId;
  readonly workspaces: readonly {
    readonly id: WorkspaceId;
    readonly name: string;
  }[];
}

/**
 * Who manages which workspaces' billing: the account an email address
 * signs in to, or one by its id, for requests that come without a session.
 */
export class ContractHolders extends Context.Service<
  ContractHolders,
  {
    readonly byEmail: (
      email: string
    ) => Effect.Effect<Option.Option<ContractHolder>, DatabaseError>;
    readonly byId: (
      userId: UserId
    ) => Effect.Effect<Option.Option<ContractHolder>, DatabaseError>;
  }
>()("peal-server/billing/application/ContractHolders") {}
