import { Option, Schema } from "effect";

import type { PostContent } from "./post-content.ts";
import type { PostTarget } from "./post-target.ts";
import { TargetOptionsSchema } from "./target-options.ts";

const encodeOptions = Schema.encodeSync(TargetOptionsSchema);

// A target's options with their fields in order, so the same options are
// always written the same way, however they were read.
const optionsOf = ({ options }: PostTarget) =>
  options.pipe(
    Option.map((chosen) =>
      Object.entries(encodeOptions(chosen)).toSorted(([left], [right]) =>
        left.localeCompare(right)
      )
    ),
    Option.getOrNull
  );

// What one part says, written the same way whenever it is the same.
const saidBy = ({
  media,
  overrides,
  text,
}: Pick<PostContent, "media" | "overrides" | "text">) => ({
  media: media.map(({ altText, mediaId }) => ({ altText, mediaId })),
  overrides: overrides
    .map(({ channelId, text: override }) => ({ channelId, text: override }))
    .toSorted((left, right) => left.channelId.localeCompare(right.channelId)),
  text,
});

/**
 * What an approval of a post covers, written the same way whenever it is
 * the same: its text, its media in order with their alt text, the text it
 * has instead on some channels, the channels it goes to and the options it
 * has on each, and every part that follows the first, in order, with its
 * text, media, texts by channel and wait. Changing any of these makes
 * another subject, so an approval given for the first no longer stands. Its
 * time is not part of it: an approved post may be moved.
 *
 * A post of one part is written as it was before posts had parts, so the
 * approvals given then still stand.
 */
export const approvalSubject = (
  content: PostContent,
  targets: readonly PostTarget[]
): string => {
  const channels = targets
    .map((target) => ({
      channelId: target.channelId,
      options: optionsOf(target),
    }))
    .toSorted((left, right) => left.channelId.localeCompare(right.channelId));

  const first = { channels, ...saidBy(content) };

  return JSON.stringify(
    content.followUps.length === 0
      ? first
      : {
          ...first,
          followUps: content.followUps.map((part) => ({
            delaySeconds: part.delaySeconds,
            ...saidBy(part),
          })),
        }
  );
};
