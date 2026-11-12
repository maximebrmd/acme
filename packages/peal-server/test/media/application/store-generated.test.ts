import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Result } from "effect";
import sharp from "sharp";

import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { MediaLibrary } from "#media/container.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import {
  markReady,
  markUploaded,
  startUpload,
} from "#media/domain/media-asset.ts";
import { MediaMetadata } from "#media/domain/media-metadata.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import { Ids } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { everyWorkspaceOn, UnmeteredTest } from "#test/billing/support.ts";
import { syntheticPdf } from "#test/media/pdf.ts";
import {
  damagedPng,
  DatabaseTest,
  fetchBytes,
  mediaTestWith,
  memberIn,
  storageSettings,
  syntheticBytes,
} from "#test/media/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// A file the writing assistant made arrives whole on the server: it is
// stored as it came, marked, and probed as an upload is.

const generating = (entitlements: typeof UnmeteredTest) =>
  Layer.mergeAll(
    mediaTestWith(entitlements),
    S3MediaStorageLive,
    DrizzleMediaAssetsLive
  ).pipe(Layer.provideMerge(DatabaseTest), Layer.provide(storageSettings));

const startedAt = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

const freshWorkspace = Ids.use((ids) => ids.next).pipe(
  Effect.map((uuid) => WorkspaceIdSchema.make(uuid))
);

const generatedPng = Effect.promise(
  async () =>
    new Uint8Array(
      await sharp({
        create: { background: "#3366ff", channels: 3, height: 64, width: 96 },
      })
        .png()
        .toBuffer()
    )
);

const assetsOf = (workspaceId: WorkspaceId) =>
  MediaAssets.use((assets) =>
    assets.list(workspaceId, { after: Option.none(), limit: 10 })
  ).pipe(Effect.map(({ assets }) => assets));

const storeIn = (workspaceId: WorkspaceId, bytes: Uint8Array) =>
  MediaLibrary.use((library) =>
    library.storeGenerated(memberIn(workspaceId), bytes)
  );

layer(generating(UnmeteredTest), { timeout: "60 seconds" })(
  "storing a generated image",
  (it) => {
    it.effect("stores it untouched, marked, and probed", () =>
      Effect.gen(function* stores() {
        const workspaceId = yield* freshWorkspace;
        const png = yield* generatedPng;

        const stored = yield* storeIn(workspaceId, png);

        assert.strictEqual(stored.asset.status._tag, "ready");
        assert.isTrue(stored.asset.aiGenerated);
        assert.strictEqual(stored.asset.workspaceId, workspaceId);
        assert.strictEqual(stored.asset.contentType, "image/png");
        assert.deepStrictEqual(stored.asset.altText, Option.none());
        assert.deepStrictEqual(
          stored.asset.metadata.dimensions,
          Option.some({ height: 64, width: 96 })
        );

        // Byte for byte as the provider gave it, metadata included.
        const { bytes } = yield* fetchBytes(
          Option.getOrElse(stored.url, () => "")
        );

        assert.deepStrictEqual(bytes, png);

        yield* MediaStorage.use((storage) =>
          storage.remove(stored.asset.storageKey)
        );
      })
    );

    it.effect("refuses what is not an image it takes, and keeps nothing", () =>
      Effect.gen(function* refuses() {
        const workspaceId = yield* freshWorkspace;

        const refusals = yield* Effect.forEach(
          [
            syntheticPdf(1),
            syntheticBytes(4096),
            Uint8Array.from(
              syntheticBytes(4096),
              (byte, index) =>
                [0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f][
                  index
                ] ?? byte
            ),
            damagedPng(4096),
            new Uint8Array(0),
          ],
          (bytes) =>
            storeIn(workspaceId, bytes).pipe(
              Effect.flip,
              Effect.map((refusal) => refusal._tag)
            )
        );

        assert.deepStrictEqual(refusals, [
          "GeneratedImageUnusable",
          "GeneratedImageUnusable",
          "GeneratedImageUnusable",
          "GeneratedImageUnusable",
          "GeneratedImageUnusable",
        ]);
        assert.lengthOf(yield* assetsOf(workspaceId), 0);
      })
    );

    it.effect("needs media:upload", () =>
      Effect.gen(function* permission() {
        const workspaceId = yield* freshWorkspace;
        const library = yield* MediaLibrary;
        const viewer = memberIn(workspaceId, permissionsFor("viewer"));

        const refusals = yield* Effect.all([
          library.roomForImage(viewer).pipe(Effect.flip),
          library.storeGenerated(viewer, yield* generatedPng).pipe(Effect.flip),
        ]);

        assert.deepStrictEqual(
          refusals.map((refusal) => refusal._tag),
          ["MissingPermission", "MissingPermission"]
        );
      })
    );
  }
);

layer(generating(everyWorkspaceOn("free")), { timeout: "60 seconds" })(
  "storing a generated image on a plan",
  (it) => {
    it.effect(
      "tells beforehand whether the largest image would fit the plan's storage",
      () =>
        Effect.gen(function* room() {
          const workspaceId = yield* freshWorkspace;
          const library = yield* MediaLibrary;
          const assets = yield* MediaAssets;
          const member = memberIn(workspaceId);

          yield* library.roomForImage(member);

          // A video that leaves less room than the largest image takes.
          const id = MediaAssetIdSchema.make(yield* Ids.use((ids) => ids.next));

          const video = startUpload(
            {
              accepted: {
                byteSize: 490_000_000,
                contentType: "video/mp4",
                kind: "video",
              },
              altText: Option.none(),
              id,
              upload: { _tag: "single" },
              workspaceId,
            },
            startedAt
          );

          yield* assets.insert(
            Result.getOrThrow(
              markReady(
                Result.getOrThrow(markUploaded(video, startedAt)),
                MediaMetadata.unknown,
                startedAt
              )
            )
          );

          const refused = yield* library.roomForImage(member).pipe(Effect.flip);

          assert.deepInclude(refused, {
            _tag: "PlanLimitReached",
            limit: "mediaStorage",
          });

          yield* assets.remove(workspaceId, id);
        })
    );
  }
);
