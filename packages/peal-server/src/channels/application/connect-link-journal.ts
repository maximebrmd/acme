import { Context, Effect, Layer } from "effect";

import type { ConnectLink } from "#channels/domain/connect-link.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

/**
 * The step of a link's hosted page that connected its accounts: the
 * platform's callback (`complete`), or the choice among the accounts a
 * sign-in reached (`choose`).
 */
export type ConnectingStep = "choose" | "complete";

/**
 * Where a workspace reads that a connect link connected accounts to it:
 * its activity log, which the activity context keeps. Whoever held the
 * link signed in nowhere in Peal: the link is who connected, and nothing
 * of the visitor is kept, neither an address nor a browser.
 */
export class ConnectLinkJournal extends Context.Service<
  ConnectLinkJournal,
  {
    readonly connected: (
      link: ConnectLink,
      channelIds: readonly ChannelId[],
      step: ConnectingStep
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/channels/application/ConnectLinkJournal") {
  /** Keeps nothing: for tests of what the log is not about. */
  static readonly none = Layer.succeed(
    ConnectLinkJournal,
    ConnectLinkJournal.of({ connected: () => Effect.void })
  );
}
