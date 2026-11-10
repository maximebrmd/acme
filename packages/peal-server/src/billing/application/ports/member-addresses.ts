import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * The email address of a member who manages a workspace's billing, as
 * their account has it: a trial is one per address, an account closed
 * with it included. None for someone who does not manage its billing.
 */
export class MemberAddresses extends Context.Service<
  MemberAddresses,
  {
    readonly of: (
      userId: UserId,
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<string>, DatabaseError>;
  }
>()("peal-server/billing/application/MemberAddresses") {}
