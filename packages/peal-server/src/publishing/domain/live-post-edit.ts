import type { Option } from "effect";

import { violationsOn } from "./content-rules.ts";
import type { ChannelOnPlatform } from "./content-rules.ts";
import type { ContentViolation } from "./content-violation.ts";
import { partAlone, withTextOn } from "./post-content.ts";
import type { PostContent } from "./post-content.ts";
import type { TargetOptions } from "./target-options.ts";

/**
 * What the channel's platform would refuse in the post once `text` is the
 * text of its part at `part` there, checked as scheduling checks that
 * part (`violationsOn`, with the target's options: a Mastodon content
 * warning counts): the part alone, its media as they are, a violation of
 * a later part naming it by `part`. An edit never leaves a part without
 * text, media or not (`empty`).
 */
export const editViolationsOn = (edit: {
  readonly channel: ChannelOnPlatform;
  readonly content: PostContent;
  readonly options: Option.Option<TargetOptions>;
  readonly part: number;
  readonly text: string;
}): readonly ContentViolation[] => {
  const { channel, part, text } = edit;
  const named = { channelId: channel.channelId, platform: channel.platform };

  const violations: readonly ContentViolation[] =
    text.trim() === ""
      ? [{ _tag: "empty", ...named }]
      : violationsOn(
          partAlone(
            withTextOn(edit.content, part, channel.channelId, text),
            part
          ),
          channel,
          edit.options
        );

  return part === 0
    ? violations
    : violations.map((violation) =>
        "platform" in violation ? { ...violation, part } : violation
      );
};
