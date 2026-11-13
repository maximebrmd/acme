import { Effect, Option } from "effect";
import type { DateTime } from "effect";

import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { StorageAllowance } from "#media/application/ports/storage-allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * What a workspace may store and what its pool stores now, uploads that
 * may still arrive included: the first check of an upload, before the
 * store is asked anything. `MediaAssets.insertWithin` counts again under
 * the locks.
 */
export const pooledRoom = Effect.fn("Media.pooledRoom")(function* pooledRoom(
  workspaceId: WorkspaceId,
  pendingSince: DateTime.Utc
) {
  const allowed = yield* StorageAllowance;
  const assets = yield* MediaAssets;
  const allowance = yield* allowed.bytes(workspaceId);

  // Nothing limited: no pool is read.
  if (Option.isNone(allowance)) {
    return {
      allowance,
      sharedWith: Effect.succeed<readonly WorkspaceId[]>([]),
      stored: 0,
    };
  }

  const others = yield* allowed.sharedWith(workspaceId);

  return {
    allowance,
    sharedWith: allowed.sharedWith(workspaceId),
    stored: yield* assets.storedAcross([workspaceId, ...others], pendingSince),
  };
});
