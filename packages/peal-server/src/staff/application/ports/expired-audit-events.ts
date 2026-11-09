import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { AuditCutoffs } from "#staff/domain/audit-retention.ts";

/** The audit log's events past their retention (`isExpired`). */
export class ExpiredAuditEvents extends Context.Service<
  ExpiredAuditEvents,
  {
    /**
     * Deletes up to `limit` events expired at `cutoffs`, and says how
     * many it deleted.
     */
    readonly deleteBatch: (
      cutoffs: AuditCutoffs,
      limit: number
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/staff/application/ExpiredAuditEvents") {}
