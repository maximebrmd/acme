import { Context, DateTime, Effect, Layer } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

import { MediaAssets } from "./ports/media-assets.ts";
import { CurrentUploadPolicy } from "./upload-policy.ts";

/**
 * How many bytes of media a workspace stores, uploads that may still
 * arrive included, for the billing page: what its storage allowance counts.
 */
export class MediaStorageUsage extends Context.Service<
  MediaStorageUsage,
  {
    readonly stored: (workspaceId: WorkspaceId) => Effect.Effect<number>;
    /**
     * The bytes each of these workspaces stores, in one query; one that
     * stores none is left out.
     */
    readonly storedIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, number>>;
  }
>()("peal-server/media/application/MediaStorageUsage") {
  static readonly layer = Layer.effect(
    MediaStorageUsage,
    Effect.gen(function* MediaStorageUsageLive() {
      const assets = yield* MediaAssets;

      const stored = Effect.fn("MediaStorageUsage.stored")(function* stored(
        workspaceId: WorkspaceId
      ) {
        const policy = yield* CurrentUploadPolicy;
        const now = yield* DateTime.now;

        return yield* assets.storedBytes(
          workspaceId,
          DateTime.subtractDuration(now, policy.partUploadExpiry)
        );
      });

      const storedIn = Effect.fn("MediaStorageUsage.storedIn")(
        function* storedIn(workspaceIds: readonly WorkspaceId[]) {
          const policy = yield* CurrentUploadPolicy;
          const now = yield* DateTime.now;

          return yield* assets.storedBytesIn(
            workspaceIds,
            DateTime.subtractDuration(now, policy.partUploadExpiry)
          );
        }
      );

      return MediaStorageUsage.of({ stored, storedIn });
    })
  );
}
