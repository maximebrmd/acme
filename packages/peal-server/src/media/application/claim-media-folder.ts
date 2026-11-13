import { Effect, Option } from "effect";

import { Ids } from "#shared/application/ids.ts";

import { MediaFolderNotClaimed } from "./media-folder-not-claimed.ts";
import { MediaBucket } from "./ports/media-bucket.ts";
import type { OwnerMarker } from "./ports/media-bucket.ts";
import { MediaSweepStore } from "./ports/media-sweep-store.ts";

/**
 * What handing the media folder to this database would do, read only:
 * the marker there now, if any, and this database's id, if it has one
 * yet, and cluster, which the new marker names. It writes nothing and
 * creates nothing.
 */
export const mediaFolderClaim = Effect.gen(function* mediaFolderClaim() {
  const store = yield* MediaSweepStore;
  const bucket = yield* MediaBucket;
  const self = yield* store.peekIdentity;
  const cluster = yield* store.cluster;
  const current = yield* bucket.owner;

  return { cluster, current, self };
}).pipe(Effect.withSpan("Media.mediaFolderClaim"));

/**
 * Hands the media folder to this database, on an operator's word: its
 * owner marker is written naming this database, its cluster and timeline
 * and its next epoch, whatever it said, and the sweeps that delete what
 * this database does not know of run again. For a database that is meant
 * to be the folder's newest truth: a restore confirmed final, a failover
 * or an upgrade of Postgres, a database loaded from a dump, a marker
 * lost. Fails when the store does not hold that marker once written, as
 * when another writer came in between (`MediaFolderNotClaimed`). Answers
 * the marker written.
 */
export const claimMediaFolder = Effect.gen(function* claimMediaFolder() {
  const store = yield* MediaSweepStore;
  const bucket = yield* MediaBucket;
  const self = yield* store.identity(yield* Ids.use((ids) => ids.next));
  const cluster = yield* store.cluster;
  const epoch = yield* store.advanceEpoch;
  const marker: OwnerMarker = { ...cluster, epoch, id: self.id };

  if (!(yield* bucket.replace(marker, Option.none()))) {
    return yield* new MediaFolderNotClaimed({});
  }

  yield* store.markClaimed;

  return marker;
}).pipe(Effect.withSpan("Media.claimMediaFolder"));
