import { describe, expect, it } from "@effect/vitest";
import { Duration, Option } from "effect";

import { MediaMetadata } from "#media/domain/media-metadata.ts";
import { metadataFromFfprobe } from "#media/infrastructure/ffprobe-video-probe.ts";

describe(metadataFromFfprobe, () => {
  it("reads the first video stream and the container's duration", () => {
    const metadata = metadataFromFfprobe({
      format: { duration: 12.3456 },
      streams: [
        { codec_name: "aac", codec_type: "audio" },
        { codec_name: "h264", codec_type: "video", height: 1080, width: 1920 },
      ],
    });

    expect(metadata).toStrictEqual(
      new MediaMetadata({
        codec: Option.some("h264"),
        dimensions: Option.some({ height: 1080, width: 1920 }),
        duration: Option.some(Duration.millis(12_346)),
      })
    );
  });

  it.each([90, -90, 270])(
    "swaps width and height for a rotation of %i degrees",
    (rotation) => {
      const metadata = metadataFromFfprobe({
        streams: [
          {
            codec_type: "video",
            height: 1080,
            side_data_list: [{ rotation }],
            width: 1920,
          },
        ],
      });

      expect(metadata.dimensions).toStrictEqual(
        Option.some({ height: 1920, width: 1080 })
      );
    }
  );

  it("knows nothing about a file without a video stream", () => {
    expect(
      metadataFromFfprobe({ streams: [{ codec_type: "audio", width: 0 }] })
    ).toStrictEqual(MediaMetadata.unknown);
  });
});
