import { Context, Layer } from "effect";
import type { Option } from "effect";

import {
  accountNumbers,
  noNumbers,
  numbersOf,
  postCounts,
} from "#analytics/domain/analytics-numbers.ts";
import type { AnalyticsNumbers } from "#analytics/domain/analytics-numbers.ts";
import {
  countsChannel,
  isCounted,
  noBilledReads,
} from "#analytics/domain/counted-platforms.ts";
import type { BilledReads } from "#analytics/domain/counted-platforms.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import type { Platform } from "#shared/domain/platform.ts";

/**
 * Where analytics reads each post's counts, for the contexts that tell
 * clients what a platform offers.
 */
export class AnalyticsCoverage extends Context.Service<
  AnalyticsCoverage,
  {
    /** Whether Peal reads the counts of posts published on the platform. */
    readonly counts: (platform: Platform) => boolean;
    /**
     * Whether Peal reads the counts of a channel's posts, which on LinkedIn
     * depends on the way in it came through.
     */
    readonly countsChannel: (
      platform: Platform,
      connection: Option.Option<ChannelConnection>
    ) => boolean;
    /**
     * The numbers Peal reads on the platform, of posts and of accounts:
     * those of any of its channels.
     */
    readonly numbers: (platform: Platform) => AnalyticsNumbers;
    /** The numbers Peal reads on a channel, which may be none of them. */
    readonly numbersOn: (
      platform: Platform,
      connection: Option.Option<ChannelConnection>
    ) => AnalyticsNumbers;
  }
>()("peal-server/analytics/application/AnalyticsCoverage") {
  /** The coverage of a server with these billed reads on. */
  static readonly layerWith = (billed: BilledReads) =>
    Layer.succeed(
      AnalyticsCoverage,
      AnalyticsCoverage.of({
        counts: (platform) => isCounted(platform, billed),
        countsChannel: (platform, connection) =>
          countsChannel(platform, connection, billed),
        numbers: (platform) =>
          isCounted(platform, billed)
            ? { account: accountNumbers[platform], post: postCounts[platform] }
            : noNumbers,
        numbersOn: (platform, connection) =>
          numbersOf(platform, connection, billed),
      })
    );

  /** The coverage of a server with no billed read on. */
  static readonly layer = AnalyticsCoverage.layerWith(noBilledReads);
}
