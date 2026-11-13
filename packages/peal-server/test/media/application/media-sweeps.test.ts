// The sweeps' bounds and their check before a file goes, on a bucket and
// a database in memory: a listing that spans runs, and an asset recorded
// between the listing and the deletion.
import { assert, layer } from "@effect/vitest";
import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Ref,
  Stream,
} from "effect";
import { TestClock } from "effect/testing";

import { MediaInUse } from "#media/application/media-in-use.ts";
import { MediaSweeps } from "#media/application/media-sweeps.ts";
import { MediaBucket } from "#media/application/ports/media-bucket.ts";
import type { BucketFile } from "#media/application/ports/media-bucket.ts";
import { MediaFolders } from "#media/application/ports/media-folders.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { MediaSweepStore } from "#media/application/ports/media-sweep-store.ts";
import type { SweepCursor } from "#media/application/ports/media-sweep-store.ts";
import { MediaUsage } from "#media/application/ports/media-usage.ts";
import {
  CurrentSweepPolicy,
  defaultSweepPolicy,
} from "#media/application/sweep-policy.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { storageKeyFor } from "#media/domain/storage-key.ts";
import type { StorageKey } from "#media/domain/storage-key.ts";
import { PostIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

const workspaceId = WorkspaceIdSchema.make(
  "4f6b1c1e-2a8d-4c3b-9f1e-1a2b3c4d5e6f"
);

// Twelve files written at the epoch, in key order, listed one a page.
const files: readonly BucketFile[] = Array.from({ length: 12 }, (_, index) => ({
  byteSize: 10,
  key: storageKeyFor(
    workspaceId,
    MediaAssetIdSchema.make(
      `019a7b2c-3d4e-7f00-8a1b-${String(index).padStart(12, "0")}`
    ),
    "image/png"
  ),
  modifiedAt: DateTime.makeUnsafe(0),
}));

// The file whose asset is recorded once the listing found it unheld.
const lateKey = files[11]?.key;

// Two uploads never completed: the first a draft shows, the second a
// post scheduled to go out, which keeps it.
const expiredAssets = files.slice(0, 2).map(({ key }) => ({
  assetId: MediaAssetIdSchema.make(key.slice(-40, -4)),
  key,
}));

const scheduledAsset = expiredAssets[1]?.assetId;

const scheduledPost = PostIdSchema.make("019a7b2c-3d4e-7f00-8a1b-0000000000aa");

/** What the fakes saw. */
class World extends Context.Service<
  World,
  {
    readonly cursor: Ref.Ref<Option.Option<SweepCursor>>;
    readonly forgotten: Ref.Ref<readonly string[]>;
    readonly released: Ref.Ref<readonly string[]>;
    readonly removed: Ref.Ref<readonly string[]>;
  }
>()("test/media/sweeps/World") {}

const unused = () => Effect.die("not used by the sweep");

const FakesTest = Layer.effectContext(
  Effect.gen(function* fakes() {
    const cursor = yield* Ref.make(Option.none<SweepCursor>());
    const removed = yield* Ref.make<readonly string[]>([]);
    const forgotten = yield* Ref.make<readonly string[]>([]);
    const released = yield* Ref.make<readonly string[]>([]);
    // How many times each key was checked.
    const checked = new Map<string, number>();

    const bucket = MediaBucket.of({
      listFiles: (after) =>
        Effect.sync(() => {
          const start = Option.match(after, {
            onNone: () => 0,
            onSome: (key) => files.findIndex((file) => file.key === key) + 1,
          });

          const page = files.slice(start, start + 1);
          const last = page.at(-1);

          return {
            items: page,
            next:
              last === undefined || start + 1 >= files.length
                ? Option.none()
                : Option.some<string>(last.key),
          };
        }),
      listUploads: unused,
    });

    const store = MediaSweepStore.of({
      cursor: () => Ref.get(cursor),
      erasedFolders: unused,
      expiredUploads: () =>
        Effect.succeed(
          expiredAssets.map(({ assetId, key }) => ({
            assetId,
            storageKey: key,
            upload: { _tag: "single" } as const,
            workspaceId,
          }))
        ),
      forgetExpired: (assetId) =>
        Ref.update(forgotten, (all) => [...all, assetId]).pipe(Effect.as(true)),
      forgetFolder: unused,
      // The late file is unheld when the page is read, held from its
      // second check on: an upload recorded meanwhile.
      keptKeys: (keys) =>
        Effect.sync(() => {
          const held = keys.filter((key) => {
            const times = (checked.get(key) ?? 0) + 1;

            checked.set(key, times);

            return key === lateKey && times > 1;
          });

          return new Set<StorageKey>(held);
        }),
      saveCursor: (_, position) => Ref.set(cursor, position),
    });

    const storage = MediaStorage.of({
      abortMultipartUpload: unused,
      completeMultipartUpload: unused,
      downloadUrl: unused,
      head: () =>
        Effect.succeed(
          Option.some({ byteSize: 10, contentType: Option.some("image/png") })
        ),
      listUploadedParts: unused,
      publicUrl: unused,
      read: () => Stream.die("not used by the sweep"),
      remove: (key) => Ref.update(removed, (all) => [...all, key]),
      signUpload: unused,
      signUploadPart: unused,
      startMultipartUpload: unused,
      store: unused,
    });

    return Context.make(MediaBucket, bucket).pipe(
      Context.add(MediaSweepStore, store),
      Context.add(MediaStorage, storage),
      Context.add(MediaFolders, MediaFolders.of({ removeWorkspace: unused })),
      Context.add(
        MediaUsage,
        MediaUsage.of({
          of: unused,
          release: (_, assetId) =>
            assetId === scheduledAsset
              ? Effect.fail(
                  new MediaInUse({ assetId, postIds: [scheduledPost] })
                )
              : Ref.update(released, (all) => [...all, assetId]).pipe(
                  Effect.as([])
                ),
        })
      ),
      Context.add(World, World.of({ cursor, forgotten, released, removed }))
    );
  })
);

const SweepsTest = MediaSweeps.layer.pipe(
  Layer.provide(
    Layer.succeed(CurrentSweepPolicy, {
      ...defaultSweepPolicy,
      orphansAfter: Duration.days(1),
    })
  ),
  Layer.provideMerge(FakesTest)
);

layer(SweepsTest)("the sweep of files no asset holds", (it) => {
  it.effect(
    "lists ten pages a run, goes on where it stopped, and keeps a file whose asset came meanwhile",
    () =>
      Effect.gen(function* spansRuns() {
        const { cursor, removed } = yield* World;
        const sweep = MediaSweeps.use((sweeps) => sweeps.orphans);

        // Two days after the files were written.
        yield* TestClock.setTime(Duration.toMillis(Duration.days(2)));

        assert.deepStrictEqual(yield* sweep, {
          bytes: 100,
          left: true,
          swept: 10,
        });
        assert.deepStrictEqual(
          yield* Ref.get(cursor),
          Option.some({ key: files[9]?.key ?? "", uploadId: Option.none() })
        );

        // The last file's asset was recorded between the page and its
        // deletion: it stays.
        assert.deepStrictEqual(yield* sweep, {
          bytes: 10,
          left: false,
          swept: 1,
        });
        assert.deepStrictEqual(
          yield* Ref.get(removed),
          files.slice(0, 11).map(({ key }) => key)
        );
        assert.deepStrictEqual(yield* Ref.get(cursor), Option.none());
      })
  );
});

layer(SweepsTest)("the sweep of uploads never completed", (it) => {
  it.effect(
    "takes the asset out of the drafts that show it first, and leaves one a scheduled post shows",
    () =>
      Effect.gen(function* releasesFirst() {
        const { forgotten, released, removed } = yield* World;
        const drafted = expiredAssets.slice(0, 1);

        yield* TestClock.setTime(Duration.toMillis(Duration.days(2)));

        assert.deepStrictEqual(
          yield* MediaSweeps.use((sweeps) => sweeps.pending),
          { bytes: 10, left: false, swept: 1 }
        );
        assert.deepStrictEqual(
          yield* Ref.get(released),
          drafted.map(({ assetId }) => assetId)
        );
        assert.deepStrictEqual(
          yield* Ref.get(forgotten),
          drafted.map(({ assetId }) => assetId)
        );
        assert.deepStrictEqual(
          yield* Ref.get(removed),
          drafted.map(({ key }) => key)
        );
      })
  );
});
