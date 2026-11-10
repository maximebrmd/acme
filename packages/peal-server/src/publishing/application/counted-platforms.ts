import { Context, Layer } from "effect";

import type { Platform } from "#shared/domain/platform.ts";

/**
 * The platforms where Peal reads each post's counts, as the analytics
 * context knows them: a platform's capabilities say so.
 */
export class CountedPlatforms extends Context.Service<
  CountedPlatforms,
  { readonly includes: (platform: Platform) => boolean }
>()("peal-server/publishing/application/CountedPlatforms") {
  /** Counts are read nowhere. */
  static readonly none = Layer.succeed(
    CountedPlatforms,
    CountedPlatforms.of({ includes: () => false })
  );
}
