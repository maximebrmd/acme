import { Context, Duration } from "effect";

import { defaultUploadPolicy } from "./upload-policy.ts";

/**
 * How far the sweeps of the media store reach: how old what they delete
 * must be, and how much one run of each deletes at most.
 */
export interface SweepPolicy {
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
}

/**
 * The youngest any sweep may reach: the part URLs' life and an hour, so
 * nothing a client can still send to, nor a file being stored and
 * recorded, is ever taken.
 */
export const minimumSweepAge = Duration.sum(
  defaultUploadPolicy.partUploadExpiry,
  Duration.hours(1)
);

/** A day for each, and 500 a run. */
export const defaultSweepPolicy: SweepPolicy = {
  batch: 500,
  orphansAfter: Duration.days(1),
  pendingAfter: Duration.days(1),
  uploadsAfter: Duration.days(1),
};

/** The sweep policy in effect, which the server reads from its settings. */
export const CurrentSweepPolicy = Context.Reference<SweepPolicy>(
  "peal-server/media/application/CurrentSweepPolicy",
  { defaultValue: () => defaultSweepPolicy }
);
