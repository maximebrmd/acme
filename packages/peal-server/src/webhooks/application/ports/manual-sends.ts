import { Context } from "effect";
import type { Effect } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * The deliveries a workspace's members start by hand: test events, and
 * deliveries sent again. Each is a request, and up to eight, from Peal's
 * address to a host they chose, so a workspace gets so many an hour
 * (`manualSendsPerHour`).
 */
export class ManualSends extends Context.Service<
  ManualSends,
  {
    /** Takes one of the workspace's sends of this hour: false when none is left. */
    readonly take: (workspaceId: WorkspaceId) => Effect.Effect<boolean>;
  }
>()("peal-server/webhooks/application/ManualSends") {}
