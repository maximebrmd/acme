import { describe, expect, it } from "@effect/vitest";
import { Duration, Option, Result, Schema } from "effect";

import { maxDuration, MediaMetadata } from "#media/domain/media-metadata.ts";

const decode = Schema.decodeUnknownResult(MediaMetadata);

const withDuration = (duration: Duration.Duration) => ({
  codec: Option.none(),
  dimensions: Option.none(),
  duration: Option.some(duration),
});

describe(MediaMetadata, () => {
  it("records a duration of up to a day", () => {
    expect(Result.isSuccess(decode(withDuration(maxDuration)))).toBeTruthy();
  });

  it("refuses a longer duration, which no platform takes", () => {
    expect(
      Result.isFailure(
        decode(withDuration(Duration.sum(maxDuration, Duration.millis(1))))
      )
    ).toBeTruthy();
  });
});
