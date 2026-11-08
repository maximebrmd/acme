import { Context, Schema } from "effect";
import type { Effect } from "effect";

import type { MediaProbeFailed } from "#media/application/media-probe-failed.ts";
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
 * check before they take it. The seam for later processing: conversion,
 * thumbnails and checks of the actual format.
 */
export class MediaProbe extends Context.Service<
  MediaProbe,
  {
    readonly probe: (
      source: MediaSource
    ) => Effect.Effect<ProbeOutcome, MediaProbeFailed>;
  }
>()("acme-server/media/application/MediaProbe") {}
