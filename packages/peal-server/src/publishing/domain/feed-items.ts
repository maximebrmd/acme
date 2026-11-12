import { DateTime, Option } from "effect";

import type { FeedEntry } from "./feed-entry.ts";
import { maxItemsPerDay, maxItemsPerRun } from "./feed.ts";
import type { ItemDigest } from "./item-digest.ts";

/** What a read's new items become: posts now, or skipped as too many. */
export interface NewItems {
  readonly make: readonly FeedEntry[];
  readonly tooMany: readonly FeedEntry[];
}

/**
 * The items a document lists once each, the first of a digest kept, in
 * the document's order.
 */
export const distinctItems = (
  items: readonly FeedEntry[]
): readonly FeedEntry[] => {
  const met = new Set<string>();

  return items.filter(({ digest }) => {
    if (met.has(digest)) {
      return false;
    }

    met.add(digest);

    return true;
  });
};

// Oldest first: by date when every item has one, else the document's
// order reversed, as feeds list their newest first.
const oldestFirst = (items: readonly FeedEntry[]): readonly FeedEntry[] => {
  const reversed = items.toReversed();

  return reversed.every(({ publishedAt }) => Option.isSome(publishedAt))
    ? reversed.toSorted((left, right) =>
        DateTime.Order(
          Option.getOrThrow(left.publishedAt),
          Option.getOrThrow(right.publishedAt)
        )
      )
    : reversed;
};

/**
 * Which of a document's items become posts: those the feed has not kept
 * (`seen`) and, when they carry a date, dated `since` or later, oldest
 * first, `maxItemsPerRun` at most and no more than the day leaves after
 * `madeToday`; the rest of them are too many, and never come back.
 */
export const newItems = (
  items: readonly FeedEntry[],
  seen: ReadonlySet<ItemDigest>,
  since: DateTime.Utc,
  madeToday: number
): NewItems => {
  const fresh = oldestFirst(
    distinctItems(items).filter(
      ({ digest, publishedAt }) =>
        !seen.has(digest) &&
        !Option.exists(publishedAt, (at) => DateTime.isLessThan(at, since))
    )
  );

  const room = Math.max(
    0,
    Math.min(maxItemsPerRun, maxItemsPerDay - madeToday)
  );

  return { make: fresh.slice(0, room), tooMany: fresh.slice(room) };
};
