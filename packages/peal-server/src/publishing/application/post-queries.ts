import { Context, DateTime, Duration, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { PostId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { InvalidTimeRange } from "./invalid-time-range.ts";
import type { PostNotFound } from "./post-not-found.ts";
import { PostRepository } from "./post-repository.ts";
import type {
  DraftPage,
  DraftPageRequest,
  PostWithTargets,
} from "./post-repository.ts";
import { PublicationJournal } from "./publication-journal.ts";
import type { RecordedAttempt } from "./publication-journal.ts";
import { findInWorkspace } from "./workspace-posts.ts";

/**
 * The longest range listed at once: a month view, with the days of the weeks
 * around it, and room to spare.
 */
export const maxListedRange = Duration.days(62);

/** A range of time, from `from` (included) to `to` (excluded). */
export interface TimeRange {
  readonly from: DateTime.Utc;
  readonly to: DateTime.Utc;
}

/** The most drafts listed at once, and how many when not told. */
export const maxDraftPageSize = 50;

export const defaultDraftPageSize = 20;

const mayRead = (actor: Actor) =>
  Effect.fromResult(authorize(actor, "post:read"));

/** Reading the workspace's posts. Needs post:read. */
export class PostQueries extends Context.Service<
  PostQueries,
  {
    readonly get: (
      actor: Actor,
      postId: PostId
    ) => Effect.Effect<
      PostWithTargets,
      DatabaseError | MissingPermission | PostNotFound
    >;
    /**
     * The posts scheduled in the range, whatever happened to them since, by
     * scheduled instant, as a calendar shows them. Drafts have no time and
     * are not listed. A range that ends before it starts, or spans more than
     * `maxListedRange`, is InvalidTimeRange.
     */
    readonly listScheduled: (
      actor: Actor,
      range: TimeRange
    ) => Effect.Effect<
      readonly PostWithTargets[],
      DatabaseError | InvalidTimeRange | MissingPermission
    >;
    /**
     * The workspace's drafts, newest first, a page at a time: at most
     * `maxDraftPageSize`, whatever the limit asked.
     */
    readonly listDrafts: (
      actor: Actor,
      page: DraftPageRequest
    ) => Effect.Effect<DraftPage, DatabaseError | MissingPermission>;
    /**
     * Every attempt made at the post's channels, round by round, and how
     * each ended.
     */
    readonly attempts: (
      actor: Actor,
      postId: PostId
    ) => Effect.Effect<
      readonly RecordedAttempt[],
      DatabaseError | MissingPermission | PostNotFound
    >;
  }
>()("peal-server/publishing/application/PostQueries") {
  static readonly layer = Layer.effect(
    PostQueries,
    Effect.gen(function* PostQueriesLive() {
      const posts = yield* PostRepository;
      const journal = yield* PublicationJournal;
      const ports = yield* Effect.context<PostRepository>();

      const get = Effect.fn("PostQueries.get")(function* get(
        actor: Actor,
        postId: PostId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        const { post } = yield* findInWorkspace(actor.workspaceId, postId).pipe(
          Effect.provideContext(ports)
        );

        return { post, targets: yield* posts.targets(postId) };
      });

      const listScheduled = Effect.fn("PostQueries.listScheduled")(
        function* listScheduled(actor: Actor, { from, to }: TimeRange) {
          yield* Effect.fromResult(authorize(actor, "post:read"));

          if (
            !DateTime.isLessThan(from, to) ||
            Duration.isGreaterThan(DateTime.distance(from, to), maxListedRange)
          ) {
            return yield* new InvalidTimeRange({ from, to });
          }

          return yield* posts.listScheduled(actor.workspaceId, from, to);
        }
      );

      const listDrafts = Effect.fn("PostQueries.listDrafts")(
        function* listDrafts(actor: Actor, { after, limit }: DraftPageRequest) {
          yield* mayRead(actor);

          return yield* posts.listDrafts(actor.workspaceId, {
            after,
            limit: Math.min(Math.max(limit, 1), maxDraftPageSize),
          });
        }
      );

      const attempts = Effect.fn("PostQueries.attempts")(function* attempts(
        actor: Actor,
        postId: PostId
      ) {
        yield* mayRead(actor);
        yield* findInWorkspace(actor.workspaceId, postId).pipe(
          Effect.provideContext(ports)
        );

        return yield* journal.attemptsOf(postId);
      });

      return PostQueries.of({ attempts, get, listDrafts, listScheduled });
    })
  );
}
