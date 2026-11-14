import { Option, Schema } from "effect";

import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

import type { PostContent } from "./post-content.ts";
import { isDropped } from "./post-target.ts";
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
  // An override's media are written only when it gives some, so a
  // subject without any is written as it was before overrides had media.
  overrides: overrides
    .map(({ channelId, media: own, text: override }) =>
      own === undefined
        ? { channelId, text: override }
        : {
            channelId,
            media: own.map(({ altText, mediaId }) => ({ altText, mediaId })),
            text: override,
          }
    )
    .toSorted((left, right) => left.channelId.localeCompare(right.channelId)),
  text,
});

/**
 * What an approval of a post covers, written the same way whenever it is
 * the same: its text, its media in order with their alt text, the text
 * and the media it has instead on some channels, the channels it goes to and the options it
 * has on each, its poll (choices, time, several picks), and every part
 * that follows the first (a first comment among them), in order, with its
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
  // A channel taken off the post is none of the channels it goes to.
  const channels = targets
    .flatMap((target) =>
      isDropped(target)
        ? []
        : [{ channelId: target.channelId, options: optionsOf(target) }]
    )
    .toSorted((left, right) => left.channelId.localeCompare(right.channelId));

  const said = { channels, ...saidBy(content) };

  // A poll is written only on a post that asks one, so the subjects of
  // posts without stay as they were.
  const first = Option.match(content.poll, {
    onNone: () => said,
    onSome: ({ choices, durationMinutes, multipleChoice }) => ({
      ...said,
      poll: { choices, durationMinutes, multipleChoice },
    }),
  });

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

const SubjectChannelsSchema = Schema.fromJsonString(
  Schema.Struct({
    channels: Schema.Array(Schema.Struct({ channelId: ChannelIdSchema })),
  })
);

const decodeSubjectChannels = Schema.decodeUnknownOption(SubjectChannelsSchema);

/**
 * The channels a subject (`approvalSubject`) says the post goes to, in
 * the subject's order; none for a string that is not one.
 */
export const channelsOfSubject = (subject: string): readonly ChannelId[] =>
  decodeSubjectChannels(subject).pipe(
    Option.map(({ channels }) => channels.map(({ channelId }) => channelId)),
    Option.getOrElse((): readonly ChannelId[] => [])
  );
