import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WebhookRecord } from "#shared/application/personal-data.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * A workspace's webhooks as a whole, for the workspace context when a
 * workspace's data is exported or erased. Erasing runs in the caller's
 * transaction, if any. Nothing here names a user.
 */
export class WebhookRecords extends Context.Service<
  WebhookRecords,
  {
    /** The workspace's endpoints, oldest first, without their secrets. */
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly WebhookRecord[], DatabaseError>;
    /**
     * Deletes the workspace's endpoints, their encrypted secrets, their
     * deliveries and the events kept for them: nothing more is sent, and
     * a delivery's job that wakes finds nothing to send.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/webhooks/application/WebhookRecords") {}
