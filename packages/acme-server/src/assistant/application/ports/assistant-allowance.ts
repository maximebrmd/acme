import { Context } from "effect";
import type { Effect } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * How many requests a workspace may send the assistant each day. The
 * server's setting gives every workspace the same allowance; billing will
 * give each the allowance of its plan, behind this same port.
 */
export class AssistantAllowance extends Context.Service<
  AssistantAllowance,
  {
    readonly dailyRequests: (workspaceId: WorkspaceId) => Effect.Effect<number>;
  }
>()("acme-server/assistant/application/AssistantAllowance") {}
