import { Effect } from "effect";
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

  const [allowance, others] = yield* Effect.all([
    allowed.bytes(workspaceId),
    allowed.sharedWith(workspaceId),
  ]);

  const own = yield* assets.storedBytes(workspaceId, pendingSince);
  const elsewhere = yield* assets.storedBytesIn(others, pendingSince);

  return {
    allowance,
    sharedWith: allowed.sharedWith(workspaceId),
    stored: [...elsewhere.values()].reduce((sum, bytes) => sum + bytes, own),
  };
});
