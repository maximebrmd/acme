import { Context, Effect, Layer, Option } from "effect";

import type { ShortAddresses } from "#publishing/domain/short-links.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ChannelId,
  PostId,
  PostTargetId,
  WorkspaceId,
} from "#shared/domain/ids.ts";

/** The links of a post's part on one channel to give short addresses. */
export interface ShortenAsk {
  readonly channelId: ChannelId;
  /** The addresses, in the order the text first holds them. */
  readonly destinations: readonly string[];
  readonly part: number;
  readonly postId: PostId;
  readonly targetId: PostTargetId;
  readonly workspaceId: WorkspaceId;
}

/**
 * The server's short links, for the text a channel receives: their addresses
 * (none when the server has none, which sends every post as written), and
 * the short address of each link, the same on every run of an attempt.
 */
export class LinkShortener extends Context.Service<
  LinkShortener,
  {
    readonly addresses: Option.Option<ShortAddresses>;
    /** One short address per destination, in order. */
    readonly shortened: (
      ask: ShortenAsk
    ) => Effect.Effect<readonly string[], DatabaseError>;
  }
>()("peal-server/publishing/application/LinkShortener") {
  /** No short links: every post goes out as written. */
  static readonly none = Layer.succeed(
    LinkShortener,
    LinkShortener.of({
      addresses: Option.none(),
      shortened: ({ destinations }) => Effect.succeed(destinations),
    })
  );
}
