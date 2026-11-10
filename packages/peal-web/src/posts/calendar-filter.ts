import type { Post } from "peal-contract";

// What the calendar shows of the posts it loaded, once the viewer chose
// tags or channels. Filtering happens in the browser: nothing is asked of
// the server again.

/** The tags and channels the viewer chose; none of a kind is all of it. */
export interface CalendarFilter {
  readonly channelIds: readonly string[];
  readonly tagIds: readonly string[];
}

export const noFilter: CalendarFilter = { channelIds: [], tagIds: [] };

/** Whether the viewer chose anything. */
export const isFiltering = ({ channelIds, tagIds }: CalendarFilter): boolean =>
  channelIds.length > 0 || tagIds.length > 0;

/** What the filter reads of a post: its tags and the channels it goes to. */
interface Filtered {
  readonly tagIds: Post["tagIds"];
  readonly targets: readonly Pick<Post["targets"][number], "channelId">[];
}

/**
 * Whether a post shows: it has one of the chosen tags, when some are
 * chosen, and goes to one of the chosen channels, when some are.
 */
export const matchesFilter = (
  { channelIds, tagIds }: CalendarFilter,
  post: Filtered
): boolean =>
  (tagIds.length === 0 || post.tagIds.some((id) => tagIds.includes(id))) &&
  (channelIds.length === 0 ||
    post.targets.some(({ channelId }) => channelIds.includes(channelId)));

/** What shows of some posts, and how many of them the filter hides. */
export const filtered = <Item extends { readonly post: Filtered }>(
  filter: CalendarFilter,
  items: readonly Item[]
) => {
  const shown = items.filter(({ post }) => matchesFilter(filter, post));

  return { hidden: items.length - shown.length, shown };
};

/** The ids with one chosen or not, each once. */
export const withChoice = (
  ids: readonly string[],
  id: string,
  chosen: boolean
): readonly string[] => {
  const others = ids.filter((other) => other !== id);

  return chosen ? [...others, id] : others;
};

/**
 * The filter without the tags and channels the workspace no longer has:
 * one deleted or disconnected since it was chosen would hide every post,
 * with nothing left to untick.
 */
export const knownFilter = (
  filter: CalendarFilter,
  known: {
    readonly channelIds: readonly string[];
    readonly tagIds: readonly string[];
  }
): CalendarFilter => ({
  channelIds: filter.channelIds.filter((id) => known.channelIds.includes(id)),
  tagIds: filter.tagIds.filter((id) => known.tagIds.includes(id)),
});
