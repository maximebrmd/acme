// The sweeps' rules on a bucket and a database in memory: their switch,
// the owner marker, the circuit breaker, bounds that span runs, the check
// before a file goes, what the store refuses, and the order an upload
// never completed goes in.
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
import { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import { MediaSweeps } from "#media/application/media-sweeps.ts";
import type { SweepReport } from "#media/application/media-sweeps.ts";
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
import type { SweepPolicy } from "#media/application/sweep-policy.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { storageKeyFor } from "#media/domain/storage-key.ts";
import type { StorageKey } from "#media/domain/storage-key.ts";
import { Ids } from "#shared/application/ids.ts";
import {
  PostIdSchema,
  Uuid7Schema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

const workspaceId = WorkspaceIdSchema.make(
  "4f6b1c1e-2a8d-4c3b-9f1e-1a2b3c4d5e6f"
);

const selfId = "019a7b2c-3d4e-7f00-8a1b-00000000beef";

const otherId = "019a7b2c-3d4e-7f00-8a1b-0000000d0d0d";

const fileAt = (index: number): BucketFile => ({
  byteSize: 10,
  key: storageKeyFor(
    workspaceId,
    MediaAssetIdSchema.make(
      `019a7b2c-3d4e-7f00-8a1b-${String(index).padStart(12, "0")}`
    ),
    "image/png"
  ),
  modifiedAt: DateTime.makeUnsafe(0),
});

const assetOf = (file: BucketFile) =>
  MediaAssetIdSchema.make(file.key.slice(-40, -4));

/** How the fakes behave, test by test. */
interface Setup {
  /** The bucket's files, written at the epoch, in key order. */
  readonly files: readonly BucketFile[];
  /** Files a page of the bucket lists. */
  readonly pageSize: number;
  /** Keys the database holds an asset for. */
  readonly held: ReadonlySet<string>;
  /** A key unheld when its page is read, held once checked again. */
  readonly heldLate: Option.Option<string>;
  /** Keys the store refuses to delete. */
  readonly refused: ReadonlySet<string>;
  /** The owner marker, and whether this database claimed the folder. */
  readonly marker: Option.Option<string>;
  readonly claimed: boolean;
  /** Uploads never completed, and which of them a scheduled post shows. */
  readonly expired: readonly BucketFile[];
  readonly scheduled: ReadonlySet<string>;
  /** Erased workspaces listed for the sweep. */
  readonly erased: readonly WorkspaceId[];
  /** Those of them that still have assets. */
  readonly withAssets: ReadonlySet<string>;
  /** Those whose folder the store refuses to empty. */
  readonly stuck: ReadonlySet<string>;
}

const blank: Setup = {
  claimed: true,
  erased: [],
  expired: [],
  files: [],
  held: new Set(),
  heldLate: Option.none(),
  marker: Option.some(selfId),
  pageSize: 1,
  refused: new Set(),
  scheduled: new Set(),
  stuck: new Set(),
  withAssets: new Set(),
};

/** What the fakes saw, in order. */
class World extends Context.Service<
  World,
  {
    readonly cursor: Ref.Ref<Option.Option<SweepCursor>>;
    readonly events: Ref.Ref<readonly string[]>;
    readonly marker: Ref.Ref<Option.Option<string>>;
  }
>()("test/media/sweeps/World") {}

const unused = () => Effect.die("not used by the sweep");

const refusal = () =>
  new MediaStorageFailed({
    cause: "synthetic refusal",
    operation: "delete a file",
  });

const fakesWith = (setup: Setup) =>
  Layer.effectContext(
    Effect.gen(function* fakes() {
      const cursor = yield* Ref.make(Option.none<SweepCursor>());
      const events = yield* Ref.make<readonly string[]>([]);
      const marker = yield* Ref.make(setup.marker);
      const claimed = yield* Ref.make(setup.claimed);
      const checked = new Map<string, number>();

      const log = (event: string) =>
        Ref.update(events, (all) => [...all, event]);

      const bucket = MediaBucket.of({
        claim: (id, { replace }) =>
          Ref.get(marker).pipe(
            Effect.flatMap((found) =>
              Option.isSome(found) && !replace
                ? Effect.succeed(false)
                : Ref.set(marker, Option.some(id)).pipe(
                    Effect.andThen(log(`claim:${id}`)),
                    Effect.as(true)
                  )
            )
          ),
        listFiles: (after) =>
          Effect.sync(() => {
            const start = Option.match(after, {
              onNone: () => 0,
              onSome: (key) =>
                setup.files.findIndex((file) => file.key === key) + 1,
            });

            const page = setup.files.slice(start, start + setup.pageSize);
            const last = page.at(-1);

            return {
              items: page,
              next:
                last === undefined ||
                start + setup.pageSize >= setup.files.length
                  ? Option.none()
                  : Option.some<string>(last.key),
            };
          }),
        listUploads: unused,
        owner: Ref.get(marker),
      });

      const store = MediaSweepStore.of({
        cursor: () => Ref.get(cursor),
        erasedFolders: () => Effect.succeed(setup.erased),
        expiredUploads: (_, limit, after) =>
          Effect.sync(() => {
            const start = Option.match(after, {
              onNone: () => 0,
              onSome: ({ assetId }) =>
                setup.expired.findIndex((file) => assetOf(file) === assetId) +
                1,
            });

            return setup.expired.slice(start, start + limit).map((file) => ({
              assetId: assetOf(file),
              createdAt: DateTime.makeUnsafe(0),
              storageKey: file.key,
              upload: { _tag: "single" } as const,
              workspaceId,
            }));
          }),
        forgetExpired: (assetId) =>
          log(`forget:${assetId}`).pipe(Effect.as(true)),
        forgetFolder: (id) => log(`forget-folder:${id}`),
        holdsAssets: (id) => Effect.succeed(setup.withAssets.has(id)),
        identity: () =>
          Ref.get(claimed).pipe(
            Effect.map((was) => ({ claimed: was, id: selfId }))
          ),
        keptKeys: (keys) =>
          Effect.sync(() => {
            const held = keys.filter((key) => {
              const times = (checked.get(key) ?? 0) + 1;

              checked.set(key, times);

              return (
                setup.held.has(key) ||
                (Option.getOrUndefined(setup.heldLate) === key && times > 1)
              );
            });

            return new Set<StorageKey>(held);
          }),
        markClaimed: Ref.set(claimed, true),
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
        remove: (key) =>
          setup.refused.has(key)
            ? Effect.fail(refusal())
            : log(`remove:${key}`),
        signUpload: unused,
        signUploadPart: unused,
        startMultipartUpload: unused,
        store: unused,
      });

      const folders = MediaFolders.of({
        removeWorkspace: (id) =>
          setup.stuck.has(id)
            ? Effect.fail(refusal())
            : log(`empty:${id}`).pipe(
                Effect.as({ bytes: 30, files: 3, uploads: 0 })
              ),
      });

      const usage = MediaUsage.of({
        of: (_, assetId) =>
          Effect.succeed({
            drafts: [],
            scheduled: setup.scheduled.has(assetId)
              ? [PostIdSchema.make("019a7b2c-3d4e-7f00-8a1b-0000000000aa")]
              : [],
          }),
        release: (_, assetId) =>
          setup.scheduled.has(assetId)
            ? Effect.fail(new MediaInUse({ assetId, postIds: [] }))
            : log(`release:${assetId}`).pipe(Effect.as([])),
      });

      const ids = Ids.of({
        next: Effect.succeed(
          Uuid7Schema.make("019a7b2c-3d4e-7f00-8a1b-0000000c0ffe")
        ),
      });

      return Context.make(MediaBucket, bucket).pipe(
        Context.add(MediaSweepStore, store),
        Context.add(MediaStorage, storage),
        Context.add(MediaFolders, folders),
        Context.add(MediaUsage, usage),
        Context.add(Ids, ids),
        Context.add(World, World.of({ cursor, events, marker }))
      );
    })
  );

const sweepsWith = (setup: Partial<Setup>, policy: Partial<SweepPolicy> = {}) =>
  MediaSweeps.layer.pipe(
    Layer.provide(
      Layer.succeed(CurrentSweepPolicy, {
        ...defaultSweepPolicy,
        orphansAfter: Duration.days(1),
        pendingAfter: Duration.days(1),
        ...policy,
      })
    ),
    Layer.provideMerge(fakesWith({ ...blank, ...setup }))
  );

const twoDaysOn = TestClock.setTime(Duration.toMillis(Duration.days(2)));

const report = (done: Partial<SweepReport>): SweepReport => ({
  bytes: 0,
  failed: 0,
  left: false,
  refused: Option.none(),
  swept: 0,
  ...done,
});

const eventsOf = World.use(({ events }) => Ref.get(events));

const filesUpTo = (count: number) =>
  Array.from({ length: count }, (_, index) => fileAt(index));

const twelve = filesUpTo(12);

layer(sweepsWith({ files: twelve, heldLate: Option.some(fileAt(11).key) }))(
  "the sweep of files no asset holds",
  (it) => {
    it.effect(
      "lists ten pages a run, goes on where it stopped, and keeps a file whose asset came meanwhile",
      () =>
        Effect.gen(function* spansRuns() {
          const { cursor } = yield* World;
          const sweep = MediaSweeps.use((sweeps) => sweeps.orphans);

          yield* twoDaysOn;

          assert.deepStrictEqual(
            yield* sweep,
            report({ bytes: 100, left: true, swept: 10 })
          );
          assert.deepStrictEqual(
            yield* Ref.get(cursor),
            Option.some({ key: fileAt(9).key, uploadId: Option.none() })
          );
          assert.deepStrictEqual(yield* sweep, report({ bytes: 10, swept: 1 }));
          assert.deepStrictEqual(
            yield* eventsOf,
            twelve.slice(0, 11).map(({ key }) => `remove:${key}`)
          );
          assert.deepStrictEqual(yield* Ref.get(cursor), Option.none());
        })
    );
  }
);

layer(
  sweepsWith({
    files: filesUpTo(3),
    pageSize: 3,
    refused: new Set([fileAt(1).key]),
  })
)("the sweep of files no asset holds, on a store that refuses one", (it) => {
  it.effect("deletes the others, counts the one, and moves on", () =>
    Effect.gen(function* refusedKey() {
      const { cursor } = yield* World;

      yield* twoDaysOn;

      assert.deepStrictEqual(
        yield* MediaSweeps.use((sweeps) => sweeps.orphans),
        report({ bytes: 20, failed: 1, swept: 2 })
      );
      assert.deepStrictEqual(yield* eventsOf, [
        `remove:${fileAt(0).key}`,
        `remove:${fileAt(2).key}`,
      ]);
      assert.deepStrictEqual(yield* Ref.get(cursor), Option.none());
    })
  );
});

// A page of 60 old files, 13 of them unheld: more than a fifth.
const sixty = filesUpTo(60);

layer(
  sweepsWith({
    files: sixty,
    held: new Set(sixty.slice(13).map(({ key }) => key)),
    pageSize: 60,
  })
)("the sweep of files no asset holds, on a page mostly unknown", (it) => {
  it.effect(
    "deletes nothing when more than a fifth of the page is unheld",
    () =>
      Effect.gen(function* share() {
        const { cursor } = yield* World;

        yield* twoDaysOn;

        assert.deepStrictEqual(
          yield* MediaSweeps.use((sweeps) => sweeps.orphans),
          report({ left: true, refused: Option.some("breaker") })
        );
        assert.deepStrictEqual(yield* eventsOf, []);
        assert.deepStrictEqual(yield* Ref.get(cursor), Option.none());
      })
  );
});

layer(sweepsWith({ files: twelve, pageSize: 12 }, { orphansLimit: 5 }))(
  "the sweep of files no asset holds, past its count",
  (it) => {
    it.effect(
      "deletes nothing when a page holds more orphans than its limit",
      () =>
        Effect.gen(function* count() {
          yield* twoDaysOn;

          assert.deepStrictEqual(
            yield* MediaSweeps.use((sweeps) => sweeps.orphans),
            report({ left: true, refused: Option.some("breaker") })
          );
          assert.deepStrictEqual(yield* eventsOf, []);
        })
    );
  }
);

layer(
  sweepsWith({ claimed: false, files: filesUpTo(2), marker: Option.none() })
)("the sweeps, on a media folder without an owner marker", (it) => {
  it.effect("write it naming this database, once, then delete", () =>
    Effect.gen(function* claims() {
      const { marker } = yield* World;

      yield* twoDaysOn;

      assert.strictEqual(
        (yield* MediaSweeps.use((sweeps) => sweeps.orphans)).swept,
        2
      );
      assert.deepStrictEqual(yield* Ref.get(marker), Option.some(selfId));
      assert.deepStrictEqual((yield* eventsOf)[0], `claim:${selfId}`);
    })
  );
});

layer(
  sweepsWith({
    expired: filesUpTo(1),
    files: filesUpTo(2),
    marker: Option.some(otherId),
  })
)("the sweeps, on a media folder another database owns", (it) => {
  it.effect("refuse to delete, and never write the marker", () =>
    Effect.gen(function* foreign() {
      const { marker } = yield* World;

      yield* twoDaysOn;

      assert.deepStrictEqual(
        yield* MediaSweeps.use((sweeps) => sweeps.orphans),
        report({ refused: Option.some("foreign") })
      );
      assert.deepStrictEqual(
        yield* MediaSweeps.use((sweeps) => sweeps.pending),
        report({ refused: Option.some("foreign") })
      );
      assert.deepStrictEqual(yield* eventsOf, []);
      assert.deepStrictEqual(yield* Ref.get(marker), Option.some(otherId));
    })
  );
});

layer(sweepsWith({ files: filesUpTo(2), marker: Option.none() }))(
  "the sweeps, on a media folder whose marker went",
  (it) => {
    it.effect("refuse to delete once this database had claimed it", () =>
      Effect.gen(function* unmarked() {
        yield* twoDaysOn;

        assert.deepStrictEqual(
          yield* MediaSweeps.use((sweeps) => sweeps.orphans),
          report({ refused: Option.some("unmarked") })
        );
        assert.deepStrictEqual(yield* eventsOf, []);
      })
    );
  }
);

// Every port dies: a sweep that is off must reach none of them.
const OffTest = MediaSweeps.layer.pipe(
  Layer.provide(
    Layer.succeed(CurrentSweepPolicy, { ...defaultSweepPolicy, enabled: false })
  ),
  Layer.provide(
    Layer.mergeAll(
      Layer.succeed(
        MediaBucket,
        MediaBucket.of({
          claim: unused,
          listFiles: unused,
          listUploads: unused,
          owner: Effect.die("not used when off"),
        })
      ),
      Layer.succeed(
        MediaSweepStore,
        MediaSweepStore.of({
          cursor: unused,
          erasedFolders: unused,
          expiredUploads: unused,
          forgetExpired: unused,
          forgetFolder: unused,
          holdsAssets: unused,
          identity: unused,
          keptKeys: unused,
          markClaimed: Effect.die("not used when off"),
          saveCursor: unused,
        })
      ),
      Layer.succeed(MediaFolders, MediaFolders.of({ removeWorkspace: unused })),
      Layer.succeed(MediaUsage, MediaUsage.of({ of: unused, release: unused })),
      Layer.succeed(Ids, Ids.of({ next: Effect.die("not used when off") })),
      Layer.succeed(
        MediaStorage,
        MediaStorage.of({
          abortMultipartUpload: unused,
          completeMultipartUpload: unused,
          downloadUrl: unused,
          head: unused,
          listUploadedParts: unused,
          publicUrl: unused,
          read: () => Stream.die("not used when off"),
          remove: unused,
          signUpload: unused,
          signUploadPart: unused,
          startMultipartUpload: unused,
          store: unused,
        })
      )
    )
  )
);

layer(OffTest)("the sweeps, off", (it) => {
  it.effect("list nothing, delete nothing and fail nothing", () =>
    Effect.gen(function* off() {
      const sweeps = yield* MediaSweeps;

      for (const sweep of [
        sweeps.pending,
        sweeps.uploads,
        sweeps.orphans,
        sweeps.folders,
      ]) {
        assert.deepStrictEqual(yield* sweep, report({}));
      }
    })
  );
});

const shown = fileAt(21);
const drafted = fileAt(20);
const plain = fileAt(22);

layer(
  sweepsWith(
    {
      expired: [shown, drafted, plain],
      scheduled: new Set([assetOf(shown)]),
    },
    { batch: 1 }
  )
)("the sweep of uploads never completed", (it) => {
  it.effect(
    "pages past one a scheduled post shows, and takes an asset from drafts only once it is gone",
    () =>
      Effect.gen(function* releasesAfter() {
        yield* twoDaysOn;

        assert.deepStrictEqual(
          yield* MediaSweeps.use((sweeps) => sweeps.pending),
          report({ bytes: 10, left: true, swept: 1 })
        );
        assert.deepStrictEqual(yield* eventsOf, [
          `forget:${assetOf(drafted)}`,
          `release:${assetOf(drafted)}`,
          `remove:${drafted.key}`,
        ]);
      })
  );
});

const erased = [
  WorkspaceIdSchema.make("4f6b1c1e-2a8d-4c3b-9f1e-1a2b3c4d5e70"),
  WorkspaceIdSchema.make("4f6b1c1e-2a8d-4c3b-9f1e-1a2b3c4d5e71"),
  WorkspaceIdSchema.make("4f6b1c1e-2a8d-4c3b-9f1e-1a2b3c4d5e72"),
  WorkspaceIdSchema.make("4f6b1c1e-2a8d-4c3b-9f1e-1a2b3c4d5e73"),
] as const;

layer(
  sweepsWith({
    erased,
    stuck: new Set([erased[2]]),
    withAssets: new Set([erased[1]]),
  })
)("the sweep of erased workspaces' folders", (it) => {
  it.effect(
    "empties the others when one is stuck, and leaves one whose workspace has media",
    () =>
      Effect.gen(function* folders() {
        yield* twoDaysOn;

        assert.deepStrictEqual(
          yield* MediaSweeps.use((sweeps) => sweeps.folders),
          report({ bytes: 60, failed: 2, swept: 6 })
        );
        assert.deepStrictEqual(yield* eventsOf, [
          `empty:${erased[0]}`,
          `forget-folder:${erased[0]}`,
          `empty:${erased[3]}`,
          `forget-folder:${erased[3]}`,
        ]);
      })
  );
});
