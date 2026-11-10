import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option, Stream } from "effect";

import { MediaForPlatforms } from "#media/application/media-for-platforms.ts";
import type { PlatformMedia } from "#media/application/media-for-platforms.ts";
import { MediaNotPublishable } from "#media/application/media-not-publishable.ts";
import { MediaPreviews } from "#review/application/ports/media-previews.ts";
import { LibraryMediaPreviews } from "#review/infrastructure/library-media-previews.ts";
import { MediaAssetIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

const workspaceId = WorkspaceIdSchema.make(
  "3f1d2c4b-5a69-4788-9a0b-1c2d3e4f5a6b"
);

const pdf = MediaAssetIdSchema.make("01900000-0000-7000-8000-00000000d001");
const photo = MediaAssetIdSchema.make("01900000-0000-7000-8000-00000000d002");
const gone = MediaAssetIdSchema.make("01900000-0000-7000-8000-00000000d003");

const files: readonly PlatformMedia[] = [
  {
    assetId: pdf,
    byteSize: 2_000_000,
    contentType: "application/pdf",
    dimensions: Option.none(),
    duration: Option.none(),
    fileName: `${pdf}.pdf`,
    kind: "document",
  },
  {
    assetId: photo,
    byteSize: 200_000,
    contentType: "image/jpeg",
    dimensions: Option.some({ height: 800, width: 1200 }),
    duration: Option.none(),
    fileName: `${photo}.jpg`,
    kind: "image",
  },
];

// The media context handing out the two ready files, and no other.
const library = Layer.succeed(
  MediaForPlatforms,
  MediaForPlatforms.of({
    describe: (_workspaceId, assetId) =>
      Effect.fromNullishOr(files.find((file) => file.assetId === assetId)).pipe(
        Effect.mapError(
          () => new MediaNotPublishable({ assetId, reason: "notReady" })
        )
      ),
    publicUrl: (_workspaceId, assetId) =>
      Effect.succeed(`https://media.example.test/${assetId}`),
    read: () => Stream.empty,
  })
);

describe("the files of a post under review", () => {
  it.effect(
    "are an image, a video or a PDF document, each behind its link",
    () =>
      Effect.gen(function* handedOut() {
        const previews = yield* MediaPreviews;

        assert.deepStrictEqual(
          yield* previews.of(workspaceId, pdf),
          Option.some({
            contentType: "application/pdf",
            kind: "document" as const,
            url: `https://media.example.test/${pdf}`,
          })
        );
        assert.deepStrictEqual(
          (yield* previews.of(workspaceId, photo)).pipe(
            Option.map(({ kind }) => kind)
          ),
          Option.some("image" as const)
        );
        assert.deepStrictEqual(
          yield* previews.of(workspaceId, gone),
          Option.none()
        );
      }).pipe(Effect.provide(LibraryMediaPreviews.pipe(Layer.provide(library))))
  );
});
