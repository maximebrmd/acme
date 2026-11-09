import { DateTime, Effect, Layer, Option } from "effect";
import type { Duration, Scope } from "effect";

import { MediaAssets } from "#media/application/ports/media-assets.ts";
import type { InvalidMediaTransition } from "#media/domain/invalid-media-transition.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import type { MediaAsset } from "#media/domain/media-asset.ts";
import {
  markRejected,
  markReady,
  markUploaded,
  startUpload,
} from "#media/domain/media-asset.ts";
import { kindOf } from "#media/domain/media-format.ts";
import type { MediaContentType } from "#media/domain/media-format.ts";
import type { Dimensions } from "#media/domain/media-metadata.ts";
import { MediaMetadata } from "#media/domain/media-metadata.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { LibraryAttachableMedia } from "#publishing/infrastructure/library-attachable-media.ts";
import { newId } from "#shared/application/ids.ts";
import type { MediaAssetId, WorkspaceId } from "#shared/domain/ids.ts";
import { MediaTestLive, storageSettings } from "#test/media/support.ts";
import { setTime } from "#test/publishing/infrastructure/harness.ts";
import { postsServerWith } from "#test/publishing/posts-server.ts";

// Posts with the media the media context's library holds: the real adapter
// over the media context, on Postgres and the development store's settings. Tests
// write synthetic media of any status through the library's repository.

/** The adapter as the server runs it, with the library it reads. */
export const LibraryMediaTest = LibraryAttachableMedia.pipe(
  Layer.provide(MediaTestLive),
  Layer.provide(storageSettings)
);

/** The posts server with LibraryMediaTest. */
export const PostsWithLibraryTest = postsServerWith(LibraryMediaTest);

/** Runs `test` on a fresh PostsWithLibraryTest at virtual time `start`. */
export const onPostsWithLibraryAt = <A, E>(
  start: string,
  test: Effect.Effect<
    A,
    E,
    Layer.Success<typeof PostsWithLibraryTest> | Scope.Scope
  >
) =>
  setTime(start).pipe(
    Effect.andThen(test.pipe(Effect.provide(PostsWithLibraryTest)))
  );

/** Where a stored synthetic file is in its life. */
export type StoredStatus = "pending" | "uploaded" | "ready" | "rejected";

export interface StoredMedia {
  readonly byteSize?: number;
  readonly contentType?: MediaContentType;
  readonly dimensions?: Dimensions;
  readonly duration?: Duration.Duration;
  readonly status?: StoredStatus;
}

/**
 * Records a synthetic file of the workspace, by default a ready 200 kB JPEG
 * of 1200×800, with no file behind it in the store.
 */
export const storeMedia = Effect.fn("test.storeMedia")(function* storeMedia(
  workspaceId: WorkspaceId,
  {
    byteSize = 200_000,
    contentType = "image/jpeg",
    dimensions = { height: 800, width: 1200 },
    duration,
    status = "ready",
  }: StoredMedia = {}
) {
  const id = yield* newId(MediaAssetIdSchema);
  const now = yield* DateTime.now;

  const pending = startUpload(
    {
      accepted: { byteSize, contentType, kind: kindOf(contentType) },
      altText: Option.none(),
      id,
      upload: { _tag: "single" },
      workspaceId,
    },
    now
  );

  const uploaded = yield* Effect.fromResult(markUploaded(pending, now)).pipe(
    Effect.orDie
  );

  const metadata = new MediaMetadata({
    codec: Option.none(),
    dimensions: Option.some(dimensions),
    duration: Option.fromUndefinedOr(duration),
  });

  const stored: Record<
    StoredStatus,
    Effect.Effect<MediaAsset, InvalidMediaTransition>
  > = {
    pending: Effect.succeed(pending),
    ready: Effect.fromResult(markReady(uploaded, metadata, now)),
    rejected: Effect.fromResult(markRejected(uploaded, "sizeMismatch", now)),
    uploaded: Effect.succeed(uploaded),
  };

  const asset = yield* stored[status].pipe(Effect.orDie);

  yield* MediaAssets.use((assets) => assets.insert(asset)).pipe(
    Effect.provide(DrizzleMediaAssetsLive)
  );

  return id;
});

/** Deletes the record of the workspace's media, as deleting it does. */
export const removeMedia = (workspaceId: WorkspaceId, assetId: MediaAssetId) =>
  MediaAssets.use((assets) => assets.remove(workspaceId, assetId)).pipe(
    Effect.provide(DrizzleMediaAssetsLive)
  );
