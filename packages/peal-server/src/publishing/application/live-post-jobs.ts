import { Context } from "effect";
import type { Effect } from "effect";

import type { LivePostChangeId } from "#publishing/domain/live-post-change-id.ts";

/**
 * The durable jobs that carry changes of live posts out. A start, and a
 * stop, are part of the caller's transaction: a change exists exactly
 * when its job does.
 */
export class LivePostJobs extends Context.Service<
  LivePostJobs,
  {
    readonly start: (changeId: LivePostChangeId) => Effect.Effect<void>;
    readonly stop: (changeId: LivePostChangeId) => Effect.Effect<void>;
  }
>()("peal-server/publishing/application/LivePostJobs") {}
