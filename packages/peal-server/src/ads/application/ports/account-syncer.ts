import { Context, Schema } from "effect";
import type { Effect } from "effect";

import type { AdAccountId } from "#ads/domain/ids.ts";

/**
 * How a sync of one account ended:
 *
 * - `synced`: read whole, and saved.
 * - `halted`: the network asked to slow down; what was read is saved, and
 *   the account is read again once the wait is over.
 * - `postponed`: the network did not answer, or refused for now.
 * - `reconnectNeeded`: the network refused the sign-in's token.
 * - `gone`: the account was disconnected meanwhile.
 * - `unread`: the call did not reach the account's gate, or broke there:
 *   nothing was read, and the next run tries again.
 */
export const SyncOutcomeSchema = Schema.Literals([
  "synced",
  "halted",
  "postponed",
  "reconnectNeeded",
  "gone",
  "unread",
]);

export type SyncOutcome = typeof SyncOutcomeSchema.Type;

/**
 * Reads one account from its network and saves what it found, one call at
 * a time per account: the server's adapter goes through the account's
 * gate, so a sync takes turns with the requests of a boost.
 */
export class AccountSyncer extends Context.Service<
  AccountSyncer,
  {
    readonly sync: (accountId: AdAccountId) => Effect.Effect<SyncOutcome>;
  }
>()("peal-server/ads/application/AccountSyncer") {}
