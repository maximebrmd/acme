import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * How many requests each credential sent in each window. A credential is
 * named by a digest, never by its id: the counts name nobody.
 */
export class RequestCounts extends Context.Service<
  RequestCounts,
  {
    /**
     * Counts one more request for the subject in the window, in one
     * statement, so requests sent together are each counted: the count
     * with this one.
     */
    readonly count: (
      subjectDigest: string,
      window: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /** Deletes the counts of windows that started before `before`. */
    readonly purge: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/activity/application/RequestCounts") {}
