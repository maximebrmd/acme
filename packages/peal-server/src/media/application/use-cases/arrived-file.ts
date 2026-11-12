import { DateTime, Effect, Option, Ref, Stream } from "effect";
import type { DateTime as DateTimeType } from "effect";

import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { StorageAllowance } from "#media/application/ports/storage-allowance.ts";
import { CurrentUploadPolicy } from "#media/application/upload-policy.ts";
import { finishUpload } from "#media/application/use-cases/finish-upload.ts";
import type { AltText } from "#media/domain/alt-text.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import { acceptUpload, startUpload } from "#media/domain/media-asset.ts";
import { kindOf, maxByteSize } from "#media/domain/media-format.ts";
import type { MediaContentType } from "#media/domain/media-format.ts";
import { sniffContentType } from "#media/domain/media-signature.ts";
import { MediaTooLarge } from "#media/domain/media-too-large.ts";
import { storageKeyFor } from "#media/domain/storage-key.ts";
import type { StorageKey } from "#media/domain/storage-key.ts";
import { UnsupportedMediaType } from "#media/domain/unsupported-media-type.ts";
import { roomFor } from "#shared/domain/allowance.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

// The second half of every file that reaches the server itself rather
// than the store, an import from a link or an image the assistant made:
// its format read from its first bytes, its size counted as it comes
// against the kind's limit and the plan's storage, its bytes stored in
// parts, then the asset recorded under the workspace's lock, completed and
// probed as an upload.

/** A file as it reaches the server, read as it arrives. */
export interface ArrivingFile<E> {
  /** The bytes after `start`, to the end of the file. */
  readonly rest: Stream.Stream<Uint8Array, E>;
  /** The size its source declares, if it does: not to be trusted. */
  readonly declaredSize: Option.Option<number>;
  /** The content type its source declares, if any: not to be trusted. */
  readonly declaredType: Option.Option<string>;
  /** Its first bytes: enough to tell its format. */
  readonly start: Uint8Array;
}

/** The room a workspace has, as it stood when a file started to arrive. */
export interface ArrivalRoom {
  readonly allowance: Allowance;
  readonly now: DateTimeType.Utc;
  /** Uploads started before this will never arrive, and take no room. */
  readonly pendingSince: DateTimeType.Utc;
  readonly stored: number;
}

/** Where an arrived file was stored, and what it is. */
export interface StoredArrival {
  readonly byteSize: number;
  readonly contentType: MediaContentType;
  readonly key: StorageKey;
}

/**
 * The workspace's room, which must hold `atLeast` bytes more (else
 * `PlanLimitReached` `mediaStorage`, before anything is fetched or made).
 */
export const roomIn = Effect.fn("Media.roomIn")(function* roomIn(
  workspaceId: WorkspaceId,
  atLeast: number
) {
  const policy = yield* CurrentUploadPolicy;
  const now = yield* DateTime.now;

  const allowance = yield* StorageAllowance.use((allowed) =>
    allowed.bytes(workspaceId)
  );

  // An upload not finished within its URLs' life never will be.
  const pendingSince = DateTime.subtractDuration(now, policy.partUploadExpiry);

  const room: ArrivalRoom = {
    allowance,
    now,
    pendingSince,
    stored: yield* MediaAssets.use((assets) =>
      assets.storedBytes(workspaceId, pendingSince)
    ),
  };

  yield* Effect.fromResult(
    roomFor("mediaStorage", room.allowance, room.stored, atLeast)
  );

  return room;
});

// What a file's source says it is, for the refusal of one Peal does not take.
const declaredTypeOf = <E>(file: ArrivingFile<E>) =>
  Option.getOrElse(file.declaredType, () => "application/octet-stream");

// The file's format, from its first bytes alone.
const formatOf = <E>(file: ArrivingFile<E>) =>
  Option.match(sniffContentType(file.start), {
    onNone: () =>
      Effect.fail(
        new UnsupportedMediaType({ contentType: declaredTypeOf(file) })
      ),
    onSome: Effect.succeed,
  });

// Fails once `byteSize` bytes are more than the kind allows, or than the
// workspace has room for.
const fits = (
  contentType: MediaContentType,
  room: ArrivalRoom,
  byteSize: number
) =>
  Effect.gen(function* fitting() {
    const kind = kindOf(contentType);
    const limit = maxByteSize[kind];

    if (byteSize > limit) {
      return yield* new MediaTooLarge({ byteSize, kind, maxByteSize: limit });
    }

    return yield* Effect.fromResult(
      roomFor("mediaStorage", room.allowance, room.stored, byteSize)
    );
  });

// The file's bytes, which fail as soon as there are too many: whatever its
// source declared, nothing past the limits is read or stored.
const boundedBytes = <E>(
  file: ArrivingFile<E>,
  contentType: MediaContentType,
  room: ArrivalRoom
) =>
  Stream.unwrap(
    Ref.make(0).pipe(
      Effect.map((received) =>
        Stream.concat(Stream.make(file.start), file.rest).pipe(
          Stream.tap((chunk) =>
            Ref.updateAndGet(
              received,
              (total) => total + chunk.byteLength
            ).pipe(Effect.flatMap((total) => fits(contentType, room, total)))
          )
        )
      )
    )
  );

/**
 * Stores the file's bytes under the asset's key, in parts, never held
 * whole: its format from its first bytes (`accepts` may refuse it), what
 * its source declares refused before a byte more is read, and every byte
 * counted against the kind's limit and the room.
 */
export const storeArriving = Effect.fn("Media.storeArriving")(
  function* storeArriving<E>(
    file: ArrivingFile<E>,
    {
      accepts = () => true,
      id,
      room,
      workspaceId,
    }: {
      readonly accepts?: (contentType: MediaContentType) => boolean;
      readonly id: MediaAssetId;
      readonly room: ArrivalRoom;
      readonly workspaceId: WorkspaceId;
    }
  ) {
    const contentType = yield* formatOf(file);

    if (!accepts(contentType)) {
      return yield* new UnsupportedMediaType({ contentType });
    }

    if (Option.isSome(file.declaredSize)) {
      yield* fits(contentType, room, file.declaredSize.value);
    }

    const key = storageKeyFor(workspaceId, id, contentType);

    const byteSize = yield* MediaStorage.use((storage) =>
      storage.store({
        bytes: boundedBytes(file, contentType, room),
        contentType,
        key,
      })
    );

    const stored: StoredArrival = { byteSize, contentType, key };

    return stored;
  }
);

/**
 * Records the stored file as an asset of the workspace, counted again
 * under the workspace's lock with what was stored meanwhile (a file that
 * no longer fits leaves the store), then completes and probes it as
 * `finishUpload` does.
 */
export const recordArrived = Effect.fn("Media.recordArrived")(
  function* recordArrived({
    aiGenerated,
    altText,
    id,
    room,
    stored,
    workspaceId,
  }: {
    readonly aiGenerated: boolean;
    readonly altText: Option.Option<AltText>;
    readonly id: MediaAssetId;
    readonly room: ArrivalRoom;
    readonly stored: StoredArrival;
    readonly workspaceId: WorkspaceId;
  }) {
    const accepted = yield* Effect.fromResult(
      acceptUpload(stored.contentType, stored.byteSize)
    );

    const asset = startUpload(
      {
        accepted,
        aiGenerated,
        altText,
        id,
        upload: { _tag: "single" },
        workspaceId,
      },
      room.now
    );

    const storage = yield* MediaStorage;

    yield* MediaAssets.use((assets) =>
      assets.insertWithin(asset, room.allowance, room.pendingSince)
    ).pipe(
      Effect.onError(() => storage.remove(stored.key).pipe(Effect.ignore))
    );

    return yield* finishUpload({ assetId: id, workspaceId });
  }
);
