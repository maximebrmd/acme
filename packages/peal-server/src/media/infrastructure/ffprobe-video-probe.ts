import { Duration, Effect, Option, Schema, Stream } from "effect";
import type { PlatformError } from "effect";
import { HttpClient } from "effect/http";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { MediaProbeFailed } from "#media/application/media-probe-failed.ts";
import { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import type {
  MediaSource,
  ProbeOutcome,
} from "#media/application/ports/media-probe.ts";
import { maxDuration, MediaMetadata } from "#media/domain/media-metadata.ts";

// What `ffprobe -print_format json` prints for the entries asked for below.
const FfprobeStreamSchema = Schema.Struct({
  codec_name: Schema.optionalKey(Schema.String),
  codec_type: Schema.optionalKey(Schema.String),
  height: Schema.optionalKey(Schema.Int),
  side_data_list: Schema.optionalKey(
    Schema.Array(Schema.Struct({ rotation: Schema.optionalKey(Schema.Number) }))
  ),
  width: Schema.optionalKey(Schema.Int),
});

export const FfprobeOutputSchema = Schema.Struct({
  format: Schema.optionalKey(
    Schema.Struct({ duration: Schema.optionalKey(Schema.FiniteFromString) })
  ),
  streams: Schema.optionalKey(Schema.Array(FfprobeStreamSchema)),
});

export type FfprobeOutput = typeof FfprobeOutputSchema.Type;

const decodeOutput = Schema.decodeUnknownEffect(
  Schema.fromJsonString(FfprobeOutputSchema)
);

const positive = (value: number | undefined): Option.Option<number> =>
  Option.fromUndefinedOr(value).pipe(Option.filter((pixels) => pixels > 0));

/**
 * The metadata of the first video stream. A rotation of a quarter turn,
 * which phones record instead of turning the pixels, swaps the displayed
 * width and height. A duration longer than acme records is left unknown.
 */
export const metadataFromFfprobe = (output: FfprobeOutput): MediaMetadata => {
  const video = output.streams?.find((stream) => stream.codec_type === "video");

  const rotation =
    video?.side_data_list?.find((data) => data.rotation !== undefined)
      ?.rotation ?? 0;

  const quarterTurn = Math.abs(rotation) % 180 === 90;

  const dimensions = Option.all({
    height: positive(video?.height),
    width: positive(video?.width),
  }).pipe(
    Option.map(({ height, width }) =>
      quarterTurn ? { height: width, width: height } : { height, width }
    )
  );

  return new MediaMetadata({
    codec: Option.filter(
      Option.fromUndefinedOr(video?.codec_name),
      (codec) => codec.length > 0
    ),
    dimensions,
    duration: Option.filter(
      Option.fromUndefinedOr(output.format?.duration),
      (seconds) => seconds >= 0
    ).pipe(
      Option.map((seconds) => Duration.millis(Math.round(seconds * 1000))),
      Option.filter(Duration.isLessThanOrEqualTo(maxDuration))
    ),
  });
};

const probeTimeout = Duration.minutes(1);

// ffprobe reads the file over HTTP(S), never from disk or another protocol,
// and only with the demuxer for MP4 and QuickTime, so a file posing as a
// playlist cannot make it fetch anything else.
const ffprobeArguments = (url: string): readonly string[] => [
  "-v",
  "error",
  "-protocol_whitelist",
  "http,https,tcp,tls",
  "-f",
  "mov",
  "-print_format",
  "json",
  "-show_entries",
  "stream=codec_type,codec_name,width,height:stream_side_data=rotation:format=duration",
  url,
];

const collect = (
  output: Stream.Stream<Uint8Array, PlatformError.PlatformError>
): Effect.Effect<string, PlatformError.PlatformError> =>
  output.pipe(Stream.decodeText(), Stream.mkString);

const isMissingProgram = (failure: PlatformError.PlatformError): boolean =>
  failure.reason._tag === "NotFound";

/**
 * Reads a video's dimensions, duration and codec by running ffprobe on its
 * URL. When the program is not installed, probing is skipped rather than
 * failed, so a server without ffprobe still takes videos. When ffprobe
 * fails, what it printed goes to the log, and a request for the file's
 * first byte tells a store that cannot serve it from a damaged file.
 */
export const makeFfprobeVideoProbe = Effect.fn("FfprobeVideoProbe.make")(
  function* makeFfprobeVideoProbe(program: string) {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

    // Scoped, so the request ends with the check whatever the store sends.
    const client = HttpClient.withScope(
      HttpClient.filterStatusOk(yield* HttpClient.HttpClient)
    );

    const servesFile = (url: string) =>
      Effect.scoped(client.get(url, { headers: { range: "bytes=0-0" } })).pipe(
        Effect.asVoid,
        Effect.catchTag("HttpClientError", (cause) =>
          Effect.fail(
            new MediaStorageFailed({ cause, operation: "read a file to probe" })
          )
        )
      );

    const run = (url: string) =>
      Effect.scoped(
        Effect.gen(function* runFfprobe() {
          const handle = yield* spawner.spawn(
            ChildProcess.make(program, ffprobeArguments(url))
          );

          return yield* Effect.all(
            {
              exitCode: handle.exitCode,
              stderr: collect(handle.stderr),
              stdout: collect(handle.stdout),
            },
            { concurrency: "unbounded" }
          );
        })
      );

    return Effect.fn("FfprobeVideoProbe.probe")(function* probe(
      source: MediaSource
    ) {
      const ran = yield* run(source.url).pipe(
        Effect.map(Option.some),
        Effect.catchIf(isMissingProgram, () => Effect.succeed(Option.none())),
        Effect.timeout(probeTimeout),
        Effect.mapError(
          (failure) =>
            new MediaProbeFailed({
              reason:
                failure._tag === "TimeoutError" ? "timedOut" : "toolFailed",
            })
        )
      );

      if (Option.isNone(ran)) {
        const skipped: ProbeOutcome = {
          _tag: "skipped",
          reason: "probeUnavailable",
        };

        return skipped;
      }

      const { exitCode, stderr, stdout } = ran.value;

      if (exitCode !== 0) {
        // The URL is presigned: keep it out of the log.
        yield* Effect.logWarning("ffprobe could not read a video", {
          exitCode,
          stderr: stderr.replaceAll(source.url, "<url>").trim(),
        });

        yield* servesFile(source.url);

        return yield* new MediaProbeFailed({ reason: "unreadable" });
      }

      const output = yield* decodeOutput(stdout).pipe(
        Effect.mapError(() => new MediaProbeFailed({ reason: "toolFailed" }))
      );

      const probed: ProbeOutcome = {
        _tag: "probed",
        metadata: metadataFromFfprobe(output),
      };

      return probed;
    });
  }
);
