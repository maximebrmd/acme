import { Effect } from "effect";

import { Ids } from "#shared/application/ids.ts";

import { MediaBucket } from "./ports/media-bucket.ts";
import { MediaSweepStore } from "./ports/media-sweep-store.ts";

/**
 * Hands the media folder to this database, on an operator's word: its
 * owner marker is written naming this database, whatever it named, and
 * the sweeps that delete what this database does not know of run again.
 * For a database that is meant to be the folder's newest truth, as after
 * a restore confirmed final, or a new database on an emptied folder.
 * Answers this database's id, and the id the marker named before.
 */
export const claimMediaFolder = Effect.gen(function* claimMediaFolder() {
  const store = yield* MediaSweepStore;
  const bucket = yield* MediaBucket;
  const self = yield* store.identity(yield* Ids.use((ids) => ids.next));
  const previous = yield* bucket.owner;

  yield* bucket.claim(self.id, { replace: true });
  yield* store.markClaimed;

  return { id: self.id, previous };
}).pipe(Effect.withSpan("Media.claimMediaFolder"));
