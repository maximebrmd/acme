import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { ClusterError, MessageStorage } from "effect/cluster";
import { SqlError } from "effect/sql";

import { FakePlatformPublisher } from "#publishing/infrastructure/fake-platform-publisher.ts";

import {
  DatabaseTest,
  deploy,
  newChannel,
  onServerAt,
  scheduleIn,
  schedulePost,
} from "./harness.ts";

// In-memory cluster storage that cannot save a PublishPostV1 start, as when
// the database drops the connection while a post is scheduled.
const StorageFailingToStartPosts = Layer.effect(
  MessageStorage.MessageStorage,
  MessageStorage.MemoryDriver.use(({ storage }) =>
    Effect.succeed(
      MessageStorage.MessageStorage.of({
        ...storage,
        saveRequest: (request) =>
          request.envelope.address.entityType === "Workflow/PublishPostV1"
            ? Effect.fail(
                new ClusterError.PersistenceError({
                  cause: new SqlError.SqlError({
                    reason: new SqlError.ConnectionError({
                      cause: "connection lost",
                    }),
                  }),
                })
              )
            : storage.saveRequest(request),
      })
    )
  )
).pipe(Layer.provideMerge(MessageStorage.MemoryDriver.layer));

const ServerFailingToStartPosts = deploy(
  StorageFailingToStartPosts,
  FakePlatformPublisher
).pipe(
  Layer.provideMerge(FakePlatformPublisher),
  Layer.provideMerge(DatabaseTest)
);

describe("PostScheduling when the job cannot be stored", () => {
  it.effect(
    "fails with a DatabaseError the caller can retry",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* failsToSchedule() {
          const failure = yield* schedulePost(
            [yield* newChannel],
            scheduleIn("2026-06-15T08:00:00Z")
          ).pipe(Effect.flip);

          assert.strictEqual(failure._tag, "DatabaseError");
        }),
        ServerFailingToStartPosts
      ),
    60_000
  );
});
