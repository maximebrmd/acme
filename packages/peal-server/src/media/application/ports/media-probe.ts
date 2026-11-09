import { Context, Schema } from "effect";
import type { Effect } from "effect";

import type { MediaProbeFailed } from "#media/application/media-probe-failed.ts";
import type { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import type { MediaTypeMismatch } from "#media/application/media-type-mismatch.ts";
import type { MediaContentType } from "#media/domain/media-format.ts";
import { MediaMetadata } from "#media/domain/media-metadata.ts";

/** A stored file to probe, readable at `url`. */
export interface MediaSource {
  readonly contentType: MediaContentType;
  readonly url: string;
}

/**
 * What probing a file gave: its metadata, or nothing because no probe for
 * its kind is installed (a server without ffprobe, for videos).
 */
export const ProbeOutcomeSchema = Schema.Union([
  Schema.TaggedStruct("probed", { metadata: MediaMetadata }),
  Schema.TaggedStruct("skipped", {
    reason: Schema.Literals(["probeUnavailable"]),
  }),
]);

export type ProbeOutcome = typeof ProbeOutcomeSchema.Type;

/**
 * Reads a stored file's dimensions, duration and codec, which platforms
 * check before they take it, and checks that an image is in the declared
 * format. A store that cannot serve the file is `MediaStorageFailed`, not a
 * damaged file. The seam for later processing: conversion and thumbnails.
 */
export class MediaProbe extends Context.Service<
  MediaProbe,
  {
    readonly probe: (
      source: MediaSource
    ) => Effect.Effect<
      ProbeOutcome,
      MediaProbeFailed | MediaStorageFailed | MediaTypeMismatch
    >;
  }
>()("peal-server/media/application/MediaProbe") {}
