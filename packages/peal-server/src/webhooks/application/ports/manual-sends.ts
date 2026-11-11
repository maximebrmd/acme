import { Context } from "effect";
import type { DateTime, Duration, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { ManualSendKind } from "#webhooks/domain/delivery-policy.ts";

/** Whether the sends were taken, or why not and until when. */
export type SendAllowance =
  | { readonly _tag: "taken" }
  | {
      readonly _tag: "refused";
      /** How many of the kind a workspace may send in an hour. */
      readonly allowed: number;
      /** How long until the hour that refused them ends. */
      readonly retryAfter: Duration.Duration;
    };

/**
 * The deliveries a workspace's members start by hand: test events and
 * deliveries sent again one by one (`single`, `manualSendsPerHour`), and
 * deliveries sent again by the many (`bulk`, `bulkRedeliveriesPerHour`).
 * Each is a request, and up to eight, from Peal's address to a host they
 * chose, so a workspace gets so many an hour, counted for every server at
 * once. A count that cannot be kept refuses the send: one is rare and
 * never urgent.
 */
export class ManualSends extends Context.Service<
  ManualSends,
  {
    /**
     * Takes `count` of the workspace's sends of the kind this hour, all or
     * none: refused when fewer are left.
     */
    readonly take: (
      workspaceId: WorkspaceId,
      kind: ManualSendKind,
      count: number
    ) => Effect.Effect<SendAllowance, DatabaseError>;
    /** Forgets the hours that ended before `before`, and says how many. */
    readonly purge: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/webhooks/application/ManualSends") {}
