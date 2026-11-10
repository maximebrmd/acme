import { DateTime, Effect, Option, Ref, Stream } from "effect";

import { MediaSourceUnreachable } from "#media/application/media-source-unreachable.ts";
import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { RemoteMedia } from "#media/application/ports/remote-media.ts";
import type { RemoteFile } from "#media/application/ports/remote-media.ts";
import { StorageAllowance } from "#media/application/ports/storage-allowance.ts";
import { CurrentUploadPolicy } from "#media/application/upload-policy.ts";
import { finishUpload } from "#media/application/use-cases/finish-upload.ts";
import { altTextOf } from "#media/domain/alt-text.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { acceptUpload, startUpload } from "#media/domain/media-asset.ts";
import { kindOf, maxByteSize } from "#media/domain/media-format.ts";
import type { MediaContentType } from "#media/domain/media-format.ts";
import { sniffContentType } from "#media/domain/media-signature.ts";
import { MediaTooLarge } from "#media/domain/media-too-large.ts";
import { storageKeyFor } from "#media/domain/storage-key.ts";
import { UnsupportedMediaType } from "#media/domain/unsupported-media-type.ts";
import { newId } from "#shared/application/ids.ts";
import { roomFor } from "#shared/domain/allowance.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A file to fetch from an address, for a workspace. */
export interface ImportMediaRequest {
  /** Its description, as the person typed it, if they did. */
  readonly altText: Option.Option<string>;
  readonly url: string;
  readonly workspaceId: WorkspaceId;
}

// The room a workspace has, and what it stores already.
interface Room {
  readonly allowance: Allowance;
  readonly stored: number;
}

// What a file's host says it is, for the refusal of one Peal does not take.
const declaredTypeOf = (file: RemoteFile) =>
  Option.getOrElse(file.declaredType, () => "application/octet-stream");

// The file's format, from its first bytes alone.
const formatOf = (file: RemoteFile) =>
  Option.match(sniffContentType(file.start), {
    onNone: () =>
      Effect.fail(
        new UnsupportedMediaType({ contentType: declaredTypeOf(file) })
      ),
    onSome: Effect.succeed,
  });

// Fails once `byteSize` bytes are more than the kind allows, or than the
// workspace has room for.
const fits = (contentType: MediaContentType, room: Room, byteSize: number) =>
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
// host declared, nothing past the limits is fetched or stored.
const boundedBytes = (
  file: RemoteFile,
  contentType: MediaContentType,
  room: Room
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
 * Fetches a file from a public address and stores it as media of the
 * workspace, as an upload that arrived: its format is read from its first
 * bytes, its size counted as it comes, against the limit for its kind and
 * the workspace's storage allowance, and its bytes go to the store in
 * parts, never held whole. The asset is recorded once the file is stored,
 * under the workspace's lock, then checked and probed as `finishUpload`
 * does. Anything that fails before leaves no file and no asset; a file the
 * probe finds in another format than it starts with is rejected, as an
 * upload's is. The whole import has `importTimeout`.
 */
export const importMedia = Effect.fn("Media.importMedia")(
  function* importMedia({ altText, url, workspaceId }: ImportMediaRequest) {
    const description = yield* Effect.fromResult(
      altTextOf(Option.getOrElse(altText, () => ""))
    );

    const policy = yield* CurrentUploadPolicy;
    const storage = yield* MediaStorage;
    const assets = yield* MediaAssets;
    const now = yield* DateTime.now;

    const allowance = yield* StorageAllowance.use((allowed) =>
      allowed.bytes(workspaceId)
    );

    // An upload not finished within its URLs' life never will be.
    const pendingSince = DateTime.subtractDuration(
      now,
      policy.partUploadExpiry
    );

    const room: Room = {
      allowance,
      stored: yield* assets.storedBytes(workspaceId, pendingSince),
    };

    // No room for a byte: nothing is fetched.
    yield* Effect.fromResult(
      roomFor("mediaStorage", room.allowance, room.stored, 1)
    );

    const id = yield* newId(MediaAssetIdSchema);

    const stored = yield* Effect.gen(function* fetching() {
      const file = yield* RemoteMedia.use((remote) => remote.open(url));
      const contentType = yield* formatOf(file);

      // What the host declares is refused before a byte more is read.
      if (Option.isSome(file.declaredSize)) {
        yield* fits(contentType, room, file.declaredSize.value);
      }

      const key = storageKeyFor(workspaceId, id, contentType);

      const byteSize = yield* storage.store({
        bytes: boundedBytes(file, contentType, room),
        contentType,
        key,
      });

      return { byteSize, contentType, key };
    }).pipe(
      Effect.scoped,
      Effect.timeoutOrElse({
        duration: policy.importTimeout,
        orElse: () =>
          Effect.fail(
            new MediaSourceUnreachable({
              reason: "tooSlow",
              status: Option.none(),
            })
          ),
      })
    );

    const accepted = yield* Effect.fromResult(
      acceptUpload(stored.contentType, stored.byteSize)
    );

    const asset = startUpload(
      {
        accepted,
        altText: description,
        id,
        upload: { _tag: "single" },
        workspaceId,
      },
      now
    );

    // Counted again under the workspace's lock, with what was stored
    // meanwhile: a file that no longer fits leaves the store.
    yield* assets
      .insertWithin(asset, allowance, pendingSince)
      .pipe(
        Effect.onError(() => storage.remove(stored.key).pipe(Effect.ignore))
      );

    return yield* finishUpload({ assetId: id, workspaceId });
  }
);
