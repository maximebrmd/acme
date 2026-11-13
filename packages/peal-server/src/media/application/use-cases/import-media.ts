import { Effect, Option } from "effect";

import { MediaImportBusy } from "#media/application/media-import-busy.ts";
import { MediaSourceUnreachable } from "#media/application/media-source-unreachable.ts";
import { ImportSlots } from "#media/application/ports/import-slots.ts";
import { RemoteMedia } from "#media/application/ports/remote-media.ts";
import { CurrentUploadPolicy } from "#media/application/upload-policy.ts";
import {
  recordArrived,
  roomIn,
  storeArriving,
} from "#media/application/use-cases/arrived-file.ts";
import { altTextOf } from "#media/domain/alt-text.ts";
import { nameInAddress } from "#media/domain/file-name.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { kindOf } from "#media/domain/media-format.ts";
import type { MediaKind } from "#media/domain/media-format.ts";
import { newId } from "#shared/application/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A file to fetch from an address, for a workspace. */
export interface ImportMediaRequest {
  /** Its description, as the person typed it, if they did. */
  readonly altText: Option.Option<string>;
  /**
   * The kinds of file taken, when only some are: another is refused
   * (UnsupportedMediaType) from its first bytes, before it is stored.
   */
  readonly kinds?: readonly MediaKind[];
  readonly url: string;
  readonly workspaceId: WorkspaceId;
}

/**
 * Fetches a file from a public address and stores it as media of the
 * workspace, as an upload that arrived, named after the last segment of
 * the address that served it: its format is read from its first
 * bytes, its size counted as it comes, against the limit for its kind and
 * the workspace's storage allowance, and its bytes go to the store in
 * parts, never held whole. The asset is recorded once the file is stored,
 * under the workspace's lock, then checked and probed as `finishUpload`
 * does. Anything that fails before leaves no file and no asset; a file the
 * probe finds in another format than it starts with is rejected, as an
 * upload's is. The whole import has `importTimeout`.
 */
export const importMedia = Effect.fn("Media.importMedia")(
  function* importMedia({
    altText,
    kinds,
    url,
    workspaceId,
  }: ImportMediaRequest) {
    const description = yield* Effect.fromResult(
      altTextOf(Option.getOrElse(altText, () => ""))
    );

    // One of the imports the workspace and the server run at once, for
    // as long as this one lasts.
    if (!(yield* ImportSlots.use((slots) => slots.take(workspaceId)))) {
      return yield* new MediaImportBusy();
    }

    const policy = yield* CurrentUploadPolicy;

    // No room for a byte: nothing is fetched.
    const room = yield* roomIn(workspaceId, 1);
    const id = yield* newId(MediaAssetIdSchema);

    const { fileName, stored } = yield* RemoteMedia.use((remote) =>
      remote.open(url)
    ).pipe(
      Effect.flatMap((file) =>
        storeArriving(file, {
          accepts: (contentType) =>
            kinds === undefined || kinds.includes(kindOf(contentType)),
          id,
          room,
          workspaceId,
        }).pipe(
          // Named after the address that served it, redirects followed.
          Effect.map((arrived) => ({
            fileName: nameInAddress(file.address),
            stored: arrived,
          }))
        )
      ),
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

    return yield* recordArrived({
      aiGenerated: false,
      altText: description,
      fileName,
      id,
      room,
      stored,
      workspaceId,
    });
  },
  // The import's slot goes back when it ends, however it ends.
  Effect.scoped
);
