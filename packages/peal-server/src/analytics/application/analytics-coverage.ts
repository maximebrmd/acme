import { Context, Layer } from "effect";

import { isCounted } from "#analytics/domain/counted-platforms.ts";
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
  }
>()("peal-server/analytics/application/AnalyticsCoverage") {
  static readonly layer = Layer.succeed(
    AnalyticsCoverage,
    AnalyticsCoverage.of({ counts: isCounted })
  );
}
