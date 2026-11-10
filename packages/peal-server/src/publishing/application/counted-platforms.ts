import { Context, Layer } from "effect";
import type { Option } from "effect";

import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import type { Platform } from "#shared/domain/platform.ts";

/**
 * The platforms where Peal reads each post's counts, as the analytics
 * context knows them: a platform's capabilities say so.
 */
export class CountedPlatforms extends Context.Service<
  CountedPlatforms,
  {
    /** Whether the posts of some channel of the platform are counted. */
    readonly includes: (platform: Platform) => boolean;
    /**
     * Whether a channel's posts are counted, from its platform and the way
     * in it came through: a LinkedIn profile's are not, a company page's
     * are.
     */
    readonly onChannel: (
      platform: Platform,
      connection: Option.Option<ChannelConnection>
    ) => boolean;
  }
>()("peal-server/publishing/application/CountedPlatforms") {
  /** Counts are read nowhere. */
  static readonly none = Layer.succeed(
    CountedPlatforms,
    CountedPlatforms.of({ includes: () => false, onChannel: () => false })
  );
}
