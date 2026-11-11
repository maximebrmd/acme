import { Effect, Result } from "effect";

import type { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { optionsOn } from "#publishing/domain/channel-options.ts";
import { checkPublishable } from "#publishing/domain/content-rules.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import type { ContentViolation } from "#publishing/domain/content-violation.ts";
import type { MediaFile } from "#publishing/domain/media-file.ts";
import { shownMedia } from "#publishing/domain/post-content.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";

import { AccountRules } from "./account-rules.ts";

/**
 * Everything that keeps the content from going out on the channels, whose
 * files are `files` (those it shows and those its options name): what the platforms' rules refuse
 * (`checkPublishable`), then what each account's own settings refuse, which
 * only its platform tells (`AccountRules`). Both come in one answer, so
 * whoever fixes the post fixes it once. Scheduling refuses a post with it,
 * and validating a post answers it: the two never disagree.
 */
export const violationsOf = Effect.fn("Publishing.violationsOf")(
  function* violationsOf(
    content: PostContent,
    channels: readonly ChannelOnPlatform[],
    files: readonly MediaFile[],
    options: readonly ChannelOptions[]
  ) {
    const againstRules = Result.match(
      checkPublishable(content, channels, files, options),
      {
        onFailure: (rejected) => rejected.violations,
        onSuccess: () => [],
      }
    );

    const rules = yield* AccountRules;

    // An account's rules are about the media the post shows, never a file
    // an option names (a thumbnail is not one of a TikTok post's photos).
    const shown = new Set<string>(
      shownMedia(content).map(({ mediaId }) => mediaId)
    );

    const shownFiles = files.filter(({ mediaId }) => shown.has(mediaId));

    const refused = yield* Effect.forEach(
      channels,
      (channel) =>
        rules.violationsOn({
          channel,
          files: shownFiles,
          followUps: content.followUps.length,
          options: optionsOn(options, channel.channelId),
        }),
      { concurrency: 4 }
    );

    const violations: readonly ContentViolation[] = [
      ...againstRules,
      ...refused.flat(),
    ];

    return violations;
  }
);
