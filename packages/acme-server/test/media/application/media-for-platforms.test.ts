import { assert, layer } from "@effect/vitest";
import { Duration, Effect, Layer, Option, Stream } from "effect";
import sharp from "sharp";

import { MediaForPlatforms } from "#media/application/media-for-platforms.ts";
import { MediaNotPublishable } from "#media/application/media-not-publishable.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { MediaLibrary, MediaLive } from "#media/container.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import { Ids } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  DatabaseTest,
  fetchBytes,
  memberIn,
  sendSigned,
  storageSettings,
} from "#test/media/support.ts";

const MediaTest = Layer.mergeAll(MediaLive, S3MediaStorageLive).pipe(
  Layer.provideMerge(DatabaseTest),
  Layer.provide(storageSettings)
);

const freshWorkspace: Effect.Effect<WorkspaceId, never, Ids> = Ids.use(
  (ids) => ids.next
).pipe(Effect.map((uuid) => WorkspaceIdSchema.make(uuid)));

const whitePng = Effect.promise(
  async () =>
    new Uint8Array(
      await sharp({
        create: { background: "#ffffff", channels: 3, height: 9, width: 16 },
      })
        .png()
        .toBuffer()
    )
);

// An image of the workspace, uploaded, and probed unless `probe` is false.
// Its file goes with the test.
const uploaded = Effect.fn("uploaded")(function* uploaded(
  workspaceId: WorkspaceId,
  options: { readonly probe: boolean }
) {
  const library = yield* MediaLibrary;
  const storage = yield* MediaStorage;
  const body = yield* whitePng;
  const member = memberIn(workspaceId);

  const prepared = yield* library.createUpload(member, {
    altText: Option.none(),
    byteSize: body.length,
    contentType: "image/png",
  });

  yield* Effect.addFinalizer(() =>
    storage.remove(prepared.asset.storageKey).pipe(Effect.orDie)
  );

  if (prepared.target._tag !== "single") {
    return yield* Effect.die("expected a single upload");
  }

  yield* sendSigned(prepared.target.request, body);

  yield* options.probe
    ? library.finishUpload(member, prepared.asset.id).pipe(Effect.asVoid)
    : library.completeUpload(member, prepared.asset.id).pipe(Effect.asVoid);

  return { body, id: prepared.asset.id };
});

layer(MediaTest)("MediaForPlatforms", (it) => {
  it.effect(
    "describes a ready asset and streams its bytes",
    () =>
      Effect.gen(function* describes() {
        const workspaceId = yield* freshWorkspace;
        const { body, id } = yield* uploaded(workspaceId, { probe: true });
        const media = yield* MediaForPlatforms;

        const described = yield* media.describe(workspaceId, id);
        const bytes = yield* Stream.mkUint8Array(media.read(workspaceId, id));

        assert.deepStrictEqual(described, {
          assetId: id,
          byteSize: body.length,
          contentType: "image/png",
          dimensions: Option.some({ height: 9, width: 16 }),
          duration: Option.none(),
          fileName: `${id}.png`,
          kind: "image",
        });
        assert.deepStrictEqual(bytes, body);
      }).pipe(Effect.scoped),
    30_000
  );

  it.effect(
    "gives a URL the file can be fetched from",
    () =>
      Effect.gen(function* publicUrl() {
        const workspaceId = yield* freshWorkspace;
        const { body, id } = yield* uploaded(workspaceId, { probe: true });
        const media = yield* MediaForPlatforms;

        const url = yield* media.publicUrl(
          workspaceId,
          id,
          Duration.minutes(30)
        );

        const fetched = yield* fetchBytes(url);

        assert.strictEqual(fetched.response.status, 200);
        assert.deepStrictEqual(fetched.bytes, body);
      }).pipe(Effect.scoped),
    30_000
  );

  it.effect(
    "hands out nothing of another workspace, or not ready",
    () =>
      Effect.gen(function* refuses() {
        const workspaceId = yield* freshWorkspace;
        const other = yield* freshWorkspace;
        const media = yield* MediaForPlatforms;
        const ready = yield* uploaded(workspaceId, { probe: true });
        const unprobed = yield* uploaded(workspaceId, { probe: false });

        const elsewhere = yield* media
          .describe(other, ready.id)
          .pipe(Effect.flip);

        const notReady = yield* Stream.runDrain(
          media.read(workspaceId, unprobed.id)
        ).pipe(Effect.flip);

        const noUrl = yield* media
          .publicUrl(other, ready.id, Duration.minutes(5))
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          elsewhere,
          new MediaNotPublishable({ assetId: ready.id, reason: "notFound" })
        );
        assert.deepStrictEqual(
          notReady,
          new MediaNotPublishable({ assetId: unprobed.id, reason: "notReady" })
        );
        assert.deepStrictEqual(
          noUrl,
          new MediaNotPublishable({ assetId: ready.id, reason: "notFound" })
        );
      }).pipe(Effect.scoped),
    30_000
  );
});
