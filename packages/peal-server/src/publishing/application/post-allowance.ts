import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * How many posts a workspace may have going out in a calendar month (UTC):
 * its plan's allowance, from the billing context, or no limit on a server
 * that does not bill.
 */
export class PostAllowance extends Context.Service<
  PostAllowance,
  {
    readonly scheduledPerMonth: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Allowance, DatabaseError>;
  }
>()("acme-server/publishing/application/PostAllowance") {}
