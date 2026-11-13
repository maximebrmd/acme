import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Metric,
  Option,
} from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids } from "#shared/application/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import type { MediaStorageFailed } from "./media-storage-failed.ts";
import { MediaBucket } from "./ports/media-bucket.ts";
import type {
  BucketFile,
  BucketPage,
  MarkerRead,
  OwnerMarker,
} from "./ports/media-bucket.ts";
import { MediaFolders } from "./ports/media-folders.ts";
import { MediaStorage } from "./ports/media-storage.ts";
import { MediaSweepStore } from "./ports/media-sweep-store.ts";
import type {
  DatabaseCluster,
  ExpiredPosition,
  ExpiredUpload,
  ListingSweep,
  StoreIdentity,
  SweepCursor,
} from "./ports/media-sweep-store.ts";
import { MediaUsage } from "./ports/media-usage.ts";
import {
  CurrentSweepPolicy,
  orphanShareFloor,
  orphanShareLimit,
} from "./sweep-policy.ts";

/** The sweeps of the media store, as metrics and logs name them. */
export type SweepName = "folders" | "orphans" | "pending" | "uploads";

/** Why a sweep would not delete anything this run. */
export type SweepRefusal =
  // The media folder's owner marker names another database.
  | "foreign"
  // This database claimed the folder, and its marker is gone.
  | "unmarked"
  // The marker names this database on another Postgres cluster or
  // timeline: restored from a backup, cloned, promoted or upgraded.
  | "restored"
  // The marker counts more owned runs than this database: rewound.
  | "rewound"
  // The marker changed while this run moved it on: left to the next.
  | "contended"
  // A page held more orphans, or a run more uploads never completed,
  // than a sound database leaves.
  | "breaker";

/** What one run of a sweep did. */
export interface SweepReport {
  /** The bytes of the files it deleted, as the store sized them. */
  readonly bytes: number;
  /** What it could not delete: each is tried again at the next run. */
  readonly failed: number;
  /** Whether it stopped at its bound with more to do, for the next run. */
  readonly left: boolean;
  /** Why it deleted nothing more, if it refused to. */
  readonly refused: Option.Option<SweepRefusal>;
  /** What it deleted: assets and their files, uploads, or files. */
  readonly swept: number;
}

/**
 * What the sweeps deleted, by sweep (`sweep`), counted as each goes:
 * uploads never completed, multipart uploads left open, files no asset
 * holds, and the files and uploads of erased workspaces.
 */
export const sweptObjects = Metric.counter("peal.media.sweep.objects", {
  description: "What the media store's sweeps deleted, by sweep",
  incremental: true,
});

/** The bytes of the files the sweeps deleted, by sweep, as each goes. */
export const sweptBytes = Metric.counter("peal.media.sweep.bytes", {
  description: "Bytes of the files the media store's sweeps deleted, by sweep",
  incremental: true,
});

/**
 * The runs of a sweep that failed, and the things a run could not delete,
 * by sweep: the next run tries again. Failures that keep coming have an
 * alert (`peal-media-sweep-failing`).
 */
export const sweepFailures = Metric.counter("peal.media.sweep.failures", {
  description:
    "Runs of the media store's sweeps that failed, and what they could not delete, by sweep",
  incremental: true,
});

/**
 * The runs of a sweep that refused to delete, by sweep and `reason`
 * (`SweepRefusal`): an alert fires at the first
 * (`peal-media-sweep-refused`).
 */
export const sweepRefusals = Metric.counter("peal.media.sweep.refusals", {
  description:
    "Runs of the media store's sweeps that refused to delete, by sweep and reason",
  incremental: true,
});

// Pages one run reads at most: of the bucket (1,000 keys each on most
// stores), so a large bucket is read over several runs from where the
// last stopped, and of expired uploads.
const pagesPerRun = 10;

// Erased workspaces whose folder one run empties at most: each can hold
// thousands of files.
const foldersPerRun = 25;

// A folder the erasure is emptying right now is left to it for this long.
const folderGrace = Duration.minutes(15);

const nothing: SweepReport = {
  bytes: 0,
  failed: 0,
  left: false,
  refused: Option.none(),
  swept: 0,
};

type SweepFailure = DatabaseError | MediaStorageFailed;

// What the owner marker says of this run: refused, or owned, holding the
// marker it wrote.
type Verdict =
  | { readonly _tag: "refused"; readonly reason: SweepRefusal }
  | { readonly _tag: "owned"; readonly marker: OwnerMarker };

const refusedBy = (reason: SweepRefusal): Verdict => ({
  _tag: "refused",
  reason,
});

const ownedAs = (marker: OwnerMarker): Verdict => ({ _tag: "owned", marker });

// One thing the store would not let go: counted, named, left to the
// next run, and the run goes on.
const skipped =
  (sweep: SweepName, subject: string) => (cause: MediaStorageFailed) =>
    Effect.logWarning(
      "A sweep of the media store could not delete one thing: the next run tries again",
      cause
    ).pipe(
      Effect.annotateLogs({ subject, sweep }),
      Effect.andThen(failedOne(sweep)),
      Effect.as("failed" as const)
    );

// One thing a sweep could not delete, counted.
const failedOne = (sweep: SweepName) =>
  Metric.update(Metric.withAttributes(sweepFailures, { sweep }), 1);

// What one page of a listing sweep did.
interface Taken {
  readonly bytes: number;
  readonly failed: number;
  /** The batch ran out on this page: list it again next run. */
  readonly full: boolean;
  /** Stop here, deleting nothing of the page, for this reason. */
  readonly refused: Option.Option<SweepRefusal>;
  readonly swept: number;
}

/**
 * The media store's sweeps, each run by a cron of its own on one server
 * at a time, each bounded (`CurrentSweepPolicy`'s `batch`, pages) and safe
 * to run again, or beside the requests that change what it reads: what a
 * run leaves, the next one does. Off (`CurrentSweepPolicy.enabled`), none
 * lists or deletes anything. One thing the store refuses to delete is
 * counted and left, and the run goes on.
 *
 * - `pending`: assets whose upload started `pendingAfter` ago and never
 *   completed. One a post that may still go out shows stays, and is paged
 *   past; otherwise the asset goes, only while still pending, so a
 *   completion that comes first keeps it, then the drafts that show it
 *   lose it, as `deleteMedia` does, then its multipart upload and file. A
 *   store that fails after leaves them to the two sweeps below.
 * - `uploads`: multipart uploads open in the media folder that started
 *   `uploadsAfter` ago, aborted.
 * - `orphans`: files of the media folder that no asset holds, or whose
 *   asset was rejected, and the store wrote `orphansAfter` ago, as a
 *   single upload's URL used after its asset was deleted leaves. Each is
 *   checked again just before it goes. A page with more of them than
 *   `orphansLimit`, or more than `orphanShareLimit` of its old files,
 *   stops the run before anything on it goes: this database is likely not
 *   the bucket's newest truth (restored to an earlier time, or another).
 * - `folders`: the folders of erased workspaces that the erasure could not
 *   empty once it committed, emptied again until the store holds nothing
 *   of them; one whose workspace still has assets is left, and counted.
 *
 * `pending` and `orphans` delete what this database does not know of, so
 * they run only while the media folder's owner marker names this
 * database: on a folder without one, the first run writes it; another id,
 * or no marker once this database wrote one, stops them (`SweepRefusal`).
 * The marker is never replaced but by an operator (`claimMediaFolder`).
 *
 * Nothing outside the media folder, under the store's prefix, is ever
 * listed or deleted, nor any key Peal does not write (`mediaKeyOf`).
 */
export class MediaSweeps extends Context.Service<
  MediaSweeps,
  {
    readonly pending: Effect.Effect<SweepReport, SweepFailure>;
    readonly uploads: Effect.Effect<SweepReport, SweepFailure>;
    readonly orphans: Effect.Effect<SweepReport, SweepFailure>;
    readonly folders: Effect.Effect<SweepReport, SweepFailure>;
  }
>()("peal-server/media/application/MediaSweeps") {
  static readonly layer = Layer.effect(
    MediaSweeps,
    Effect.gen(function* MediaSweepsLive() {
      const store = yield* MediaSweepStore;
      const bucket = yield* MediaBucket;
      const storage = yield* MediaStorage;
      const folders = yield* MediaFolders;
      const usage = yield* MediaUsage;
      const ids = yield* Ids;

      const {
        batch,
        enabled,
        orphansAfter,
        orphansLimit,
        pendingAfter,
        pendingLimit,
        uploadsAfter,
      } = yield* CurrentSweepPolicy;

      const since = Effect.fn("MediaSweeps.since")(function* since(
        age: Duration.Duration
      ) {
        return DateTime.subtractDuration(yield* DateTime.now, age);
      });

      // Counts what went as it goes, so a run that fails later loses none
      // of it, and names it at debug: keys hold ids only.
      const counted = Effect.fn("MediaSweeps.counted")(function* counted(
        sweep: SweepName,
        subject: string,
        objects: number,
        bytes: number
      ) {
        yield* Metric.update(
          Metric.withAttributes(sweptObjects, { sweep }),
          objects
        );
        yield* Metric.update(
          Metric.withAttributes(sweptBytes, { sweep }),
          bytes
        );
        yield* Effect.logDebug("Swept from the media store").pipe(
          Effect.annotateLogs({ bytes, objects, subject, sweep })
        );
      });

      // What the marker says of this database, read as `read`: refused,
      // or this database's, the marker then moved on to the next epoch,
      // which this run holds.
      const judged = Effect.fn("MediaSweeps.judged")(function* judged(
        read: MarkerRead,
        self: StoreIdentity,
        cluster: DatabaseCluster
      ) {
        if (Option.isNone(read.marker) || read.marker.value.id !== self.id) {
          return refusedBy("foreign");
        }

        const marker = read.marker.value;

        if (
          marker.system !== cluster.system ||
          marker.timeline !== cluster.timeline
        ) {
          return refusedBy("restored");
        }

        if (marker.epoch > self.epoch) {
          return refusedBy("rewound");
        }

        // Committed before the marker moves: a crash between the two
        // leaves the database one ahead, which the next run passes.
        const epoch = yield* store.advanceEpoch;
        const held: OwnerMarker = { ...cluster, epoch, id: self.id };
        const moved = yield* bucket.replace(held, read.version);

        return moved ? ownedAs(held) : refusedBy("contended");
      });

      // Whether the media folder is this database's now: its owner marker
      // names this database, on the cluster it runs on, at an epoch the
      // database has reached, or there was none and this database wrote
      // it now. Each owned run moves the epoch on in both.
      const ownership = Effect.gen(function* ownership() {
        const self = yield* store.identity(yield* ids.next);
        const cluster = yield* store.cluster;
        const read = yield* bucket.owner;

        if (Option.isSome(read)) {
          const verdict = yield* judged(read.value, self, cluster);

          if (verdict._tag === "owned" && !self.claimed) {
            yield* store.markClaimed;
          }

          return verdict;
        }

        if (self.claimed) {
          return refusedBy("unmarked");
        }

        // Written only if none is there: one another server wrote
        // meanwhile is judged as found, never replaced.
        const epoch = yield* store.advanceEpoch;
        const held: OwnerMarker = { ...cluster, epoch, id: self.id };
        const wrote = yield* bucket.claim(held);

        if (!wrote) {
          const written = yield* bucket.owner;

          return yield* Option.match(written, {
            onNone: () => Effect.succeed(refusedBy("unmarked")),
            onSome: (found) => judged(found, { ...self, epoch }, cluster),
          });
        }

        yield* store.markClaimed;
        yield* Effect.logInfo(
          "The media folder's owner marker now names this database"
        );

        return ownedAs(held);
      });

      // Whether the marker is still the one this run wrote: read again
      // before each page of a long run, so a hand-over meanwhile stops it.
      const stillHeld = (held: OwnerMarker) =>
        bucket.owner.pipe(
          Effect.map((read) =>
            read.pipe(
              Option.flatMap(({ marker }) => marker),
              Option.match({
                onNone: () => false,
                onSome: (found) =>
                  found.id === held.id &&
                  found.epoch === held.epoch &&
                  found.system === held.system &&
                  found.timeline === held.timeline,
              })
            )
          )
        );

      const owned = (
        sweep: (
          held: Effect.Effect<boolean, SweepFailure>
        ) => Effect.Effect<SweepReport, SweepFailure>
      ): Effect.Effect<SweepReport, SweepFailure> =>
        ownership.pipe(
          Effect.flatMap((verdict) =>
            verdict._tag === "owned"
              ? sweep(stillHeld(verdict.marker))
              : Effect.succeed({
                  ...nothing,
                  refused: Option.some(verdict.reason),
                })
          )
        );

      const switched = (
        sweep: Effect.Effect<SweepReport, SweepFailure>
      ): Effect.Effect<SweepReport, SweepFailure> =>
        enabled ? sweep : Effect.succeed(nothing);

      // One expired upload: kept while a post that may still go out shows
      // it; otherwise the asset goes first, while still pending, then the
      // drafts lose it, then what the store holds of it.
      const sweepUpload = Effect.fn("MediaSweeps.sweepUpload")(
        function* sweepUpload(expired: ExpiredUpload, before: DateTime.Utc) {
          const { assetId, storageKey: key, upload, workspaceId } = expired;
          const shown = yield* usage.of(workspaceId, assetId);

          if (shown.scheduled.length > 0) {
            yield* Effect.logWarning(
              "An upload never completed stays: a scheduled post shows it"
            ).pipe(Effect.annotateLogs({ assetId }));

            return "kept" as const;
          }

          if (!(yield* store.forgetExpired(assetId, before))) {
            return "kept" as const;
          }

          yield* usage
            .release(workspaceId, assetId)
            .pipe(
              Effect.catchTag("MediaInUse", () =>
                Effect.logError(
                  "A post was scheduled with an upload never completed as it was swept"
                ).pipe(Effect.annotateLogs({ assetId }))
              )
            );

          if (upload._tag === "multipart") {
            yield* storage.abortMultipartUpload({
              key,
              uploadId: upload.uploadId,
            });
          }

          const stored = yield* storage.head(key);

          const bytes = Option.match(stored, {
            onNone: () => 0,
            onSome: ({ byteSize }) => byteSize,
          });

          if (Option.isSome(stored)) {
            yield* storage.remove(key);
          }

          yield* counted("pending", key, 1, bytes);

          return bytes;
        }
      );

      const pending = (held: Effect.Effect<boolean, SweepFailure>) =>
        Effect.gen(function* pendingSweep() {
          const before = yield* since(pendingAfter);

          // Uploads never completed in more workspaces than a sound
          // database leaves at once: it likely lost the completions it once
          // had (restored, or another's). One workspace's backlog, however
          // large, never trips it.
          const workspaces = yield* store.expiredWorkspaces(
            before,
            pendingLimit + 1
          );

          if (workspaces > pendingLimit) {
            yield* Effect.logError(
              "A sweep of the media store stopped: uploads never completed in more workspaces than a sound database leaves"
            ).pipe(Effect.annotateLogs({ workspaces }));

            const refused: SweepReport = {
              ...nothing,
              left: true,
              refused: Option.some("breaker"),
            };

            return refused;
          }

          let after = Option.none<ExpiredPosition>();
          let swept = 0;
          let bytes = 0;
          let failed = 0;
          let pages = 0;
          let more = true;
          let refused = Option.none<SweepRefusal>();

          // Assets kept are paged past, so they never hold up the batch.
          while (more && swept < batch && pages < pagesPerRun) {
            if (pages > 0 && !(yield* held)) {
              refused = Option.some("contended");
              break;
            }

            const expired = yield* store.expiredUploads(before, batch, after);
            const room = batch - swept;
            const tried = expired.slice(0, room);

            for (const upload of tried) {
              const done = yield* sweepUpload(upload, before).pipe(
                Effect.catchTag(
                  "MediaStorageFailed",
                  skipped("pending", upload.storageKey)
                )
              );

              if (done === "failed") {
                failed += 1;
              } else if (done !== "kept") {
                swept += 1;
                bytes += done;
              }

              after = Option.some({
                assetId: upload.assetId,
                createdAt: upload.createdAt,
              });
            }

            pages += 1;
            more = expired.length === batch || tried.length < expired.length;
          }

          const report: SweepReport = {
            bytes,
            failed,
            left: more,
            refused,
            swept,
          };

          return report;
        }).pipe(Effect.withSpan("MediaSweeps.pending"));

      // Lists the bucket from where the sweep stopped, a page at a time,
      // deleting what `take` picks, until the batch is spent, the run's
      // pages are, the listing ends or `take` refuses, and keeps where it
      // stopped. A page the batch ran out in, or that was refused, is
      // listed again by the next run: what went is no longer on it.
      const listing = <A, M>(
        sweep: ListingSweep,
        list: (
          after: Option.Option<M>
        ) => Effect.Effect<BucketPage<A, M>, SweepFailure>,
        toCursor: (marker: M) => SweepCursor,
        fromCursor: (cursor: SweepCursor) => M,
        take: (
          items: readonly A[],
          room: number
        ) => Effect.Effect<Taken, SweepFailure>,
        held: Effect.Effect<boolean, SweepFailure>
      ) =>
        Effect.gen(function* listingSweep() {
          const saved = yield* store.cursor(sweep);
          let after = saved.pipe(Option.map(fromCursor));
          let swept = 0;
          let bytes = 0;
          let failed = 0;
          let pages = 0;
          let ended = false;
          let stop = false;
          let refused = Option.none<SweepRefusal>();

          while (!ended && !stop && pages < pagesPerRun) {
            if (pages > 0 && !(yield* held)) {
              refused = Option.some("contended");
              break;
            }

            const page = yield* list(after);
            const done = yield* take(page.items, batch - swept);

            swept += done.swept;
            bytes += done.bytes;
            failed += done.failed;
            pages += 1;
            ({ refused } = done);
            stop = done.full || Option.isSome(refused);

            if (!stop) {
              ended = Option.isNone(page.next);
              after = page.next;
            }
          }

          yield* store.saveCursor(
            sweep,
            after.pipe(Option.map(toCursor)),
            yield* DateTime.now
          );

          const report: SweepReport = {
            bytes,
            failed,
            left: !ended,
            refused,
            swept,
          };

          return report;
        });

      const uploads = Effect.gen(function* uploadsSweep() {
        const before = yield* since(uploadsAfter);

        return yield* listing(
          "uploads",
          bucket.listUploads,
          (marker) => marker,
          (cursor) => cursor,
          (open, room) =>
            Effect.gen(function* abortOld() {
              const old = open.filter(({ startedAt }) =>
                DateTime.isLessThan(startedAt, before)
              );

              const taken = old.slice(0, room);

              const done = yield* Effect.forEach(
                taken,
                ({ key, uploadId }) =>
                  storage
                    .abortMultipartUpload({ key, uploadId })
                    .pipe(
                      Effect.andThen(counted("uploads", key, 1, 0)),
                      Effect.as("aborted" as const),
                      Effect.catchTag(
                        "MediaStorageFailed",
                        skipped("uploads", key)
                      )
                    ),
                { concurrency: 1 }
              );

              const failed = done.filter((end) => end === "failed").length;

              const result: Taken = {
                bytes: 0,
                failed,
                full: taken.length === room && room > 0,
                refused: Option.none(),
                swept: taken.length - failed,
              };

              return result;
            }),
          Effect.succeed(true)
        );
      }).pipe(Effect.withSpan("MediaSweeps.uploads"));

      // A file no asset holds, checked again just before it goes.
      const deleteOrphan = (file: BucketFile) =>
        store.keptKeys([file.key]).pipe(
          Effect.flatMap((held) =>
            held.size > 0
              ? Effect.succeed(Option.none<number>())
              : storage
                  .remove(file.key)
                  .pipe(
                    Effect.andThen(
                      counted("orphans", file.key, 1, file.byteSize)
                    ),
                    Effect.as(Option.some(file.byteSize))
                  )
          ),
          Effect.catchTag("MediaStorageFailed", skipped("orphans", file.key))
        );

      const orphans = (held: Effect.Effect<boolean, SweepFailure>) =>
        Effect.gen(function* orphansSweep() {
          const before = yield* since(orphansAfter);

          return yield* listing(
            "orphans",
            bucket.listFiles,
            (key) => ({ key, uploadId: Option.none() }),
            ({ key }) => key,
            (files, room) =>
              Effect.gen(function* deleteOrphans() {
                const old = files.filter(({ modifiedAt }) =>
                  DateTime.isLessThan(modifiedAt, before)
                );

                const kept = yield* store.keptKeys(old.map(({ key }) => key));
                const unheld = old.filter(({ key }) => !kept.has(key));

                const tripped =
                  unheld.length > orphansLimit ||
                  (old.length >= orphanShareFloor &&
                    unheld.length > old.length * orphanShareLimit);

                if (tripped) {
                  yield* Effect.logError(
                    "A sweep of the media store stopped: a page of the bucket holds more files this database does not know of than a sound one leaves"
                  ).pipe(
                    Effect.annotateLogs({
                      old: old.length,
                      orphans: unheld.length,
                    })
                  );

                  const refusal: Taken = {
                    bytes: 0,
                    failed: 0,
                    full: false,
                    refused: Option.some("breaker"),
                    swept: 0,
                  };

                  return refusal;
                }

                const taken = unheld.slice(0, room);

                const done = yield* Effect.forEach(taken, deleteOrphan, {
                  concurrency: 1,
                });

                const gone = done.flatMap((end) =>
                  end === "failed" ? [] : Option.toArray(end)
                );

                const result: Taken = {
                  bytes: gone.reduce((total, size) => total + size, 0),
                  failed: done.filter((end) => end === "failed").length,
                  full: taken.length === room && room > 0,
                  refused: Option.none(),
                  swept: gone.length,
                };

                return result;
              }),
            held
          );
        }).pipe(Effect.withSpan("MediaSweeps.orphans"));

      // One erased workspace's folder, emptied, then forgotten; one whose
      // workspace still has assets is left alone, and counted.
      const emptyFolder = Effect.fn("MediaSweeps.emptyFolder")(
        function* emptyFolder(workspaceId: WorkspaceId) {
          if (yield* store.holdsAssets(workspaceId)) {
            yield* Effect.logError(
              "An erased workspace's folder is listed for the sweep, and the workspace still has media: left"
            ).pipe(Effect.annotateLogs({ workspaceId }));
            yield* failedOne("folders");

            return "failed" as const;
          }

          const removed = yield* folders.removeWorkspace(workspaceId);

          yield* store.forgetFolder(workspaceId);
          yield* counted(
            "folders",
            workspaceId,
            removed.files + removed.uploads,
            removed.bytes
          );

          return removed;
        }
      );

      const foldersSweep = Effect.gen(function* foldersSweep() {
        const before = yield* since(folderGrace);
        const erased = yield* store.erasedFolders(before, foldersPerRun);

        const done = yield* Effect.forEach(
          erased,
          (workspaceId) =>
            emptyFolder(workspaceId).pipe(
              Effect.catchTag(
                "MediaStorageFailed",
                skipped("folders", workspaceId)
              )
            ),
          { concurrency: 1 }
        );

        const emptied = done.flatMap((end) => (end === "failed" ? [] : [end]));

        const report: SweepReport = {
          ...nothing,
          bytes: emptied.reduce((total, { bytes }) => total + bytes, 0),
          failed: done.length - emptied.length,
          left: erased.length === foldersPerRun,
          swept: emptied.reduce(
            (total, { files, uploads: aborted }) => total + files + aborted,
            0
          ),
        };

        return report;
      }).pipe(Effect.withSpan("MediaSweeps.folders"));

      return MediaSweeps.of({
        folders: switched(foldersSweep),
        orphans: switched(owned(orphans)),
        pending: switched(owned(pending)),
        uploads: switched(uploads),
      });
    })
  );
}

/**
 * Runs a sweep once, as its cron does: logs what it did when it deleted
 * anything, left work, could not delete something or refused, counts a
 * refusal (`sweepRefusals`), and, when the run fails, logs and counts the
 * failure (`sweepFailures`) and succeeds: the next run tries again. What
 * the run deleted is counted as it goes, failed run or not.
 */
export const runSweep = (
  name: SweepName,
  sweep: (
    sweeps: MediaSweeps["Service"]
  ) => Effect.Effect<SweepReport, SweepFailure>
): Effect.Effect<Option.Option<SweepReport>, never, MediaSweeps> =>
  MediaSweeps.use(sweep).pipe(
    Effect.tap((report) =>
      Effect.gen(function* logged() {
        const { refused, ...done } = report;

        if (Option.isSome(refused)) {
          yield* Metric.update(
            Metric.withAttributes(sweepRefusals, {
              reason: refused.value,
              sweep: name,
            }),
            1
          );
          yield* Effect.logError(
            "A sweep of the media store refused to delete"
          ).pipe(Effect.annotateLogs({ reason: refused.value, sweep: name }));
        }

        if (done.swept > 0 || done.left || done.failed > 0) {
          yield* Effect.logInfo("Swept the media store").pipe(
            Effect.annotateLogs({ sweep: name, ...done })
          );
        }
      })
    ),
    Effect.map(Option.some),
    Effect.catchCause((cause) =>
      Effect.logWarning(
        "A sweep of the media store failed: the next run tries again",
        cause
      ).pipe(
        Effect.annotateLogs({ sweep: name }),
        Effect.andThen(
          Metric.update(
            Metric.withAttributes(sweepFailures, { sweep: name }),
            1
          )
        ),
        Effect.as(Option.none())
      )
    )
  );
