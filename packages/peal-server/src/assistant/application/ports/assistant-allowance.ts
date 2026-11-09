import { Context } from "effect";
import type { Effect } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * How many requests a workspace may send the assistant each day: its
 * plan's allowance on a server that bills, otherwise the server's setting,
 * the same for every workspace.
 */
export class AssistantAllowance extends Context.Service<
  AssistantAllowance,
  {
    readonly dailyRequests: (workspaceId: WorkspaceId) => Effect.Effect<number>;
  }
>()("peal-server/assistant/application/AssistantAllowance") {}
