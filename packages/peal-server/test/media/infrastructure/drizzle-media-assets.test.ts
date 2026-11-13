import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { eq } from "drizzle-orm";
import { DateTime, Duration, Effect, Layer, Option } from "effect";

import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { AltTextSchema } from "#media/domain/alt-text.ts";
import { fileNameOf } from "#media/domain/file-name.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { MediaAsset, startUpload } from "#media/domain/media-asset.ts";
import { maxDuration, MediaMetadata } from "#media/domain/media-metadata.ts";
import type { MediaStatus } from "#media/domain/media-status.ts";
import { MultipartUploadIdSchema } from "#media/domain/media-status.ts";
import { storageKeyFor } from "#media/domain/storage-key.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { mediaAssets } from "#media/infrastructure/schema.ts";
import { Ids } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { DatabaseTest } from "#test/media/support.ts";

// A workspace that shares its storage with no other.
const alone = Effect.succeed<readonly WorkspaceId[]>([]);

const RepositoryTest = DrizzleMediaAssetsLive.pipe(
  Layer.provideMerge(DatabaseTest)
);

const createdAt = DateTime.makeUnsafe("2026-06-15T07:00:00.123Z");

const later = DateTime.makeUnsafe("2026-06-15T07:05:00.456Z");

// A pending video in a workspace of its own.
const freshAsset = Effect.gen(function* freshAsset() {
  const ids = yield* Ids;
  const workspaceId = WorkspaceIdSchema.make(yield* ids.next);
  const id = MediaAssetIdSchema.make(yield* ids.next);

  return startUpload(
    {
      accepted: {
        byteSize: 3_000_000_000,
        contentType: "video/quicktime",
        kind: "video",
      },
      altText: Option.none(),
      id,
      upload: { _tag: "single" },
      workspaceId,
    },
    createdAt
  );
});

const changed = (
  asset: MediaAsset,
  status: MediaStatus,
  metadata = asset.metadata
): MediaAsset =>
  new MediaAsset({
    aiGenerated: asset.aiGenerated,
    altText: asset.altText,
    byteSize: asset.byteSize,
    contentType: asset.contentType,
    createdAt: asset.createdAt,
    fileName: asset.fileName,
    id: asset.id,
    metadata,
    status,
    storageKey: asset.storageKey,
    updatedAt: later,
    workspaceId: asset.workspaceId,
  });

const uploaded: MediaStatus = { _tag: "uploaded", probe: "pending" };

const probed = new MediaMetadata({
  codec: Option.some("h264"),
  dimensions: Option.some({ height: 1920, width: 1080 }),
  duration: Option.some(Duration.millis(12_345)),
});

layer(RepositoryTest)("the Drizzle media assets", (it) => {
  it.effect(
    "counts the bytes stored and in flight, and refuses an asset past the allowance",
    () =>
      Effect.gen(function* storage() {
        const assets = yield* MediaAssets;
        const first = yield* freshAsset;
        const { workspaceId } = first;
        const ids = yield* Ids;

        // Pending uploads started after this may still arrive.
        const since = DateTime.makeUnsafe("2026-06-15T06:00:00Z");
        const allowance = Option.some(5_000_000_000);

        yield* assets.insertWithin(first, allowance, since, alone);

        assert.strictEqual(
          yield* assets.storedBytes(workspaceId, since),
          3_000_000_000
        );

        const secondId = MediaAssetIdSchema.make(yield* ids.next);

        const second = new MediaAsset({
          aiGenerated: first.aiGenerated,
          altText: first.altText,
          byteSize: first.byteSize,
          contentType: first.contentType,
          createdAt: first.createdAt,
          fileName: first.fileName,
          id: secondId,
          metadata: first.metadata,
          status: first.status,
          storageKey: storageKeyFor(workspaceId, secondId, first.contentType),
          updatedAt: first.updatedAt,
          workspaceId,
        });

        const refused = yield* assets
          .insertWithin(second, allowance, since, alone)
          .pipe(Effect.flip);

        assert.deepInclude(refused, {
          _tag: "PlanLimitReached",
          allowed: 5_000_000_000,
          limit: "mediaStorage",
        });

        // An upload too old to arrive counts for nothing; no limit takes it.
        assert.strictEqual(yield* assets.storedBytes(workspaceId, later), 0);

        yield* assets.insertWithin(second, Option.none(), since, alone);

        assert.strictEqual(
          yield* assets.storedBytes(workspaceId, since),
          6_000_000_000
        );

        // Several workspaces at once, those that store nothing left out.
        const other = yield* freshAsset;

        yield* assets.insert(other);

        assert.deepStrictEqual(
          yield* assets.storedBytesIn(
            [
              workspaceId,
              other.workspaceId,
              WorkspaceIdSchema.make(yield* ids.next),
            ],
            since
          ),
          new Map([
            [workspaceId, 6_000_000_000],
            [other.workspaceId, other.byteSize],
          ])
        );
        assert.deepStrictEqual(
          yield* assets.storedBytesIn([workspaceId], later),
          new Map()
        );
      })
  );

  it.effect(
    "counts a pool's bytes with the workspace's, and asks for no pool where nothing is limited",
    () =>
      Effect.gen(function* pooled() {
        const assets = yield* MediaAssets;
        const ids = yield* Ids;
        const since = DateTime.makeUnsafe("2026-06-15T06:00:00Z");
        const first = yield* freshAsset;
        const other = WorkspaceIdSchema.make(yield* ids.next);

        yield* assets.insertWithin(first, Option.none(), since, alone);

        const secondId = MediaAssetIdSchema.make(yield* ids.next);

        const second = new MediaAsset({
          aiGenerated: first.aiGenerated,
          altText: first.altText,
          byteSize: first.byteSize,
          contentType: first.contentType,
          createdAt: first.createdAt,
          fileName: first.fileName,
          id: secondId,
          metadata: first.metadata,
          status: first.status,
          storageKey: storageKeyFor(other, secondId, first.contentType),
          updatedAt: first.updatedAt,
          workspaceId: other,
        });

        // The first workspace's 3 GB count against the pool's 5 GB.
        const refused = yield* assets
          .insertWithin(
            second,
            Option.some(5_000_000_000),
            since,
            Effect.succeed([first.workspaceId])
          )
          .pipe(Effect.flip);

        assert.deepInclude(refused, {
          _tag: "PlanLimitReached",
          used: 3_000_000_000,
        });

        // No limit: the pool is never asked for.
        yield* assets.insertWithin(
          second,
          Option.none(),
          since,
          Effect.die("no pool is read without a limit")
        );

        assert.strictEqual(
          yield* assets.storedAcross([first.workspaceId, other], since),
          6_000_000_000
        );
      })
  );

  it.effect("counts the bytes of as many workspaces as a partner holds", () =>
    Effect.gen(function* many() {
      const assets = yield* MediaAssets;
      const since = DateTime.makeUnsafe("2026-06-15T06:00:00Z");
      const first = yield* freshAsset;

      yield* assets.insertWithin(first, Option.none(), since, alone);

      // More than a statement's 65,535 parameters.
      const pool = [
        first.workspaceId,
        ...Array.from({ length: 70_000 }, () =>
          WorkspaceIdSchema.make(randomUUID())
        ),
      ];

      assert.strictEqual(
        yield* assets.storedAcross(pool, since),
        3_000_000_000
      );
      assert.strictEqual(
        (yield* assets.storedBytesIn(pool, since)).get(first.workspaceId),
        3_000_000_000
      );
    })
  );

  it.effect("keeps every status and what a probe found", () =>
    Effect.gen(function* roundTrips() {
      const assets = yield* MediaAssets;
      const asset = yield* freshAsset;

      yield* assets.insert(asset);

      const found = (): Effect.Effect<Option.Option<MediaAsset>> =>
        assets.findById(asset.workspaceId, asset.id);

      assert.deepStrictEqual(yield* found(), Option.some(asset));

      const versions = [
        changed(asset, {
          _tag: "pending",
          upload: {
            _tag: "multipart",
            partSize: 8 * 1024 * 1024,
            uploadId: MultipartUploadIdSchema.make("synthetic-upload-id"),
          },
        }),
        changed(asset, { _tag: "uploaded", probe: "pending" }),
        changed(asset, { _tag: "uploaded", probe: "unavailable" }),
        changed(asset, { _tag: "uploaded", probe: "timedOut" }),
        changed(asset, { _tag: "ready" }, probed),
        changed(asset, { _tag: "rejected", reason: "typeMismatch" }),
      ];

      let from = asset.status._tag;

      for (const version of versions) {
        assert.deepStrictEqual(yield* assets.update(version, from), version);
        assert.deepStrictEqual(yield* found(), Option.some(version));

        from = version.status._tag;
      }
    })
  );

  it.effect("keeps a change saved since the asset was read", () =>
    Effect.gen(function* staleWrite() {
      const assets = yield* MediaAssets;
      const asset = yield* freshAsset;
      const ready = changed(asset, { _tag: "ready" }, probed);

      yield* assets.insert(asset);
      yield* assets.update(changed(asset, uploaded), "pending");
      yield* assets.update(ready, "uploaded");

      // A call that read the asset while it was pending saves too late.
      const stale = changed(asset, uploaded);

      assert.deepStrictEqual(yield* assets.update(stale, "pending"), ready);
      assert.deepStrictEqual(
        yield* assets.findById(asset.workspaceId, asset.id),
        Option.some(ready)
      );
    })
  );

  it.effect("keeps the longest duration a probe records", () =>
    Effect.gen(function* longest() {
      const assets = yield* MediaAssets;
      const asset = yield* freshAsset;

      const ready = changed(
        asset,
        { _tag: "ready" },
        new MediaMetadata({
          codec: probed.codec,
          dimensions: probed.dimensions,
          duration: Option.some(maxDuration),
        })
      );

      yield* assets.insert(ready);

      assert.deepStrictEqual(
        yield* assets.findById(asset.workspaceId, asset.id),
        Option.some(ready)
      );
    })
  );

  it.effect("finds an asset only in its own workspace", () =>
    Effect.gen(function* scoped() {
      const assets = yield* MediaAssets;
      const asset = yield* freshAsset;
      const other = yield* freshAsset;

      yield* assets.insert(asset);

      assert.deepStrictEqual(
        yield* assets.findById(other.workspaceId, asset.id),
        Option.none()
      );

      yield* assets.remove(other.workspaceId, asset.id);

      assert.isTrue(
        Option.isSome(yield* assets.findById(asset.workspaceId, asset.id))
      );
    })
  );

  it.effect("removes an asset, and does not bring it back on update", () =>
    Effect.gen(function* removes() {
      const assets = yield* MediaAssets;
      const asset = yield* freshAsset;

      yield* assets.insert(asset);
      yield* assets.remove(asset.workspaceId, asset.id);
      yield* assets.remove(asset.workspaceId, asset.id);

      const error = yield* Effect.flip(
        assets.update(changed(asset, uploaded), "pending")
      );

      assert.strictEqual(error._tag, "MediaAssetNotFound");
      assert.deepStrictEqual(
        yield* assets.findById(asset.workspaceId, asset.id),
        Option.none()
      );
    })
  );
  it.effect("keeps the mark of a file made by AI", () =>
    Effect.gen(function* marks() {
      const assets = yield* MediaAssets;
      const plain = yield* freshAsset;
      const id = MediaAssetIdSchema.make(yield* (yield* Ids).next);

      const generated = startUpload(
        {
          accepted: { byteSize: 100, contentType: "image/png", kind: "image" },
          aiGenerated: true,
          altText: Option.none(),
          id,
          upload: { _tag: "single" },
          workspaceId: plain.workspaceId,
        },
        createdAt
      );

      yield* Effect.forEach([plain, generated], assets.insert);

      const page = yield* assets.list(plain.workspaceId, {
        after: Option.none(),
        kind: Option.none(),
        limit: 10,
        text: Option.none(),
      });

      assert.deepStrictEqual(
        page.assets.map((asset) => [asset.id, asset.aiGenerated]),
        [
          [generated.id, true],
          [plain.id, false],
        ]
      );
    })
  );

  it.effect("lists a workspace's assets newest first, a page at a time", () =>
    Effect.gen(function* lists() {
      const assets = yield* MediaAssets;
      const first = yield* freshAsset;
      const ids = yield* Ids;

      // Five assets of one workspace, and one of another.
      const mine = [first];

      for (let count = 0; count < 4; count += 1) {
        const id = MediaAssetIdSchema.make(yield* ids.next);

        mine.push(
          startUpload(
            {
              accepted: {
                byteSize: 100,
                contentType: "image/png",
                kind: "image",
              },
              altText: Option.none(),
              id,
              upload: { _tag: "single" },
              workspaceId: first.workspaceId,
            },
            createdAt
          )
        );
      }

      const theirs = yield* freshAsset;

      yield* Effect.forEach([...mine, theirs], assets.insert);

      const newestFirst = mine.toReversed().map((asset) => asset.id);
      const workspace = first.workspaceId;

      const firstPage = yield* assets.list(workspace, {
        after: Option.none(),
        kind: Option.none(),
        limit: 2,
        text: Option.none(),
      });

      assert.deepStrictEqual(
        firstPage.assets.map((asset) => asset.id),
        newestFirst.slice(0, 2)
      );
      assert.deepStrictEqual(firstPage.next, Option.some(newestFirst[1]));

      const secondPage = yield* assets.list(workspace, {
        after: firstPage.next,
        kind: Option.none(),
        limit: 2,
        text: Option.none(),
      });

      assert.deepStrictEqual(
        secondPage.assets.map((asset) => asset.id),
        newestFirst.slice(2, 4)
      );

      const lastPage = yield* assets.list(workspace, {
        after: secondPage.next,
        kind: Option.none(),
        limit: 2,
        text: Option.none(),
      });

      assert.deepStrictEqual(
        lastPage.assets.map((asset) => asset.id),
        newestFirst.slice(4)
      );
      assert.deepStrictEqual(lastPage.next, Option.none());

      // Exactly a page left: no next page.
      const exact = yield* assets.list(workspace, {
        after: Option.none(),
        kind: Option.none(),
        limit: 5,
        text: Option.none(),
      });

      assert.strictEqual(exact.assets.length, 5);
      assert.deepStrictEqual(exact.next, Option.none());
    })
  );

  it.effect("keeps a description that a status change read before", () =>
    Effect.gen(function* describes() {
      const assets = yield* MediaAssets;
      const asset = yield* freshAsset;
      const altText = Option.some(AltTextSchema.make("A synthetic video"));

      yield* assets.insert(asset);

      const described = yield* assets.describe(
        asset.workspaceId,
        asset.id,
        altText,
        later
      );

      assert.deepStrictEqual(described.altText, altText);
      assert.deepStrictEqual(described.updatedAt, later);

      // A transition that read the asset before it was described.
      const saved = yield* assets.update(changed(asset, uploaded), "pending");

      assert.deepStrictEqual(saved.altText, altText);
      assert.deepStrictEqual(saved.status, uploaded);
      assert.deepStrictEqual(
        yield* assets.findById(asset.workspaceId, asset.id),
        Option.some(saved)
      );

      const cleared = yield* assets.describe(
        asset.workspaceId,
        asset.id,
        Option.none(),
        later
      );

      assert.deepStrictEqual(cleared.altText, Option.none());
    })
  );

  it.effect("describes an asset only in its own workspace", () =>
    Effect.gen(function* scopedDescription() {
      const assets = yield* MediaAssets;
      const asset = yield* freshAsset;
      const other = yield* freshAsset;

      yield* assets.insert(asset);

      const error = yield* Effect.flip(
        assets.describe(
          other.workspaceId,
          asset.id,
          Option.some(AltTextSchema.make("Not theirs")),
          later
        )
      );

      assert.strictEqual(error._tag, "MediaAssetNotFound");
      assert.deepStrictEqual(
        yield* assets.findById(asset.workspaceId, asset.id),
        Option.some(asset)
      );
    })
  );

  it.effect("reads an uploaded row saved before probes were tracked", () =>
    Effect.gen(function* legacyRow() {
      const assets = yield* MediaAssets;
      const asset = yield* freshAsset;
      const db = yield* Drizzle;

      yield* assets.insert(changed(asset, uploaded));
      yield* db
        .update(mediaAssets)
        .set({ probeState: null })
        .where(eq(mediaAssets.id, asset.id))
        .pipe(Effect.orDie);

      const found = yield* assets.findById(asset.workspaceId, asset.id);

      assert.deepStrictEqual(Option.getOrUndefined(found)?.status, uploaded);
    })
  );
});

// A file of a workspace, with a name and a description, of a content type.
const fileIn = (
  workspaceId: WorkspaceId,
  contentType: "application/pdf" | "image/png" | "video/mp4",
  fileName: string | null,
  altText: string | null
) =>
  Effect.gen(function* file() {
    const id = MediaAssetIdSchema.make(yield* (yield* Ids).next);

    const kinds = {
      "application/pdf": "document",
      "image/png": "image",
      "video/mp4": "video",
    } as const;

    return startUpload(
      {
        accepted: { byteSize: 100, contentType, kind: kinds[contentType] },
        altText: Option.fromNullOr(altText).pipe(
          Option.map((text) => AltTextSchema.make(text))
        ),
        fileName: fileName === null ? Option.none() : fileNameOf(fileName),
        id,
        upload: { _tag: "single" },
        workspaceId,
      },
      createdAt
    );
  });

const everything = {
  after: Option.none(),
  kind: Option.none(),
  limit: 50,
  text: Option.none(),
};

layer(RepositoryTest)("the library's search", (it) => {
  it.effect("keeps a file's name, and none for a file without one", () =>
    Effect.gen(function* names() {
      const assets = yield* MediaAssets;
      const workspaceId = WorkspaceIdSchema.make(yield* (yield* Ids).next);
      const named = yield* fileIn(workspaceId, "image/png", "Été.png", null);
      const nameless = yield* fileIn(workspaceId, "image/png", null, null);

      yield* Effect.forEach([named, nameless], assets.insert);

      assert.deepStrictEqual(
        (yield* assets.findById(workspaceId, named.id)).pipe(
          Option.flatMap((asset) => asset.fileName)
        ),
        fileNameOf("Été.png")
      );
      assert.deepStrictEqual(
        (yield* assets.findById(workspaceId, nameless.id)).pipe(
          Option.flatMap((asset) => asset.fileName)
        ),
        Option.none()
      );
    })
  );

  it.effect(
    "finds text in a name or a description, whatever its case, in the workspace only",
    () =>
      Effect.gen(function* finds() {
        const assets = yield* MediaAssets;
        const ids = yield* Ids;
        const workspaceId = WorkspaceIdSchema.make(yield* ids.next);
        const otherId = WorkspaceIdSchema.make(yield* ids.next);

        const byName = yield* fileIn(
          workspaceId,
          "image/png",
          "Summer-LAUNCH.png",
          null
        );

        const byDescription = yield* fileIn(
          workspaceId,
          "video/mp4",
          "clip.mp4",
          "The launch, from the stage"
        );

        const neither = yield* fileIn(
          workspaceId,
          "image/png",
          "beach.png",
          "Sand"
        );

        const nameless = yield* fileIn(workspaceId, "image/png", null, null);

        const theirs = yield* fileIn(
          otherId,
          "image/png",
          "launch.png",
          "launch"
        );

        yield* Effect.forEach(
          [byName, byDescription, neither, nameless, theirs],
          assets.insert
        );

        const found = yield* assets.list(workspaceId, {
          ...everything,
          text: Option.some("Launch"),
        });

        assert.deepStrictEqual(
          found.assets.map((asset) => asset.id),
          [byDescription.id, byName.id]
        );
      })
  );

  it.effect("reads wildcards in the text as the characters they are", () =>
    Effect.gen(function* literal() {
      const assets = yield* MediaAssets;
      const workspaceId = WorkspaceIdSchema.make(yield* (yield* Ids).next);
      const percent = yield* fileIn(workspaceId, "image/png", "100%.png", null);

      const underscore = yield* fileIn(
        workspaceId,
        "image/png",
        "a_b.png",
        null
      );

      const plain = yield* fileIn(workspaceId, "image/png", "100x.png", null);

      const backslash = yield* fileIn(
        workspaceId,
        "image/png",
        "plain.png",
        String.raw`a\b`
      );

      yield* Effect.forEach(
        [percent, underscore, plain, backslash],
        assets.insert
      );

      const search = (text: string) =>
        assets
          .list(workspaceId, { ...everything, text: Option.some(text) })
          .pipe(Effect.map((page) => page.assets.map((asset) => asset.id)));

      assert.deepStrictEqual(yield* search("0%"), [percent.id]);
      assert.deepStrictEqual(yield* search("a_"), [underscore.id]);
      assert.deepStrictEqual(yield* search(String.raw`a\b`), [backslash.id]);
    })
  );

  it.effect("filters by kind, with the text, a page at a time", () =>
    Effect.gen(function* filters() {
      const assets = yield* MediaAssets;
      const workspaceId = WorkspaceIdSchema.make(yield* (yield* Ids).next);

      const files = [
        yield* fileIn(workspaceId, "video/mp4", "launch-1.mp4", null),
        yield* fileIn(workspaceId, "image/png", "launch-2.png", null),
        yield* fileIn(workspaceId, "video/mp4", "launch-3.mp4", null),
        yield* fileIn(workspaceId, "application/pdf", "launch-4.pdf", null),
        yield* fileIn(workspaceId, "video/mp4", "other.mp4", null),
        yield* fileIn(workspaceId, "video/mp4", "launch-5.mp4", null),
      ];

      yield* Effect.all(files.map((file) => assets.insert(file)));

      const videos = (after: Option.Option<(typeof files)[number]["id"]>) =>
        assets.list(workspaceId, {
          after,
          kind: Option.some("video"),
          limit: 2,
          text: Option.some("launch"),
        });

      const first = yield* videos(Option.none());
      const second = yield* videos(first.next);

      assert.deepStrictEqual(
        [...first.assets, ...second.assets].map((asset) => asset.fileName),
        ["launch-5.mp4", "launch-3.mp4", "launch-1.mp4"].map((name) =>
          fileNameOf(name)
        )
      );
      assert.deepStrictEqual(second.next, Option.none());

      const documents = yield* assets.list(workspaceId, {
        ...everything,
        kind: Option.some("document"),
      });

      assert.deepStrictEqual(
        documents.assets.map((asset) => asset.id),
        [files[3]?.id]
      );
    })
  );
});
