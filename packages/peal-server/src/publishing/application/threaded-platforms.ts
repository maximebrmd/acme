import { Context } from "effect";

import type { Platform } from "#shared/domain/platform.ts";

/** Which platforms this server sends the parts after a post's first to. */
export interface ThreadedPlatforms {
  /**
   * Whether the server sends a post's later parts on `platform`, where its
   * rules take any (`followUpsOn`). The operator may turn a platform's
   * off: X takes replies from an app on self-serve access only under a
   * post whose author mentioned or quoted the account (`X_THREADS`).
   */
  readonly takesParts: (platform: Platform) => boolean;
}

/**
 * The platforms the server sends later parts to, read where scheduling
 * checks a post (AccountRules), where the router sends a part, and where
 * clients read what each platform takes (PostingCapabilities), each when
 * it is built. Every platform whose rules take parts, unless the
 * composition root says otherwise.
 */
export const CurrentThreadedPlatforms = Context.Reference<ThreadedPlatforms>(
  "peal-server/publishing/application/CurrentThreadedPlatforms",
  { defaultValue: () => ({ takesParts: () => true }) }
);
