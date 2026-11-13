import { Context, Duration } from "effect";

import { defaultUploadPolicy } from "./upload-policy.ts";

/**
 * How far the sweeps of the media store reach: how old what they delete
 * must be, and how much one run of each deletes at most.
 */
export interface SweepPolicy {
  /** Whether the sweeps run at all: off, they list and delete nothing. */
  readonly enabled: boolean;
  /**
   * How long after it started an upload never completed is deleted, its
   * file and its asset.
   */
  readonly pendingAfter: Duration.Duration;
  /** How long after it started a multipart upload left open is aborted. */
  readonly uploadsAfter: Duration.Duration;
  /**
   * How old a file of the store no asset holds must be to be deleted, as
   * the store dates it.
   */
  readonly orphansAfter: Duration.Duration;
  /** The most one run of each sweep deletes. */
  readonly batch: number;
  /**
   * The most files one page of the bucket may hold that no asset holds
   * before the sweep of them stops, deleting none: a database restored to
   * an earlier time, or another's, sees most of the bucket as orphans.
   */
  readonly orphansLimit: number;
  /**
   * The most uploads never completed one run may find before the sweep of
   * them stops, deleting none: as many at once mean a database that lost
   * the completions it once had.
   */
  readonly pendingLimit: number;
}

/**
 * The share of a page's files past their bound that may be orphans before
 * the sweep stops, on a page of `orphanShareFloor` such files or more.
 */
export const orphanShareLimit = 0.2;

export const orphanShareFloor = 50;

/**
 * The youngest any sweep may reach: the part URLs' life and an hour, so
 * nothing a client can still send to, nor a file being stored and
 * recorded, is ever taken.
 */
export const minimumSweepAge = Duration.sum(
  defaultUploadPolicy.partUploadExpiry,
  Duration.hours(1)
);

/**
 * On, a day for each, 500 a run, and 100 orphans a page or uploads never
 * completed a run at most.
 */
export const defaultSweepPolicy: SweepPolicy = {
  batch: 500,
  enabled: true,
  orphansLimit: 100,
  pendingLimit: 100,
  orphansAfter: Duration.days(1),
  pendingAfter: Duration.days(1),
  uploadsAfter: Duration.days(1),
};

/** The sweep policy in effect, which the server reads from its settings. */
export const CurrentSweepPolicy = Context.Reference<SweepPolicy>(
  "peal-server/media/application/CurrentSweepPolicy",
  { defaultValue: () => defaultSweepPolicy }
);
