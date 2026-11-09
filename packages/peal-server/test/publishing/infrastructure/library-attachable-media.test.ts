import { assert, layer } from "@effect/vitest";
import { Duration, Effect, Layer, Option } from "effect";

import { AttachableMedia } from "#publishing/application/attachable-media.ts";
import { MediaFile } from "#publishing/domain/media-file.ts";
import { newId } from "#shared/application/ids.ts";
import { MediaAssetIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import { DatabaseTest } from "#test/media/support.ts";
import {
  LibraryMediaTest,
  storeMedia,
} from "#test/publishing/library-media.ts";
import { actorIn } from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The adapter over the media context's library, on Postgres: what it finds
// is what a post may show.

const AdapterTest = LibraryMediaTest.pipe(Layer.provideMerge(DatabaseTest));

const freshWorkspace = newId(WorkspaceIdSchema);

layer(AdapterTest, { timeout: 60_000 })("LibraryAttachableMedia", (it) => {
  it.effect("finds the workspace's ready media, with what probing found", () =>
    Effect.gen(function* findsReady() {
      const media = yield* AttachableMedia;
      const workspaceId = yield* freshWorkspace;

      const photo = yield* storeMedia(workspaceId, {
        byteSize: 1_500_000,
        contentType: "image/png",
        dimensions: { height: 1350, width: 1080 },
      });

      const clip = yield* storeMedia(workspaceId, {
        byteSize: 40_000_000,
        contentType: "video/mp4",
        dimensions: { height: 1920, width: 1080 },
        duration: Duration.seconds(42),
      });

      const found = yield* media.lookUp(actorIn(workspaceId), [clip, photo]);

      assert.deepStrictEqual(
        found.toSorted((left, right) =>
          left.mediaId.localeCompare(right.mediaId)
        ),
        [
          new MediaFile({
            byteSize: 1_500_000,
            contentType: "image/png",
            dimensions: Option.some({ height: 1350, width: 1080 }),
            duration: Option.none(),
            mediaId: photo,
          }),
          new MediaFile({
            byteSize: 40_000_000,
            contentType: "video/mp4",
            dimensions: Option.some({ height: 1920, width: 1080 }),
            duration: Option.some(Duration.seconds(42)),
            mediaId: clip,
          }),
        ]
      );
    })
  );

  it.effect(
    "leaves out media not ready, another workspace's, and unknown ids",
    () =>
      Effect.gen(function* leavesOut() {
        const media = yield* AttachableMedia;
        const workspaceId = yield* freshWorkspace;
        const other = yield* freshWorkspace;

        const ready = yield* storeMedia(workspaceId);
        const pending = yield* storeMedia(workspaceId, { status: "pending" });
        const uploaded = yield* storeMedia(workspaceId, { status: "uploaded" });
        const rejected = yield* storeMedia(workspaceId, { status: "rejected" });
        const theirs = yield* storeMedia(other);
        const unknown = yield* newId(MediaAssetIdSchema);

        const found = yield* media.lookUp(actorIn(workspaceId), [
          pending,
          uploaded,
          rejected,
          theirs,
          unknown,
          ready,
        ]);

        assert.deepStrictEqual(
          found.map(({ mediaId }) => mediaId),
          [ready]
        );

        // The other workspace finds its own.
        const theirsFound = yield* media.lookUp(actorIn(other), [
          ready,
          theirs,
        ]);

        assert.deepStrictEqual(
          theirsFound.map(({ mediaId }) => mediaId),
          [theirs]
        );
      })
  );

  it.effect("needs media:read, as the library does", () =>
    Effect.gen(function* needsRead() {
      const media = yield* AttachableMedia;
      const workspaceId = yield* freshWorkspace;
      const ready = yield* storeMedia(workspaceId);

      const permissions = permissionsFor("editor").filter(
        (permission) => permission !== "media:read"
      );

      const error = yield* media
        .lookUp(actorIn(workspaceId, permissions), [ready])
        .pipe(Effect.flip);

      assert.instanceOf(error, MissingPermission);
    })
  );
});
