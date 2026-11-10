import { Context } from "effect";
import type { Effect } from "effect";

import type { AdAccount } from "#ads/domain/ad-account.ts";
import type { AdGrant } from "#ads/domain/ad-grant.ts";
import type { Boost } from "#ads/domain/boost.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/** What happened to a boost that its workspace's owners hear about. */
export type BoostNews =
  | "budgetReached"
  | "ended"
  | "failed"
  | "started"
  | "unconfirmed";

/**
 * Tells a workspace what happened to its ads, in the app and by email,
 * and its webhook endpoints: once per fact, in the transaction that
 * records it.
 */
export class AdNotices extends Context.Service<
  AdNotices,
  {
    /** A boost started, ended, failed, used its budget or is unconfirmed. */
    readonly boost: (
      boost: Boost,
      account: AdAccount,
      news: BoostNews
    ) => Effect.Effect<void, DatabaseError>;
    /** A member paused, resumed or stopped a boost: webhooks only. */
    readonly boostChanged: (
      boost: Boost,
      account: AdAccount,
      change: "paused" | "resumed" | "stopped"
    ) => Effect.Effect<void, DatabaseError>;
    /** The network refused a grant's token: its person signs in again. */
    readonly reconnectNeeded: (
      grant: AdGrant
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/ads/application/AdNotices") {}
