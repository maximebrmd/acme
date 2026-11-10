import { Context } from "effect";
import type { Effect } from "effect";

import type { Comment } from "#engagement/domain/comment.ts";
import type { Reply } from "#engagement/domain/reply.ts";
import type { Thread } from "#engagement/domain/thread.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Tells the workspace what happened in its threads: its members through
 * notices, its endpoints through webhooks. Each is told in the transaction
 * that records the fact, once.
 */
export class EngagementOutcomes extends Context.Service<
  EngagementOutcomes,
  {
    /** Comments were read for the first time under the thread's post. */
    readonly received: (
      thread: Thread,
      comments: readonly Comment[]
    ) => Effect.Effect<void, DatabaseError>;
    /** A reply ended: sent, failed or unconfirmed. */
    readonly replied: (
      thread: Thread,
      reply: Reply
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/engagement/application/EngagementOutcomes") {}
