import { DateTime, Option, Result } from "effect";
import type {
  Queue as QueueView,
  QueuePreview as PreviewView,
  QueueSlot as SlotView,
} from "peal-contract";

import type { ListedQueue } from "#publishing/application/queues.ts";
import type { QueuePreview, QueueSlot } from "#publishing/domain/queue.ts";

const twoDigits = (value: number) => String(value).padStart(2, "0");

/** A slot as the contract writes it: its day, and its time as `HH:mm`. */
export const slotView = ({ day, time }: QueueSlot): SlotView => ({
  day,
  time: `${twoDigits(time.hour)}:${twoDigits(time.minute)}`,
});

/** What clients see of a queue. */
export const queueView = ({ queue, unavailable }: ListedQueue): QueueView => ({
  channelIds: [...queue.channelIds],
  channelSetId: Option.getOrNull(queue.channelSetId),
  createdAt: queue.createdAt,
  id: queue.id,
  isDefault: queue.isDefault,
  name: queue.name,
  slots: queue.slots.map(slotView),
  timeZone: queue.timeZone,
  unavailableChannelIds: [...unavailable],
});

/** What clients see of a queue's coming slots. */
export const previewView = ({
  nextFree,
  slots,
}: QueuePreview): PreviewView => ({
  nextFree: Result.getOrNull(nextFree),
  noRoom: Result.isFailure(nextFree) ? nextFree.failure : null,
  slots: slots.map(({ at, postId }) => ({
    at: DateTime.toUtc(at),
    postId: Option.getOrNull(postId),
  })),
});
