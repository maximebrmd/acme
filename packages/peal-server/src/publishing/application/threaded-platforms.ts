import { Context } from "effect";

import { followUpsOn } from "#publishing/domain/platform-rules.ts";
import type { InboxPlatforms } from "#shared/domain/inbox-platform.ts";
import type { Platform } from "#shared/domain/platform.ts";

/** Which platforms this server sends the parts after a post's first to. */
export interface ThreadedPlatforms {
  /**
   * Whether the server sends a post's later parts on `platform`, where its
   * rules take any (`followUpsOn`). The operator may turn a platform's
   * off: X takes replies from an app on self-serve access only under a
   * post whose author mentioned or quoted the account (`X_THREADS`), and
   * a first comment takes the permission the inbox answers comments with,
   * which its platform grants after a review (`PEAL_INBOX_PLATFORMS`).
   */
  readonly takesParts: (platform: Platform) => boolean;
}

/**
 * Where the server sends later parts: threads everywhere their rules take
 * them, X's unless `xThreads` is false, and first comments only on the
 * platforms whose comments the inbox reads (`inbox`), as a comment takes
 * the permission that answers one there.
 */
export const threadedPlatformsWith = (
  xThreads: boolean,
  inbox: InboxPlatforms
): ThreadedPlatforms => ({
  takesParts: (platform) =>
    followUpsOn(platform)?.kind === "comment"
      ? [...inbox].some((named) => named === platform)
      : platform !== "x" || xThreads,
});

/**
 * The platforms the server sends later parts to, read where scheduling
 * checks a post (AccountRules), where the router sends a part, and where
 * clients read what each platform takes (PostingCapabilities), each when
 * it is built. Unless the composition root says otherwise: every platform
 * with threads, and no first comment, as no inbox platform is named.
 */
export const CurrentThreadedPlatforms = Context.Reference<ThreadedPlatforms>(
  "peal-server/publishing/application/CurrentThreadedPlatforms",
  { defaultValue: () => threadedPlatformsWith(true, new Set()) }
);
