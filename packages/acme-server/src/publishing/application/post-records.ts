import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostRecord } from "#shared/application/personal-data.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { PostsPublishing } from "./posts-publishing.ts";
import { PublicationScheduler } from "./publication-scheduler.ts";
import { WorkspacePostStore } from "./workspace-post-store.ts";

/**
 * A workspace's posts as a whole, for the workspace context when a
 * workspace's data is exported or erased.
 */
export class PostRecords extends Context.Service<
  PostRecords,
  {
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly PostRecord[], DatabaseError>;
    /**
     * Deletes the workspace's posts, in the caller's transaction if any,
     * and stops the jobs of those still scheduled, so nothing of the
     * workspace goes out. Refused while one of them is being published.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError | PostsPublishing>;
  }
>()("acme-server/publishing/application/PostRecords") {
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

      return PostRecords.of({
        eraseWorkspace,
        exportWorkspace: (workspaceId) => store.exportAll(workspaceId),
      });
    })
  );
}
