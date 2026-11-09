import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * The events already notified, by key, so each notifies once however often
 * it is seen: by a job run again, or by the daily check.
 */
export class NoticeLog extends Context.Service<
  NoticeLog,
  {
    /**
     * Records the key, and says whether it was new: only then notify. In a
     * transaction that rolls back, the key is forgotten with the rest.
     */
    readonly claim: (
      key: string,
      at: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
    /** Whether an event with the key was notified, and committed. */
    readonly isClaimed: (key: string) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/notifications/application/NoticeLog") {}
