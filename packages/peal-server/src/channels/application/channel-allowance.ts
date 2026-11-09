import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * How many channels a workspace may connect: its plan's allowance, from the
 * billing context, or no limit on a server that does not bill.
 */
export class ChannelAllowance extends Context.Service<
  ChannelAllowance,
  {
    readonly channels: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Allowance, DatabaseError>;
  }
>()("acme-server/channels/application/ChannelAllowance") {}
