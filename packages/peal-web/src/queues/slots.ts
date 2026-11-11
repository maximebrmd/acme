import { Option, Schema } from "effect";
import { QueueDetailsSchema, weekdays } from "peal-contract";
import type { Queue, QueueDetails, QueueSlot } from "peal-contract";

// A queue's week as its form holds it, and what the API takes of it.

/** A queue as its form holds it: a channel set of none is "". */
export interface QueueDraft {
  readonly channelIds: readonly string[];
  readonly channelSetId: string;
  readonly isDefault: boolean;
  readonly name: string;
  readonly slots: readonly QueueSlot[];
  readonly timeZone: string;
}

const sameSlot = (left: QueueSlot, right: QueueSlot) =>
  left.day === right.day && left.time === right.time;

/** The slots by day of the week, from Monday, then by time. */
export const slotsInWeek = (
  slots: readonly QueueSlot[]
): readonly QueueSlot[] =>
  slots.toSorted(
    (left, right) =>
      weekdays.indexOf(left.day) - weekdays.indexOf(right.day) ||
      left.time.localeCompare(right.time)
  );

/** The slots with one more, kept once and in the week's order. */
export const withSlot = (
  slots: readonly QueueSlot[],
  slot: QueueSlot
): readonly QueueSlot[] =>
  slots.some((kept) => sameSlot(kept, slot))
    ? slots
    : slotsInWeek([...slots, slot]);

/** The slots without one. */
export const withoutSlot = (
  slots: readonly QueueSlot[],
  slot: QueueSlot
): readonly QueueSlot[] => slots.filter((kept) => !sameSlot(kept, slot));

const decodeDetails = Schema.decodeUnknownOption(QueueDetailsSchema);

/** The queue as the API takes it, once the form holds one it may save. */
export const queueDetailsOf = (
  draft: QueueDraft
): Option.Option<QueueDetails> =>
  decodeDetails(
    draft.channelSetId === ""
      ? {
          channelIds: draft.channelIds,
          isDefault: draft.isDefault,
          name: draft.name.trim(),
          slots: draft.slots,
          timeZone: draft.timeZone,
        }
      : {
          channelIds: draft.channelIds,
          channelSetId: draft.channelSetId,
          isDefault: draft.isDefault,
          name: draft.name.trim(),
          slots: draft.slots,
          timeZone: draft.timeZone,
        }
  );

/**
 * A queue's form, from the queue: without its channels disconnected
 * since, which saving could not keep.
 */
export const queueDraftOf = (queue: Queue): QueueDraft => ({
  channelIds: queue.channelIds.filter(
    (channelId) => !queue.unavailableChannelIds.includes(channelId)
  ),
  channelSetId: queue.channelSetId ?? "",
  isDefault: queue.isDefault,
  name: queue.name,
  slots: queue.slots,
  timeZone: queue.timeZone,
});

/** The queue a post is added to unless the member picks another. */
export const defaultQueueOf = (
  queues: readonly Queue[]
): Option.Option<Queue> =>
  Option.fromUndefinedOr(
    queues.find(({ isDefault }) => isDefault) ?? queues[0]
  );
