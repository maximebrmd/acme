import { Duration, Option } from "effect";
import type { TikTokAccount as TikTokAccountView } from "peal-contract";

import type { TikTokAccount } from "#publishing/application/tiktok-creator-info.ts";

/**
 * A TikTok channel's creator as the contract shows them, to the API and the
 * MCP tools alike: the longest video in whole milliseconds, absent values
 * null.
 */
export const tiktokAccountView = ({
  posting,
  takesPhotos,
}: TikTokAccount): TikTokAccountView => ({
  posting:
    posting._tag === "blocked"
      ? posting
      : {
          _tag: "ready",
          creator: {
            avatarUrl: Option.getOrNull(posting.creator.avatarUrl),
            commentDisabled: posting.creator.commentDisabled,
            duetDisabled: posting.creator.duetDisabled,
            maxVideoDurationMs: posting.creator.maxVideoDuration.pipe(
              Option.map((duration) => Math.round(Duration.toMillis(duration))),
              Option.getOrNull
            ),
            nickname: posting.creator.nickname,
            privacyLevels: posting.creator.privacyLevels,
            stitchDisabled: posting.creator.stitchDisabled,
            username: posting.creator.username,
          },
        },
  takesPhotos,
});
