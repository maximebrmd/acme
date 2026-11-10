import { assert, describe, it } from "@effect/vitest";
import {
  ConfigProvider,
  Deferred,
  Duration,
  Effect,
  Fiber,
  Layer,
  Option,
  Ref,
  Stream,
} from "effect";
import { TestClock } from "effect/testing";

import { MediaForPublishing } from "#publishing/application/media-for-publishing.ts";
import type { PublishableMedia } from "#publishing/application/media-for-publishing.ts";
import {
  defaultUploadSlots,
  largeUpload,
  limitedUploads,
  uploadsWaiting,
} from "#publishing/infrastructure/upload-slots.ts";
import { MediaAssetIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";

const workspaceId = WorkspaceIdSchema.make(
  "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"
);

const mediaId = (index: number) =>
  MediaAssetIdSchema.make(
    `01900000-0000-7000-8000-${String(index).padStart(12, "0")}`
  );

const mebibyte = 1024 * 1024;

// Ids below 100 are videos of 200 MiB; the others, small images.
const described = (id: MediaAssetId): PublishableMedia => {
  const large = Number(id.slice(-12)) < 100;

  return {
    byteSize: large ? 200 * mebibyte : mebibyte,
    contentType: large ? "video/mp4" : "image/png",
    dimensions: Option.none(),
    duration: Option.none(),
    fileName: large ? "clip.mp4" : "picture.png",
    kind: large ? "video" : "image",
    mediaId: id,
  };
};

// A store whose files stay open until `finish`, counting those open at
// once.
const store = Effect.gen(function* makeStore() {
  const open = yield* Ref.make(0);
  const most = yield* Ref.make(0);
  const finish = yield* Deferred.make<true>();

  const opened = Stream.fromEffect(
    Ref.updateAndGet(open, (count) => count + 1).pipe(
      Effect.tap((count) => Ref.update(most, (seen) => Math.max(seen, count))),
      Effect.andThen(Deferred.await(finish)),
      Effect.as(new Uint8Array(1)),
      Effect.ensuring(Ref.update(open, (count) => count - 1))
    )
  );

  const layer = Layer.succeed(
    MediaForPublishing,
    MediaForPublishing.of({
      describe: (_workspace, id) => Effect.succeed(described(id)),
      held: () => Effect.succeed(opened),
      open: () => opened,
      publicUrl: () => Effect.succeed("https://media.test/file"),
    })
  );

  return { finish, layer, most: Ref.get(most), open: Ref.get(open) };
});

const settings = (env: Record<string, string>) =>
  ConfigProvider.layer(ConfigProvider.fromEnv({ env }));

// Uploads `count` files at once, as so many posts due together, each
// reading its file to the end.
const uploading = (count: number, firstId: number) =>
  MediaForPublishing.use((media) =>
    Effect.forEach(
      Array.from({ length: count }, (_, index) => mediaId(firstId + index)),
      (id) => Stream.runDrain(media.open(workspaceId, id)),
      { concurrency: "unbounded", discard: true }
    )
  );

describe("upload slots", () => {
  it.effect(
    "sends so many large files at once, and makes the others wait their turn",
    () =>
      Effect.gen(function* limited() {
        const files = yield* store;

        const uploads = yield* uploading(10, 1).pipe(
          Effect.provide(
            limitedUploads.pipe(
              Layer.provide(files.layer),
              Layer.provide(settings({ PEAL_MAX_CONCURRENT_UPLOADS: "3" }))
            )
          ),
          Effect.forkChild
        );

        // However long the first ones take, no timer ends the wait.
        yield* TestClock.adjust(Duration.hours(2));

        assert.strictEqual(yield* files.open, 3);
        assert.strictEqual(yield* uploadsWaiting, 7);

        yield* Deferred.succeed(files.finish, true);
        yield* Fiber.join(uploads);

        assert.strictEqual(yield* files.most, 3);
        assert.strictEqual(yield* files.open, 0);
        assert.strictEqual(yield* uploadsWaiting, 0);
      })
  );

  it.effect(
    "has a large file wait for its slot before it is handed over, so no request opens to sit idle",
    () =>
      Effect.gen(function* held() {
        const files = yield* store;
        const handed = yield* Ref.make(0);

        // Each takes its file as an adapter does before it opens its
        // request, then sends it.
        const sending = (id: number) =>
          MediaForPublishing.use((media) =>
            media.held(workspaceId, mediaId(id)).pipe(
              Effect.tap(() => Ref.update(handed, (count) => count + 1)),
              Effect.flatMap(Stream.runDrain),
              Effect.scoped
            )
          );

        const uploads = yield* Effect.forEach([1, 2, 3], sending, {
          concurrency: "unbounded",
          discard: true,
        }).pipe(
          Effect.provide(
            limitedUploads.pipe(
              Layer.provide(files.layer),
              Layer.provide(settings({ PEAL_MAX_CONCURRENT_UPLOADS: "1" }))
            )
          ),
          Effect.forkChild
        );

        yield* TestClock.adjust(Duration.minutes(5));

        // One file was handed over; the others wait before any request.
        assert.strictEqual(yield* Ref.get(handed), 1);
        assert.strictEqual(yield* uploadsWaiting, 2);

        yield* Deferred.succeed(files.finish, true);
        yield* Fiber.join(uploads);

        assert.strictEqual(yield* files.most, 1);
        assert.strictEqual(yield* uploadsWaiting, 0);
      })
  );

  it.effect("lets small files through, whatever the large ones do", () =>
    Effect.gen(function* small() {
      const files = yield* store;

      const uploads = yield* Effect.all([uploading(1, 1), uploading(20, 100)], {
        concurrency: "unbounded",
      }).pipe(
        Effect.provide(
          limitedUploads.pipe(
            Layer.provide(files.layer),
            Layer.provide(settings({ PEAL_MAX_CONCURRENT_UPLOADS: "1" }))
          )
        ),
        Effect.forkChild
      );

      yield* TestClock.adjust(Duration.seconds(1));

      assert.isBelow(mebibyte, largeUpload);
      assert.strictEqual(yield* files.open, 21);

      yield* Deferred.succeed(files.finish, true);
      yield* Fiber.join(uploads);
    })
  );

  it.effect("frees its slot when an upload is given up", () =>
    Effect.gen(function* interrupted() {
      const files = yield* store;

      const layer = limitedUploads.pipe(
        Layer.provide(files.layer),
        Layer.provide(settings({ PEAL_MAX_CONCURRENT_UPLOADS: "1" }))
      );

      yield* Effect.gen(function* uploads() {
        const first = yield* Effect.forkChild(uploading(1, 1));

        yield* TestClock.adjust(Duration.seconds(1));
        assert.strictEqual(yield* files.open, 1);

        // One waiting for the slot is given up too, as at a shutdown: it
        // stops at once, and takes nothing.
        const waiter = yield* Effect.forkChild(uploading(1, 3));

        yield* TestClock.adjust(Duration.seconds(1));
        assert.strictEqual(yield* uploadsWaiting, 1);
        yield* Fiber.interrupt(waiter);
        assert.strictEqual(yield* uploadsWaiting, 0);

        yield* Fiber.interrupt(first);

        const second = yield* Effect.forkChild(uploading(1, 2));

        yield* TestClock.adjust(Duration.seconds(1));
        assert.strictEqual(yield* files.open, 1);

        yield* Deferred.succeed(files.finish, true);
        yield* Fiber.join(second);
      }).pipe(Effect.provide(layer));
    })
  );

  it("allows more uploads at once on a server with more memory, within bounds", () => {
    const gibibyte = 1024 * mebibyte;

    assert.strictEqual(defaultUploadSlots(gibibyte / 2), 2);
    assert.strictEqual(defaultUploadSlots(2 * gibibyte), 2);
    assert.strictEqual(defaultUploadSlots(4 * gibibyte), 4);
    assert.strictEqual(defaultUploadSlots(16 * gibibyte), 8);
    assert.strictEqual(defaultUploadSlots(64 * gibibyte), 8);
  });

  it.effect("stops the server on a setting that is not a count", () =>
    Effect.gen(function* malformed() {
      const files = yield* store;

      for (const value of ["0", "many", "1.5"]) {
        const built = yield* Layer.build(
          limitedUploads.pipe(
            Layer.provide(files.layer),
            Layer.provide(settings({ PEAL_MAX_CONCURRENT_UPLOADS: value }))
          )
        ).pipe(Effect.scoped, Effect.exit);

        assert.strictEqual(built._tag, "Failure");
      }
    })
  );
});
