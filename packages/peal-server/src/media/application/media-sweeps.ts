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

import type { MediaStorageFailed } from "./media-storage-failed.ts";
import { MediaBucket } from "./ports/media-bucket.ts";
import type { BucketPage } from "./ports/media-bucket.ts";
import { MediaFolders } from "./ports/media-folders.ts";
import { MediaStorage } from "./ports/media-storage.ts";
import { MediaSweepStore } from "./ports/media-sweep-store.ts";
import type {
  ExpiredUpload,
  ListingSweep,
  SweepCursor,
} from "./ports/media-sweep-store.ts";
import { MediaUsage } from "./ports/media-usage.ts";
import { CurrentSweepPolicy } from "./sweep-policy.ts";

/** The sweeps of the media store, as metrics and logs name them. */
export type SweepName = "folders" | "orphans" | "pending" | "uploads";

/** What one run of a sweep did. */
export interface SweepReport {
  /** The bytes of the files it deleted, as the store sized them. */
  readonly bytes: number;
  /** Whether it stopped at its bound with more to do, for the next run. */
  readonly left: boolean;
  /** What it deleted: assets and their files, uploads, or files. */
  readonly swept: number;
}

/**
 * What the sweeps deleted, by sweep (`sweep`): uploads never completed,
 * multipart uploads left open, files no asset holds, and the files and
 * uploads of erased workspaces.
 */
export const sweptObjects = Metric.counter("peal.media.sweep.objects", {
  description: "What the media store's sweeps deleted, by sweep",
  incremental: true,
});

/** The bytes of the files the sweeps deleted, by sweep. */
export const sweptBytes = Metric.counter("peal.media.sweep.bytes", {
  description: "Bytes of the files the media store's sweeps deleted, by sweep",
  incremental: true,
});

/**
 * The runs of a sweep that failed, by sweep: the next run tries again.
 * One that fails run after run has an alert (`peal-media-sweep-failing`).
 */
export const sweepFailures = Metric.counter("peal.media.sweep.failures", {
  description: "Runs of the media store's sweeps that failed, by sweep",
  incremental: true,
});

// Pages of the bucket one run lists at most: stores list up to 1,000 keys
// a page, so a run reads 10,000 at most, and a large bucket over several
// runs, from where the last stopped.
const pagesPerRun = 10;

// Erased workspaces whose folder one run empties at most: each can hold
// thousands of files.
const foldersPerRun = 25;

// A folder the erasure is emptying right now is left to it for this long.
const folderGrace = Duration.minutes(15);

type SweepFailure = DatabaseError | MediaStorageFailed;

/**
 * The media store's sweeps, each run by a cron of its own on one server
 * at a time, each bounded (`CurrentSweepPolicy`'s `batch`, pages of the
 * bucket) and safe to run again, or beside the requests that change what
 * it reads: what a run leaves, the next one does.
 *
 * - `pending`: assets whose upload started `pendingAfter` ago and never
 *   completed: the drafts that show one lose it, as `deleteMedia` does (a
 *   post that may still go out keeps it, and it stays), then the asset
 *   goes, only while still pending, so a
 *   completion that comes first keeps it; then its multipart upload and
 *   its file. A store that fails after leaves them to the two sweeps
 *   below.
 * - `uploads`: multipart uploads open in the media folder that started
 *   `uploadsAfter` ago, aborted.
 * - `orphans`: files of the media folder that no asset holds, or whose
 *   asset was rejected, and the store wrote `orphansAfter` ago, as a
 *   single upload's URL used after its asset was deleted leaves. Each is
 *   checked again just before it goes.
 * - `folders`: the folders of erased workspaces that the erasure could not
 *   empty once it committed, emptied again until the store holds nothing
 *   of them.
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

      const { batch, orphansAfter, pendingAfter, uploadsAfter } =
        yield* CurrentSweepPolicy;

      const since = Effect.fn("MediaSweeps.since")(function* since(
        age: Duration.Duration
      ) {
        return DateTime.subtractDuration(yield* DateTime.now, age);
      });

      // The drafts that show it lose it, as deleting it takes it from
      // them; a post that may still go out keeps it, and the asset stays.
      const released = (expired: ExpiredUpload) =>
        usage.release(expired.workspaceId, expired.assetId).pipe(
          Effect.as(true),
          Effect.catchTag("MediaInUse", () =>
            Effect.logWarning(
              "An upload never completed stays: a scheduled post shows it"
            ).pipe(
              Effect.annotateLogs({ assetId: expired.assetId }),
              Effect.as(false)
            )
          )
        );

      // The asset goes first, then what the store holds of it.
      const sweepUpload = Effect.fn("MediaSweeps.sweepUpload")(
        function* sweepUpload(expired: ExpiredUpload, before: DateTime.Utc) {
          if (
            !(yield* released(expired)) ||
            !(yield* store.forgetExpired(expired.assetId, before))
          ) {
            return Option.none<number>();
          }

          const { storageKey: key, upload } = expired;

          if (upload._tag === "multipart") {
            yield* storage.abortMultipartUpload({
              key,
              uploadId: upload.uploadId,
            });
          }

          const stored = yield* storage.head(key);

          if (Option.isSome(stored)) {
            yield* storage.remove(key);
          }

          return Option.some(
            Option.match(stored, {
              onNone: () => 0,
              onSome: ({ byteSize }) => byteSize,
            })
          );
        }
      );

      const pending = Effect.gen(function* pendingSweep() {
        const before = yield* since(pendingAfter);
        const expired = yield* store.expiredUploads(before, batch);

        const swept = yield* Effect.forEach(
          expired,
          (upload) => sweepUpload(upload, before),
          { concurrency: 1 }
        );

        const sizes = swept.flatMap(Option.toArray);

        const report: SweepReport = {
          bytes: sizes.reduce((total, size) => total + size, 0),
          left: expired.length === batch,
          swept: sizes.length,
        };

        return report;
      }).pipe(Effect.withSpan("MediaSweeps.pending"));

      // Lists the bucket from where the sweep stopped, a page at a time,
      // deleting what `take` picks, until the batch is spent, the run's
      // pages are, or the listing ends, and keeps where it stopped. A page
      // the batch ran out in is listed again by the next run: what went is
      // no longer on it.
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
        ) => Effect.Effect<
          {
            readonly bytes: number;
            readonly swept: number;
            readonly full: boolean;
          },
          SweepFailure
        >
      ) =>
        Effect.gen(function* listingSweep() {
          const saved = yield* store.cursor(sweep);
          let after = saved.pipe(Option.map(fromCursor));
          let swept = 0;
          let bytes = 0;
          let pages = 0;
          let ended = false;
          let full = false;

          while (!ended && !full && pages < pagesPerRun) {
            const page = yield* list(after);
            const done = yield* take(page.items, batch - swept);

            swept += done.swept;
            bytes += done.bytes;
            pages += 1;
            ({ full } = done);

            if (!full) {
              ended = Option.isNone(page.next);
              after = page.next;
            }
          }

          yield* store.saveCursor(
            sweep,
            after.pipe(Option.map(toCursor)),
            yield* DateTime.now
          );

          const report: SweepReport = { bytes, left: !ended, swept };

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

              yield* Effect.forEach(
                taken,
                ({ key, uploadId }) =>
                  storage.abortMultipartUpload({ key, uploadId }),
                { discard: true }
              );

              return {
                bytes: 0,
                full: taken.length === room && room > 0,
                swept: taken.length,
              };
            })
        );
      }).pipe(Effect.withSpan("MediaSweeps.uploads"));

      const orphans = Effect.gen(function* orphansSweep() {
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
              const taken = unheld.slice(0, room);

              // Checked again just before it goes, one at a time.
              const deleted = yield* Effect.forEach(
                taken,
                (file) =>
                  store
                    .keptKeys([file.key])
                    .pipe(
                      Effect.flatMap((held) =>
                        held.size > 0
                          ? Effect.succeed(Option.none<number>())
                          : storage
                              .remove(file.key)
                              .pipe(Effect.as(Option.some(file.byteSize)))
                      )
                    ),
                { concurrency: 1 }
              );

              const gone = deleted.flatMap(Option.toArray);

              return {
                bytes: gone.reduce((total, size) => total + size, 0),
                full: taken.length === room && room > 0,
                swept: gone.length,
              };
            })
        );
      }).pipe(Effect.withSpan("MediaSweeps.orphans"));

      const foldersSweep = Effect.gen(function* foldersSweep() {
        const before = yield* since(folderGrace);
        const erased = yield* store.erasedFolders(before, foldersPerRun);

        const removed = yield* Effect.forEach(
          erased,
          (workspaceId) =>
            folders
              .removeWorkspace(workspaceId)
              .pipe(Effect.tap(() => store.forgetFolder(workspaceId))),
          { concurrency: 1 }
        );

        const report: SweepReport = {
          bytes: removed.reduce((total, { bytes }) => total + bytes, 0),
          left: erased.length === foldersPerRun,
          swept: removed.reduce(
            (total, { files, uploads: aborted }) => total + files + aborted,
            0
          ),
        };

        return report;
      }).pipe(Effect.withSpan("MediaSweeps.folders"));

      return MediaSweeps.of({
        folders: foldersSweep,
        orphans,
        pending,
        uploads,
      });
    })
  );
}

/**
 * Runs a sweep once, as its cron does: counts what it deleted, logs it
 * when it deleted anything or left work, and, when it fails, logs and
 * counts the failure (`sweepFailures`) and succeeds: the next run tries
 * again.
 */
export const runSweep = (
  name: SweepName,
  sweep: (
    sweeps: MediaSweeps["Service"]
  ) => Effect.Effect<SweepReport, SweepFailure>
): Effect.Effect<Option.Option<SweepReport>, never, MediaSweeps> =>
  MediaSweeps.use(sweep).pipe(
    Effect.tap((report) =>
      Effect.gen(function* counted() {
        yield* Metric.update(
          Metric.withAttributes(sweptObjects, { sweep: name }),
          report.swept
        );
        yield* Metric.update(
          Metric.withAttributes(sweptBytes, { sweep: name }),
          report.bytes
        );

        if (report.swept > 0 || report.left) {
          yield* Effect.logInfo("Swept the media store").pipe(
            Effect.annotateLogs({ sweep: name, ...report })
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
