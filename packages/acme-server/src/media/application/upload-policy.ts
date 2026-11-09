import { Context, Duration } from "effect";

import type { UploadSizing } from "#media/domain/upload-plan.ts";

const mebibyte = 1024 * 1024;

/** How uploads are split, and how long the URLs acme signs stay valid. */
export interface UploadPolicy extends UploadSizing {
  /**
   * How long a single-request upload URL can be started. Nothing revokes
   * it, and a file deleted while it lasts can be uploaded again, so it is
   * kept short.
   */
  readonly singleUploadExpiry: Duration.Duration;
  /**
   * How long each part URL can be started. A part starts once the ones
   * before it are sent, so this covers the whole upload on a slow line.
   */
  readonly partUploadExpiry: Duration.Duration;
  /** How long a probe may read the file. */
  readonly probeExpiry: Duration.Duration;
}

/**
 * Images, at most 16 MiB, always go in one request. Videos above 16 MiB go
 * in 8 MiB parts: at most 128 for the largest video, so a dropped
 * connection costs one part rather than the whole file. Part URLs last six
 * hours, enough for 1 GiB at about 0.4 Mbit/s. A single upload URL lasts ten
 * minutes: the store only checks that a request starts in time, so a slow
 * line still finishes its 16 MiB.
 */
export const defaultUploadPolicy: UploadPolicy = {
  multipartThreshold: 16 * mebibyte,
  partSize: 8 * mebibyte,
  partUploadExpiry: Duration.hours(6),
  probeExpiry: Duration.minutes(15),
  singleUploadExpiry: Duration.minutes(10),
};

/** The upload policy in effect. Tests provide smaller parts. */
export const CurrentUploadPolicy = Context.Reference<UploadPolicy>(
  "acme-server/media/application/CurrentUploadPolicy",
  { defaultValue: () => defaultUploadPolicy }
);
