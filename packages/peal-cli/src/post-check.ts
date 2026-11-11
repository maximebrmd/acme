import { duplicateWindowHours, queueHorizonDays } from "peal-contract";
import type {
  ChannelPreview,
  LimitedCount,
  PostValidation,
} from "peal-contract";

import { duplicateChannels, units, violationOf } from "#explain.ts";
import { planLimitReason } from "#plan-limit.ts";
import { columns } from "#print.ts";
import { named } from "#workspace.ts";

// A count against its platform's limit, when the post holds any.
const limited = (
  { count, maximum }: LimitedCount,
  what: string
): readonly string[] => {
  if (count === 0) {
    return [];
  }

  return [
    maximum === null
      ? `${String(count)} ${what}`
      : `${String(count)} of ${String(maximum)} ${what}`,
  ];
};

// What a channel would receive, counted as its platform counts it.
const countsOf = (
  preview: Pick<
    ChannelPreview,
    "hashtags" | "links" | "media" | "mentions" | "textCounts"
  >
): string => {
  const counts = [
    ...preview.textCounts.map(
      ({ length, maximum, unit }) =>
        `${String(length)} of ${String(maximum)} ${units[unit]}`
    ),
    ...limited(preview.media, "images and videos"),
    ...limited(preview.hashtags, "hashtags"),
    ...limited(preview.mentions, "mentions"),
    ...limited(preview.links, "different links"),
  ];

  return counts.length === 0
    ? "no limit Peal knows on its text"
    : counts.join(", ");
};

/**
 * The channels a checked post would go to, one per line: the channel, with
 * its platform, and its text and media against the platform's limits, then
 * a line for each part that follows it there.
 */
export const previewLines = (
  validation: PostValidation,
  names: ReadonlyMap<string, string>
): string[] =>
  columns(
    validation.channels.flatMap((preview) => [
      [
        names.has(preview.channelId)
          ? `  ${named(names, preview.channelId)}`
          : `  ${preview.channelId} (${preview.platform})`,
        countsOf(preview),
      ],
      // The parts after the first, numbered as people count them: the
      // post itself is part 1.
      ...preview.parts.map((part) => [
        `    part ${String(part.part + 1)}`,
        countsOf(part),
      ]),
    ])
  );

// Why the post's time cannot be kept, if it cannot.
const scheduleProblem = (
  schedule: PostValidation["schedule"],
  timeZone: string
): readonly string[] => {
  if (schedule === "inPast") {
    return ["That time has passed: give a later --at, or publish it now."];
  }

  return schedule === "invalidTimeZone"
    ? [
        `${timeZone} is not a time zone Peal knows: give an IANA zone, such as Europe/Paris.`,
      ]
    : [];
};

/**
 * Everything that would refuse a checked post, one per line, as sending it
 * would explain each: what its platforms refuse, the channels and media
 * that are not the workspace's, its time, the plan's room, and the channels
 * that already have its content.
 */
export const problemsOf = (
  validation: PostValidation,
  timeZone: string
): string[] =>
  [
    ...validation.channels.flatMap(({ violations }) =>
      violations.map(violationOf)
    ),
    ...validation.violations.map(violationOf),
    ...(validation.unknownChannels.length === 0
      ? []
      : [
          `These channels are not the workspace's: ${validation.unknownChannels.join(", ")}. peal channels list shows them.`,
        ]),
    ...(validation.unknownMedia.length === 0
      ? []
      : [
          `These media are not the workspace's, or not ready: ${validation.unknownMedia.join(", ")}.`,
        ]),
    ...scheduleProblem(validation.schedule, timeZone),
    ...(validation.queueNoRoom === undefined
      ? []
      : [
          validation.queueNoRoom === "noSlots"
            ? "The queue has no slot: add some with peal queues update --slot, or give the post a time with --at."
            : `Every slot of the queue's next ${String(queueHorizonDays)} days is taken: add slots with peal queues update --slot, or give the post a time with --at.`,
        ]),
    ...(validation.planLimit === null
      ? []
      : [planLimitReason(validation.planLimit)]),
    ...(validation.duplicates.length === 0
      ? []
      : [
          `The same content already goes to ${duplicateChannels(validation.duplicates)}, less than ${String(duplicateWindowHours)} hours from this post's time. If you mean to post it twice, send it with --allow-duplicate.`,
        ]),
  ].map((problem) => `  ${problem}`);
