import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  AuthoredPostRecord,
  PostRecord,
  SavedItemsRecord,
} from "#shared/application/personal-data.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import { PostsPublishing } from "./posts-publishing.ts";
import { PublicationScheduler } from "./publication-scheduler.ts";
import { WorkspacePostStore } from "./workspace-post-store.ts";

/**
 * A workspace's posts as a whole, and the posts a user wrote, for the
 * workspace context when a workspace's or a user's data is exported or
 * erased.
 */
export class PostRecords extends Context.Service<
  PostRecords,
  {
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly PostRecord[], DatabaseError>;
    /** What the workspace saved to write and file its posts. */
    readonly exportSaved: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<SavedItemsRecord, DatabaseError>;
    /**
     * Deletes the workspace's posts, and what it saved to write and file
     * them (tags, signatures, channel sets, default options), in the
     * caller's transaction if any,
     * and stops the jobs of those still scheduled, so nothing of the
     * workspace goes out. Refused while one of them is being published.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError | PostsPublishing>;
    /**
     * Refused while one of the workspace's posts is being published, as
     * erasing it would be: for a deletion to check before it does what
     * cannot be undone.
     */
    readonly ensureErasable: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError | PostsPublishing>;
    /** The posts the user wrote in these workspaces, oldest first. */
    readonly exportAuthored: (
      userId: UserId,
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<readonly AuthoredPostRecord[], DatabaseError>;
    /**
     * Forgets that the user wrote their posts, in the caller's transaction
     * if any: the posts stay with their workspaces, without an author, as
     * those an API key wrote.
     */
    readonly forgetAuthor: (
      userId: UserId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/PostRecords") {
  static readonly layer = Layer.effect(
    PostRecords,
    Effect.gen(function* PostRecordsLive() {
      const store = yield* WorkspacePostStore;
      const scheduler = yield* PublicationScheduler;
      const { transaction } = yield* TransactionRunner;

      // The rounds of the workspace's posts that are publishing, under
      // their locks; refused while a call to a platform is in flight for
      // one, as its outcome is not known yet. A post that only waits, as
      // between two parts of a thread (a day at most each) or before
      // another try, has none: it is erased, and what it had left to send
      // is never sent.
      const goingOut = Effect.fn("PostRecords.goingOut")(function* goingOut(
        workspaceId: WorkspaceId
      ) {
        const rounds = yield* store.lockRounds(workspaceId);

        if (rounds.some(({ inFlight }) => inFlight)) {
          return yield* new PostsPublishing({ workspaceId });
        }

        return rounds;
      });

      const eraseWorkspace = Effect.fn("PostRecords.eraseWorkspace")(
        function* eraseWorkspace(workspaceId: WorkspaceId) {
          yield* transaction(
            Effect.gen(function* eraseInTransaction() {
              // Under the posts' locks, a job that woke takes its turn: it
              // claims its post before this reads it, which then reads as
              // publishing, or after this commits, and finds it gone.
              const standings = yield* store.lockAll(workspaceId);
              const rounds = yield* goingOut(workspaceId);

              // A stop is part of the transaction, as a start is: the jobs
              // that sleep until a post's time, and those that wait
              // between two parts of one, or before trying a part again.
              for (const { execution, status } of standings) {
                if (
                  (status === "scheduled" || status === "publishing") &&
                  Option.isSome(execution)
                ) {
                  yield* scheduler.cancel(execution.value);
                }
              }

              for (const { round, targetId } of rounds) {
                yield* scheduler.cancelRound({ round, targetId });
              }

              yield* store.deleteAll(workspaceId);
            })
          );
        }
      );

      const ensureErasable = Effect.fn("PostRecords.ensureErasable")(
        function* ensureErasable(workspaceId: WorkspaceId) {
          yield* transaction(
            store
              .lockAll(workspaceId)
              .pipe(Effect.andThen(goingOut(workspaceId)))
          );
        }
      );

      return PostRecords.of({
        ensureErasable,
        eraseWorkspace,
        exportAuthored: (userId, workspaceIds) =>
          store.exportAuthored(userId, workspaceIds),
        exportSaved: (workspaceId) => store.exportSaved(workspaceId),
        exportWorkspace: (workspaceId) => store.exportAll(workspaceId),
        forgetAuthor: (userId) => store.clearAuthor(userId),
      });
    })
  );
}
