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

      const eraseWorkspace = Effect.fn("PostRecords.eraseWorkspace")(
        function* eraseWorkspace(workspaceId: WorkspaceId) {
          yield* transaction(
            Effect.gen(function* eraseInTransaction() {
              // Under the posts' locks, a job that woke takes its turn: it
              // claims its post before this reads it, which then reads as
              // publishing, or after this commits, and finds it gone.
              const standings = yield* store.lockAll(workspaceId);

              if (standings.some(({ status }) => status === "publishing")) {
                yield* new PostsPublishing({ workspaceId });
              }

              // A stop is part of the transaction, as a start is.
              yield* Effect.forEach(
                standings,
                ({ execution, status }) =>
                  status === "scheduled" && Option.isSome(execution)
                    ? scheduler.cancel(execution.value)
                    : Effect.void,
                { discard: true }
              );

              yield* store.deleteAll(workspaceId);
            })
          );
        }
      );

      const ensureErasable = Effect.fn("PostRecords.ensureErasable")(
        function* ensureErasable(workspaceId: WorkspaceId) {
          const standings = yield* transaction(store.lockAll(workspaceId));

          if (standings.some(({ status }) => status === "publishing")) {
            yield* new PostsPublishing({ workspaceId });
          }
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
