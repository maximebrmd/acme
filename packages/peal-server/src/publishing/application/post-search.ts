import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import type {
  PostOutcome,
  PostStatusName,
} from "#publishing/domain/post-status.ts";
import type { QueueId } from "#publishing/domain/queue-id.ts";
import type { TagId } from "#publishing/domain/tag-id.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId, UserId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { InvalidCursor } from "./invalid-cursor.ts";
import { InvalidTimeRange } from "./invalid-time-range.ts";
import { PostPositionSchema } from "./post-listing.ts";
import type { PostOriginVia, PostSort } from "./post-listing.ts";
import { PostRepository } from "./post-repository.ts";
import type { PostWithTargets } from "./post-repository.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";

/** The most posts a page holds, and how many when not told. */
export const maxPostPageSize = 100;

export const defaultPostPageSize = 20;

/** Which posts to list, and which page of them. */
export interface PostSearchRequest {
  readonly authorId: Option.Option<UserId>;
  readonly channelId: Option.Option<ChannelId>;
  readonly createdVia: Option.Option<PostOriginVia>;
  /** The cursor the page before gave, if this is not the first. */
  readonly cursor: Option.Option<string>;
  /** Scheduled from this instant, included. */
  readonly from: Option.Option<DateTime.Utc>;
  readonly limit: number;
  readonly outcome: Option.Option<PostOutcome>;
  readonly platform: Option.Option<Platform>;
  /** Posts this queue placed. */
  readonly queueId: Option.Option<QueueId>;
  /** Posts Peal deleted from a channel's platform, or from none. */
  readonly removed: Option.Option<boolean>;
  readonly sort: PostSort;
  readonly status: Option.Option<PostStatusName>;
  /** Posts filed under this tag. */
  readonly tagId: Option.Option<TagId>;
  /** Scheduled before this instant, excluded. */
  readonly to: Option.Option<DateTime.Utc>;
}

/** A page of posts, with what a client needs to show them. */
export interface PostPage {
  /**
   * The channels the page's posts go to, with their platforms: those
   * still connected to the workspace.
   */
  readonly channels: readonly ChannelOnPlatform[];
  readonly items: readonly PostWithTargets[];
  /** Pass it as the cursor for the next page, if there is one. */
  readonly next: Option.Option<string>;
}

// A cursor is a position, written so that clients keep it as it is: they
// are told nothing of what it holds, which may change.
const CursorSchema = Schema.StringFromBase64Url.pipe(
  Schema.decodeTo(Schema.fromJsonString(PostPositionSchema))
);

const decodeCursor = Schema.decodeUnknownEffect(CursorSchema);

const encodeCursor = Schema.encodeEffect(CursorSchema);

/**
 * Listing a workspace's posts, whatever their state: filtered by status,
 * outcome, channel, platform, tag, queue, scheduled time, author and how they
 * were created, ordered by creation or by scheduled time, a page at a time.
 * Needs post:read, and channel:read for the channels it names.
 *
 * A channel no longer connected has no platform any more: its posts are
 * listed, but not found by platform, nor is it among the page's channels.
 */
export class PostSearch extends Context.Service<
  PostSearch,
  {
    /**
     * A page of the posts that match. A cursor that is none a page gave,
     * or that of a list ordered another way, is InvalidCursor; a range
     * that ends before it starts is InvalidTimeRange.
     */
    readonly search: (
      actor: Actor,
      request: PostSearchRequest
    ) => Effect.Effect<
      PostPage,
      DatabaseError | InvalidCursor | InvalidTimeRange | MissingPermission
    >;
  }
>()("peal-server/publishing/application/PostSearch") {
  static readonly layer = Layer.effect(
    PostSearch,
    Effect.gen(function* PostSearchLive() {
      const posts = yield* PostRepository;
      const workspaceChannels = yield* WorkspaceChannels;

      // The channels a platform's posts are on: those of the workspace's
      // posts that are connected, on that platform.
      const channelsOn = Effect.fn("PostSearch.channelsOn")(
        function* channelsOn(actor: Actor, platform: Platform) {
          const used = yield* posts.channelsUsed(actor.workspaceId);

          const connected =
            used.length === 0
              ? []
              : yield* workspaceChannels.lookUp(actor, used);

          return connected
            .filter((channel) => channel.platform === platform)
            .map(({ channelId }) => channelId);
        }
      );

      const search = Effect.fn("PostSearch.search")(function* search(
        actor: Actor,
        request: PostSearchRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        const { from, to } = request;

        if (
          Option.isSome(from) &&
          Option.isSome(to) &&
          !DateTime.isLessThan(from.value, to.value)
        ) {
          return yield* new InvalidTimeRange({
            from: from.value,
            to: to.value,
          });
        }

        const after = yield* Option.match(request.cursor, {
          onNone: () => Effect.succeed(Option.none()),
          onSome: (cursor) =>
            decodeCursor(cursor).pipe(
              Effect.mapError(() => new InvalidCursor()),
              Effect.filterOrFail(
                (position) => position.sort === request.sort,
                () => new InvalidCursor()
              ),
              Effect.asSome
            ),
        });

        const onPlatform = yield* Option.match(request.platform, {
          onNone: () => Effect.succeed(Option.none<readonly ChannelId[]>()),
          onSome: (platform) => channelsOn(actor, platform).pipe(Effect.asSome),
        });

        // On the channel asked, and on the platform asked when both are.
        const channelIds = Option.match(request.channelId, {
          onNone: () => onPlatform,
          onSome: (channelId) =>
            Option.some(
              Option.match(onPlatform, {
                onNone: () => [channelId],
                onSome: (ids) => ids.filter((id) => id === channelId),
              })
            ),
        });

        const page = yield* posts.search({
          after,
          filter: {
            authorId: request.authorId,
            channelIds,
            createdVia: request.createdVia,
            outcome: request.outcome,
            queueId: request.queueId,
            removed: request.removed,
            scheduledBefore: to,
            scheduledFrom: from,
            status: request.status,
            tagIds: request.tagId.pipe(Option.map((tagId) => [tagId])),
          },
          limit: Math.min(Math.max(request.limit, 1), maxPostPageSize),
          sort: request.sort,
          workspaceId: actor.workspaceId,
        });

        const shown = [
          ...new Set(
            page.items.flatMap(({ targets }) =>
              targets.map(({ channelId }) => channelId)
            )
          ),
        ];

        const found: PostPage = {
          channels:
            shown.length === 0
              ? []
              : yield* workspaceChannels.lookUp(actor, shown),
          items: page.items,
          next: yield* Option.match(page.next, {
            onNone: () => Effect.succeed(Option.none<string>()),
            onSome: (position) =>
              encodeCursor(position).pipe(Effect.orDie, Effect.asSome),
          }),
        };

        return found;
      });

      return PostSearch.of({ search });
    })
  );
}
