import { assert, layer } from "@effect/vitest";
import {
  DateTime,
  Deferred,
  Duration,
  Effect,
  Fiber,
  Layer,
  Option,
} from "effect";
import { SqlClient } from "effect/sql";

import { ContentFingerprints } from "#publishing/application/content-fingerprints.ts";
import type { FingerprintSearch } from "#publishing/application/content-fingerprints.ts";
import { DrizzleContentFingerprints } from "#publishing/infrastructure/drizzle-content-fingerprints.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

const StorageTest = DrizzleContentFingerprints.pipe(
  Layer.provideMerge(DatabaseTest)
);

const search = Effect.gen(function* search() {
  const now = yield* DateTime.now;

  const looked: FingerprintSearch = {
    after: DateTime.subtract(now, { hours: 24 }),
    before: DateTime.add(now, { hours: 24 }),
    contents: [
      {
        channelId: yield* newId(ChannelIdSchema),
        content: "A synthetic post two requests send together.",
      },
    ],
    except: Option.none(),
    workspaceId: yield* freshWorkspace,
  };

  return looked;
});

// On the real clock: the waits below are waits on the database.
layer(StorageTest, { excludeTestServices: true })(
  "the content fingerprints",
  (it) => {
    it.effect(
      "let a check read while a send holds the same content, and make another send wait",
      () =>
        Effect.gen(function* glancing() {
          const fingerprints = yield* ContentFingerprints;
          const sql = yield* SqlClient.SqlClient;
          const looked = yield* search;
          const held = yield* Deferred.make<boolean>();
          const done = yield* Deferred.make<boolean>();

          // A send in flight: it looked, and has not committed yet.
          const sending = yield* sql
            .withTransaction(
              fingerprints
                .duplicatesOf(looked)
                .pipe(
                  Effect.andThen(Deferred.succeed(held, true)),
                  Effect.andThen(Deferred.await(done))
                )
            )
            .pipe(Effect.forkChild);

          yield* Deferred.await(held);

          // A check holds nothing, and waits for nothing.
          const glanced = yield* fingerprints
            .glance(looked)
            .pipe(Effect.timeoutOption(Duration.seconds(2)));

          assert.deepStrictEqual(glanced, Option.some([]));

          // Another send of the same content waits its turn.
          const other = yield* sql
            .withTransaction(fingerprints.duplicatesOf(looked))
            .pipe(Effect.timeoutOption(Duration.millis(300)));

          assert.isTrue(Option.isNone(other));

          yield* Deferred.succeed(done, true);
          yield* Fiber.join(sending);
        })
    );
  }
);
