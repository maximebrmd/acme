import { Option, Schema } from "effect";
import {
  PostOutcomeSchema,
  PostSortSchema,
  PostStatusSchema,
} from "peal-contract";
import type { PostOutcome, PostSort, PostStatus } from "peal-contract";

/**
 * What the posts list shows, kept in the page's query string so a link
 * shows the same list. An outcome is a filter on finished posts only.
 */
export interface PostListFilters {
  readonly channelId?: string;
  readonly outcome?: PostOutcome;
  readonly sort: PostSort;
  readonly status?: PostStatus;
  readonly tagId?: string;
}

/** Every post, newest first. */
export const noFilters: PostListFilters = { sort: "createdDesc" };

/** What the query string holds, as `URLSearchParams` reads it. */
interface QueryString {
  readonly get: (name: string) => string | null;
}

const read = <A>(
  schema: Schema.Codec<A, string>,
  value: string | null
): Option.Option<A> =>
  value === null || value === ""
    ? Option.none()
    : Schema.decodeUnknownOption(schema)(value);

type Writable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * The filters a query string names. A value it does not know, as a link
 * written by hand may hold, is ignored, and so is an outcome without the
 * finished status.
 */
export const filtersOf = (query: QueryString): PostListFilters => {
  const status = read(PostStatusSchema, query.get("status"));
  const outcome = read(PostOutcomeSchema, query.get("outcome"));
  const channelId = read(Schema.String, query.get("channel"));
  const tagId = read(Schema.String, query.get("tag"));

  const filters: Writable<PostListFilters> = {
    sort: Option.getOrElse(
      read(PostSortSchema, query.get("sort")),
      () => noFilters.sort
    ),
  };

  if (Option.isSome(status)) {
    filters.status = status.value;
  }

  if (Option.isSome(outcome) && filters.status === "finished") {
    filters.outcome = outcome.value;
  }

  if (Option.isSome(channelId)) {
    filters.channelId = channelId.value;
  }

  if (Option.isSome(tagId)) {
    filters.tagId = tagId.value;
  }

  return filters;
};

/** The query string of the filters, without the defaults. */
export const queryOf = (filters: PostListFilters): string =>
  new URLSearchParams([
    ...(filters.status === undefined ? [] : [["status", filters.status]]),
    ...(filters.outcome === undefined ? [] : [["outcome", filters.outcome]]),
    ...(filters.channelId === undefined
      ? []
      : [["channel", filters.channelId]]),
    ...(filters.tagId === undefined ? [] : [["tag", filters.tagId]]),
    ...(filters.sort === noFilters.sort ? [] : [["sort", filters.sort]]),
  ]).toString();

/**
 * What `posts.search` is asked for one page: the filters, and the cursor
 * the page before gave, which holds only with the same filters and sort.
 */
export const searchOf = (
  filters: PostListFilters,
  cursor: string | undefined
): PostListFilters & { readonly cursor?: string } => {
  if (cursor === undefined) {
    return filters;
  }

  return { ...filters, cursor };
};

/** Whether the sort lists only posts with a time. */
export const byTime = (sort: PostSort): boolean =>
  sort === "scheduledAsc" || sort === "scheduledDesc";

/**
 * Whether the filters narrow the list: a filter, or an order by time,
 * which leaves out the posts without one.
 */
export const isFiltering = (filters: PostListFilters): boolean =>
  filters.status !== undefined ||
  filters.channelId !== undefined ||
  filters.tagId !== undefined ||
  byTime(filters.sort);

/** A filter of the query string, by its name there. */
export type FilterName = "channel" | "outcome" | "sort" | "status" | "tag";

/**
 * The filters with one changed, or taken off with `undefined`: read back
 * from the query string, so a value the list does not know is dropped, and
 * so is an outcome once the status is not "finished".
 */
export const withFilter = (
  filters: PostListFilters,
  name: FilterName,
  value: string | undefined
): PostListFilters => {
  const query = new URLSearchParams(queryOf(filters));

  if (value === undefined) {
    query.delete(name);
  } else {
    query.set(name, value);
  }

  return filtersOf(query);
};
