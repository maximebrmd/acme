import { Context, Effect, Layer } from "effect";

import type { FeedStopReason } from "#publishing/domain/feed-stop-reason.ts";
import type { Feed } from "#publishing/domain/feed.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Tells those who expect a feed to go on making posts that it stopped, in
 * the transaction that stops it, once for each time it stops.
 */
export class FeedNotices extends Context.Service<
  FeedNotices,
  {
    readonly stopped: (
      feed: Feed,
      reason: FeedStopReason
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/FeedNotices") {
  /** For tests: nobody hears. */
  static readonly none = Layer.succeed(
    FeedNotices,
    FeedNotices.of({ stopped: () => Effect.void })
  );
}
