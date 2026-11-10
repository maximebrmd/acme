import { Option, Schema } from "effect";
import type { DateTime } from "effect";
import { defaultPostPageSize } from "peal-contract";
import type {
  Platform,
  PostOriginVia,
  PostOutcome,
  PostPage as PageView,
  PostSort,
  PostStatus,
} from "peal-contract";

import type {
  PostPage,
  PostSearchRequest,
} from "#publishing/application/post-search.ts";
import { TagIdSchema } from "#publishing/domain/tag-id.ts";
import { ChannelIdSchema, UserIdSchema } from "#shared/domain/ids.ts";

import { postView } from "./post-view.ts";

/** The filters, order and page a request for posts gives, all optional. */
export interface SearchInput {
  readonly authorId?: string;
  readonly channelId?: string;
  readonly createdVia?: PostOriginVia;
  readonly cursor?: string;
  readonly from?: DateTime.Utc;
  readonly limit?: number;
  readonly outcome?: PostOutcome;
  readonly platform?: Platform;
  readonly sort?: PostSort;
  readonly status?: PostStatus;
  readonly tagId?: string;
  readonly to?: DateTime.Utc;
}

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

const decodeUserId = Schema.decodeUnknownOption(UserIdSchema);

// An id that is not even of the right form names nothing: it is on no
// post, so the page is empty rather than refused.
const nobody = UserIdSchema.make("00000000-0000-0000-0000-000000000000");

const nowhere = ChannelIdSchema.make("00000000-0000-7000-8000-000000000000");

const decodeTagId = Schema.decodeUnknownOption(TagIdSchema);

const noTag = TagIdSchema.make("00000000-0000-7000-8000-000000000000");

/** What to list, with ids decoded and defaults filled in. */
export const searchRequestFrom = (input: SearchInput): PostSearchRequest => ({
  authorId: Option.fromUndefinedOr(input.authorId).pipe(
    Option.map((id) => Option.getOrElse(decodeUserId(id), () => nobody))
  ),
  channelId: Option.fromUndefinedOr(input.channelId).pipe(
    Option.map((id) => Option.getOrElse(decodeChannelId(id), () => nowhere))
  ),
  createdVia: Option.fromUndefinedOr(input.createdVia),
  cursor: Option.fromUndefinedOr(input.cursor),
  from: Option.fromUndefinedOr(input.from),
  limit: input.limit ?? defaultPostPageSize,
  outcome: Option.fromUndefinedOr(input.outcome),
  platform: Option.fromUndefinedOr(input.platform),
  sort: input.sort ?? "createdDesc",
  status: Option.fromUndefinedOr(input.status),
  tagId: Option.fromUndefinedOr(input.tagId).pipe(
    Option.map((id) => Option.getOrElse(decodeTagId(id), () => noTag))
  ),
  to: Option.fromUndefinedOr(input.to),
});

/** What clients see of a page of posts. */
export const pageView = (page: PostPage): PageView => ({
  channels: page.channels.map(({ channelId, platform }) => ({
    channelId,
    platform,
  })),
  items: page.items.map(postView),
  nextCursor: Option.getOrNull(page.next),
});
