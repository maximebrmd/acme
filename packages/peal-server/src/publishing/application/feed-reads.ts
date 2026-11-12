import { Context } from "effect";
import type { DateTime, Duration, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** Whether a read was taken, or how long until the next one is. */
export type FeedReadAllowance =
  | { readonly _tag: "taken" }
  | { readonly _tag: "refused"; readonly retryAfter: Duration.Duration };

/**
 * The reads of addresses members give a workspace makes an hour (a feed
 * added, moved or resumed, a preview), counted for every server: each is
 * a request to a host a member chose.
 */
export class FeedReads extends Context.Service<
  FeedReads,
  {
    /** Takes one of the hour's reads, or says when the next is free. */
    readonly take: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<FeedReadAllowance, DatabaseError>;
    /** Forgets the hours that ended before `before`; says how many. */
    readonly purge: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/publishing/application/FeedReads") {}
