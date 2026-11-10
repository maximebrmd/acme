import { Context } from "effect";
import type { Effect } from "effect";

import type { ReplyId } from "#engagement/domain/reply-id.ts";

/**
 * Starts the durable job that sends a reply. Inside a TransactionRunner
 * transaction the start commits, or rolls back, with the reply's journal
 * row, and the job runs after the commit.
 */
export class ReplyJobs extends Context.Service<
  ReplyJobs,
  {
    readonly start: (replyId: ReplyId) => Effect.Effect<void>;
  }
>()("peal-server/engagement/application/ReplyJobs") {}
