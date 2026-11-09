import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * The notices already sent, by key, so each goes out once however often the
 * event that causes it is seen.
 */
export class NoticeLog extends Context.Service<
  NoticeLog,
  {
    /** Records the key, and says whether it was new: only then send it. */
    readonly claim: (
      key: string,
      at: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
    /** Forgets a key whose notice could not be sent, so it can be again. */
    readonly release: (key: string) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/notifications/application/NoticeLog") {}
