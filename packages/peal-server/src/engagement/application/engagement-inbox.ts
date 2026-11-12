import { Context, Effect, Layer, Option } from "effect";

import type { Comment } from "#engagement/domain/comment.ts";
import { abilitiesOf } from "#engagement/domain/engagement-abilities.ts";
import type { EngagementAbilities } from "#engagement/domain/engagement-abilities.ts";
import type { Reply } from "#engagement/domain/reply.ts";
import type { ThreadId } from "#engagement/domain/thread-id.ts";
import { CurrentInboxPlatforms } from "#shared/application/current-inbox-platforms.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { EngagementChannels } from "./ports/engagement-channels.ts";
import type { EngagedChannel } from "./ports/engagement-channels.ts";
import { EngagementStore } from "./ports/engagement-store.ts";
import type {
  ThreadCursor,
  ThreadFilter,
  ThreadSummary,
} from "./ports/engagement-store.ts";
import { ThreadNotFound } from "./thread-not-found.ts";

/** The most threads a page lists. */
export const maxThreadsPerPage = 100;

/** A page of threads, and whether more follow. */
export interface ThreadsPage {
  readonly next: Option.Option<ThreadCursor>;
  readonly threads: readonly ThreadSummary[];
}

/** A thread whole: its comments, the replies sent from Peal, and what its channel can do. */
export interface ThreadDetail {
  readonly abilities: EngagementAbilities;
  readonly comments: readonly Comment[];
  /** None once the channel left the workspace. */
  readonly platform: Option.Option<Platform>;
  readonly replies: readonly Reply[];
  readonly summary: ThreadSummary;
}

const nothing = abilitiesOf("x", [], new Set());

/** The cursor that starts the page after `summary`. */
export const cursorAfter = (
  summary: ThreadSummary
): Option.Option<ThreadCursor> =>
  summary.lastCommentAt.pipe(
    Option.map((lastCommentAt) => ({
      lastCommentAt,
      threadId: summary.thread.id,
      waiting: summary.unanswered > 0,
    }))
  );

/**
 * The comments under a workspace's posts, for its members to read: the
 * threads that have comments, those with one waiting for an answer first,
 * and each thread whole. Reading needs `engagement:read`.
 */
export class EngagementInbox extends Context.Service<
  EngagementInbox,
  {
    readonly threads: (
      actor: Actor,
      filter: ThreadFilter,
      page: {
        readonly after: Option.Option<ThreadCursor>;
        readonly limit: number;
      }
    ) => Effect.Effect<ThreadsPage, DatabaseError | MissingPermission>;
    readonly thread: (
      actor: Actor,
      threadId: ThreadId
    ) => Effect.Effect<
      ThreadDetail,
      DatabaseError | MissingPermission | ThreadNotFound
    >;
    /** What a channel can do about comments; nothing once it is gone or off. */
    readonly abilities: (
      actor: Actor,
      channelId: ChannelId
    ) => Effect.Effect<EngagementAbilities, DatabaseError | MissingPermission>;
  }
>()("peal-server/engagement/application/EngagementInbox") {
  static readonly layer = Layer.effect(
    EngagementInbox,
    Effect.gen(function* EngagementInboxLive() {
      const store = yield* EngagementStore;
      const channels = yield* EngagementChannels;
      const inbox = yield* CurrentInboxPlatforms;

      const described = (channelId: ChannelId) =>
        channels.describe(channelId).pipe(
          Effect.map(Option.some),
          Effect.catchTag("ChannelUnreadable", () =>
            Effect.succeed(Option.none<EngagedChannel>())
          )
        );

      const threads = Effect.fn("EngagementInbox.threads")(function* threads(
        actor: Actor,
        filter: ThreadFilter,
        page: {
          readonly after: Option.Option<ThreadCursor>;
          readonly limit: number;
        }
      ) {
        yield* Effect.fromResult(authorize(actor, "engagement:read"));

        const limit = Math.min(Math.max(page.limit, 1), maxThreadsPerPage);

        const listed = yield* store.listThreads(actor.workspaceId, filter, {
          after: page.after,
          limit: limit + 1,
        });

        const shown = listed.slice(0, limit);

        const result: ThreadsPage = {
          next:
            listed.length > limit
              ? Option.fromUndefinedOr(shown.at(-1)).pipe(
                  Option.flatMap(cursorAfter)
                )
              : Option.none(),
          threads: shown,
        };

        return result;
      });

      const thread = Effect.fn("EngagementInbox.thread")(function* thread(
        actor: Actor,
        threadId: ThreadId
      ) {
        yield* Effect.fromResult(authorize(actor, "engagement:read"));

        const summary = yield* store.thread(threadId).pipe(
          Effect.map(
            Option.filter(
              (found) => found.thread.workspaceId === actor.workspaceId
            )
          ),
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new ThreadNotFound({ threadId })),
              onSome: Effect.succeed,
            })
          )
        );

        const channel = yield* described(summary.thread.channelId);

        const detail: ThreadDetail = {
          abilities: Option.match(channel, {
            onNone: () => nothing,
            onSome: ({ platform, scopes }) =>
              abilitiesOf(platform, scopes, inbox),
          }),
          comments: yield* store.commentsOf(threadId),
          platform: channel.pipe(Option.map(({ platform }) => platform)),
          replies: yield* store.repliesOf(threadId),
          summary,
        };

        return detail;
      });

      const abilities = Effect.fn("EngagementInbox.abilities")(
        function* abilities(actor: Actor, channelId: ChannelId) {
          yield* Effect.fromResult(authorize(actor, "engagement:read"));

          // A channel of another workspace is told as one that is gone.
          if (!(yield* channels.belongs(channelId, actor.workspaceId))) {
            return nothing;
          }

          return Option.match(yield* described(channelId), {
            onNone: () => nothing,
            onSome: ({ platform, scopes }) =>
              abilitiesOf(platform, scopes, inbox),
          });
        }
      );

      return EngagementInbox.of({ abilities, thread, threads });
    })
  );
}
