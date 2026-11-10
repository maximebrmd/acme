import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

/**
 * The posts a channel is already known to have made: the ids its platform
 * gave them, as Peal recorded them on its targets. A confirmation that
 * searches the platform for an attempt's post asks it, so a post another
 * attempt made, identical in every word, is never taken for this one's.
 */
export class RecordedPosts extends Context.Service<
  RecordedPosts,
  {
    /** Those of `platformPostIds` recorded on a target of the channel. */
    readonly among: (
      channelId: ChannelId,
      platformPostIds: readonly string[]
    ) => Effect.Effect<ReadonlySet<string>, DatabaseError>;
  }
>()("peal-server/publishing/application/RecordedPosts") {
  /** No post is recorded: for adapters' tests that need none. */
  static readonly none = Layer.succeed(
    RecordedPosts,
    RecordedPosts.of({ among: () => Effect.succeed(new Set<string>()) })
  );
}
