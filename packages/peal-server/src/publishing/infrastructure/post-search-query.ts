import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { DateTime, Option } from "effect";

import type {
  PostPageRequest,
  PostPosition,
  PostSort,
} from "#publishing/application/post-listing.ts";

import { posts, postTargets } from "./schema.ts";

// The conditions and the order of a page of posts (`PostRepository.search`).
// Pages are keyed on (scheduled_at, id) or on id alone, never on an offset,
// so a page starts where the one before ended whatever was created, moved
// or deleted meanwhile.

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const byScheduled = (sort: PostSort) =>
  sort === "scheduledAsc" || sort === "scheduledDesc";

const descending = (sort: PostSort) =>
  sort === "createdDesc" || sort === "scheduledDesc";

// The posts past the position, in the list's order.
const past = (sort: PostSort, { postId, scheduledAt }: PostPosition) => {
  const further = descending(sort) ? lt : gt;

  if (!byScheduled(sort) || scheduledAt === null) {
    return further(posts.id, postId);
  }

  const at = date(scheduledAt);

  return or(
    further(posts.scheduledAt, at),
    and(eq(posts.scheduledAt, at), further(posts.id, postId))
  );
};

const some = <A, B>(option: Option.Option<A>, condition: (value: A) => B) =>
  option.pipe(Option.map(condition), Option.getOrUndefined);

/** What a post must hold to be on the page. */
export const pageConditions = ({
  after,
  filter,
  sort,
  workspaceId,
}: PostPageRequest) =>
  and(
    eq(posts.workspaceId, workspaceId),
    // A list ordered by time holds the posts that have one.
    byScheduled(sort) ? isNotNull(posts.scheduledAt) : undefined,
    some(filter.status, (status) => eq(posts.status, status)),
    some(filter.outcome, (outcome) => eq(posts.outcome, outcome)),
    some(filter.authorId, (authorId) => eq(posts.authorId, authorId)),
    some(filter.queueId, (queueId) => eq(posts.queueId, queueId)),
    some(
      filter.createdVia,
      (via) => sql`${posts.createdVia} ->> '_tag' = ${via}`
    ),
    some(filter.scheduledFrom, (from) => gte(posts.scheduledAt, date(from))),
    some(filter.scheduledBefore, (before) =>
      lt(posts.scheduledAt, date(before))
    ),
    some(
      filter.channelIds,
      (channelIds) =>
        sql`EXISTS (SELECT 1 FROM ${postTargets} WHERE ${postTargets.postId} = ${posts.id} AND ${inArray(postTargets.channelId, [...channelIds])})`
    ),
    some(
      filter.tagIds,
      (tagIds) =>
        sql`${posts.tagIds} && ARRAY[${sql.join(
          tagIds.map((tagId) => sql`${tagId}`),
          sql`, `
        )}]::uuid[]`
    ),
    some(after, (position) => past(sort, position))
  );

/** The order of the page: by time then id, or by id, which is by creation. */
export const pageOrder = (sort: PostSort) => {
  const direction = descending(sort) ? desc : asc;

  return byScheduled(sort)
    ? [direction(posts.scheduledAt), direction(posts.id)]
    : [direction(posts.id)];
};
