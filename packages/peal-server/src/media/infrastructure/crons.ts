import { Cron, Duration, Layer } from "effect";
import { ClusterCron } from "effect/cluster";

import { runSweep } from "#media/application/media-sweeps.ts";

// The sweeps of the media store, each every hour on a minute of its own,
// on one server at a time (the cluster's crons), each bounded: what a run
// leaves, the next one does. A run that fails is logged and counted
// (`peal.media.sweep.failures`); the next one tries again. A run more
// than half an hour late is skipped, as the next one is due.

/** Every hour at minute 19: uploads never completed, past their bound. */
export const PendingSweepCron = ClusterCron.make({
  cron: Cron.parseUnsafe("19 * * * *", "UTC"),
  execute: runSweep("pending", (sweeps) => sweeps.pending),
  name: "media.pending-sweep",
  skipIfOlderThan: Duration.minutes(30),
});

/** Every hour at minute 29: multipart uploads left open, aborted. */
export const UploadSweepCron = ClusterCron.make({
  cron: Cron.parseUnsafe("29 * * * *", "UTC"),
  execute: runSweep("uploads", (sweeps) => sweeps.uploads),
  name: "media.upload-sweep",
  skipIfOlderThan: Duration.minutes(30),
});

/**
 * Every hour at minute 39: the folders of erased workspaces that their
 * erasure could not empty.
 */
export const FolderSweepCron = ClusterCron.make({
  cron: Cron.parseUnsafe("39 * * * *", "UTC"),
  execute: runSweep("folders", (sweeps) => sweeps.folders),
  name: "media.folder-sweep",
  skipIfOlderThan: Duration.minutes(30),
});

/** Every hour at minute 49: files no asset holds, past their bound. */
export const OrphanSweepCron = ClusterCron.make({
  cron: Cron.parseUnsafe("49 * * * *", "UTC"),
  execute: runSweep("orphans", (sweeps) => sweeps.orphans),
  name: "media.orphan-sweep",
  skipIfOlderThan: Duration.minutes(30),
});

/** The media context's crons. Needs MediaSweeps. */
export const MediaCronsLive = Layer.mergeAll(
  PendingSweepCron,
  UploadSweepCron,
  FolderSweepCron,
  OrphanSweepCron
);
