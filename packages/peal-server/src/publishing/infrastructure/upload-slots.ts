import { readFileSync } from "node:fs";
import { totalmem } from "node:os";

import {
  Config,
  Effect,
  Layer,
  Metric,
  Schema,
  Semaphore,
  Stream,
} from "effect";

import { MediaForPublishing } from "#publishing/application/media-for-publishing.ts";

const mebibyte = 1024 * 1024;

const gibibyte = 1024 * mebibyte;

/**
 * From this size on, a file read for a platform takes an upload slot:
 * above any image (16 MiB at most), so videos do, and pictures never wait.
 */
export const largeUpload = 16 * mebibyte + 1;

/**
 * How many large files a server with `memory` bytes sends at once when
 * `PEAL_MAX_CONCURRENT_UPLOADS` is not set: one per gibibyte, 2 at least
 * and 8 at most. An upload is streamed and holds a part of its file at a
 * time, 10 MB at most with what is on its way, so this bounds the memory
 * of the busiest minute to a few hundred megabytes, and the bandwidth and
 * store connections they share.
 */
export const defaultUploadSlots = (memory: number): number =>
  Math.min(8, Math.max(2, Math.floor(memory / gibibyte)));

const decodeBytes = Schema.decodeUnknownOption(
  Schema.NumberFromString.check(Schema.isInt(), Schema.isGreaterThan(0))
);

// The memory this process may use: its container's limit when it has one
// (cgroup v2), else the machine's.
const availableMemory = Effect.sync(() => {
  try {
    const limit = decodeBytes(
      readFileSync("/sys/fs/cgroup/memory.max", "utf-8").trim()
    );

    if (limit._tag === "Some") {
      return Math.min(limit.value, totalmem());
    }
  } catch {
    // No cgroup file, as outside Linux: the machine's memory stands.
  }

  return totalmem();
});

/**
 * `PEAL_MAX_CONCURRENT_UPLOADS`: the large files one server process sends
 * to platforms at once. Unset, it follows the container's memory
 * (`defaultUploadSlots`). Anything but a whole number above 0 stops the
 * server.
 */
export const uploadSlotsConfig = availableMemory.pipe(
  Effect.flatMap((memory) =>
    Config.schema(
      Schema.Int.check(Schema.isGreaterThan(0)),
      "PEAL_MAX_CONCURRENT_UPLOADS"
    ).pipe(Config.withDefault(defaultUploadSlots(memory)))
  )
);

const waiting = Metric.gauge("peal.publishing.uploads.waiting", {
  description:
    "Large uploads to platforms waiting for one of the server's upload slots",
});

const sending = Metric.gauge("peal.publishing.uploads.sending", {
  description: "Large uploads to platforms under way",
});

/** The large uploads waiting for a slot now. */
export const uploadsWaiting = Metric.value(waiting).pipe(
  Effect.map(({ value }) => value)
);

/**
 * The media given, with the large files read so many at a time
 * (`uploadSlotsConfig`): a file takes a slot when it is opened and gives it
 * back when its stream ends, read to the end, failed or given up. The
 * others wait where they are, inside their channel's gate, for as long as
 * it takes: no clock runs on a publish before its upload begins, and
 * nothing is sent to the platform while it waits. Small files, and the
 * links handed to platforms that fetch media themselves, pass straight
 * through.
 */
export const limitedUploads = Layer.effect(
  MediaForPublishing,
  Effect.gen(function* LimitedUploads() {
    const media = yield* MediaForPublishing;
    const slots = yield* Semaphore.make(yield* uploadSlotsConfig);

    // Waiting for a slot can be given up, as at a shutdown; once taken,
    // the slot goes back when the stream's scope closes.
    const slot = Effect.uninterruptibleMask((restore) =>
      Metric.modify(waiting, 1).pipe(
        Effect.andThen(
          restore(Semaphore.take(slots, 1)).pipe(
            Effect.ensuring(Metric.modify(waiting, -1))
          )
        ),
        Effect.andThen(Metric.modify(sending, 1)),
        Effect.andThen(
          Effect.addFinalizer(() =>
            Metric.modify(sending, -1).pipe(
              Effect.andThen(Semaphore.release(slots, 1))
            )
          )
        )
      )
    );

    return MediaForPublishing.of({
      describe: media.describe,
      // The slot is taken before the stream is handed over, and kept for
      // the caller's scope: the stream is the store's, read without
      // another wait, as often as the request is sent.
      held: (workspaceId, mediaId) =>
        media.describe(workspaceId, mediaId).pipe(
          Effect.flatMap(({ byteSize }) =>
            byteSize >= largeUpload ? slot : Effect.void
          ),
          Effect.andThen(media.held(workspaceId, mediaId))
        ),
      open: (workspaceId, mediaId) =>
        Stream.unwrap(
          media
            .describe(workspaceId, mediaId)
            .pipe(
              Effect.map(({ byteSize }) =>
                byteSize >= largeUpload
                  ? Stream.scoped(
                      Stream.fromEffect(slot).pipe(
                        Stream.flatMap(() => media.open(workspaceId, mediaId))
                      )
                    )
                  : media.open(workspaceId, mediaId)
              )
            )
        ),
      publicUrl: media.publicUrl,
    });
  })
);
