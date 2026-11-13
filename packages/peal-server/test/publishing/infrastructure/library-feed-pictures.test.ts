import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { SqlClient } from "effect/sql";
import sharp from "sharp";

import { mediaWith } from "#media/container.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { HttpRemoteMedia } from "#media/infrastructure/http-remote-media.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import { FeedPictures } from "#publishing/application/feed-pictures.ts";
import { LibraryFeedPictures } from "#publishing/infrastructure/library-feed-pictures.ts";
import { Ids } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import {
  NoAccountsConnectedTest,
  UnmeteredTest,
} from "#test/billing/support.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import { syntheticPdf } from "#test/media/pdf.ts";
import {
  DatabaseTest,
  MediaInPostsTest,
  memberIn,
  NoWebhooks,
  storageSettings,
  TransactionsTest,
} from "#test/media/support.ts";
import { feedHost, serving } from "#test/publishing/fakes/feed-host.ts";

// An item's picture through the media context's import, as a feed's
// starter: a ready image is attached, anything else is skipped with why.
// A loopback host stands for the item's site, which only an open guard
// lets the server reach.

const PicturesTest = LibraryFeedPictures.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      mediaWith(
        HttpRemoteMedia.pipe(
          Layer.provide(OpenOutboundGuard),
          Layer.provide(FetchHttpClient.layer)
        )
      ).pipe(
        Layer.provide(
          Layer.mergeAll(
            MediaInPostsTest,
            UnmeteredTest,
            NoAccountsConnectedTest,
            NoWebhooks,
            TransactionsTest
          )
        )
      ),
      S3MediaStorageLive,
      DrizzleMediaAssetsLive
    ).pipe(Layer.provideMerge(DatabaseTest), Layer.provide(storageSettings))
  )
);

// Bytes that start like an MP4, which the import would store as a video.
const mp4Like = Uint8Array.from(
  { length: 4096 },
  (_, index) =>
    [0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d][index] ?? 7
);

const freshWorkspace = Ids.use((ids) => ids.next).pipe(
  Effect.map((uuid) => WorkspaceIdSchema.make(uuid))
);

const png = Effect.promise(
  async () =>
    new Uint8Array(
      await sharp({
        create: { background: "#ffffff", channels: 3, height: 40, width: 60 },
      })
        .png()
        .toBuffer()
    )
);

layer(PicturesTest, { timeout: "120 seconds" })("an item's picture", (it) => {
  it.effect("is imported and attached when it is an image", () =>
    Effect.gen(function* attached() {
      const workspaceId = yield* freshWorkspace;

      const host = yield* feedHost(
        new Map([
          ["/one.png", serving(yield* png, { "content-type": "image/png" })],
        ])
      );

      const picture = yield* FeedPictures.use((pictures) =>
        pictures.attach(memberIn(workspaceId), `${host.url}/one.png`, "A title")
      );

      assert.strictEqual(picture._tag, "attached");
    })
  );

  it.effect(
    "is skipped when it is not an image, cannot be had or may not be",
    () =>
      Effect.gen(function* skipped() {
        const workspaceId = yield* freshWorkspace;

        const host = yield* feedHost(
          new Map([
            [
              "/file.pdf",
              serving(syntheticPdf(1), { "content-type": "application/pdf" }),
            ],
            [
              "/text.txt",
              serving("Not a picture", { "content-type": "text/plain" }),
            ],
            ["/clip.mp4", serving(mp4Like, { "content-type": "video/mp4" })],
          ])
        );

        const attach = (
          url: string,
          permissions?: Parameters<typeof memberIn>[1]
        ) =>
          FeedPictures.use((pictures) =>
            pictures.attach(memberIn(workspaceId, permissions), url, "A title")
          ).pipe(
            Effect.map((picture) =>
              picture._tag === "skipped" ? picture.reason : "attached"
            )
          );

        assert.deepStrictEqual(
          [
            yield* attach(`${host.url}/file.pdf`),
            yield* attach(`${host.url}/clip.mp4`),
            yield* attach(`${host.url}/text.txt`),
            yield* attach(`${host.url}/missing.png`),
            yield* attach("https://user:secret@cdn.blog.example/one.png"),
            yield* attach(`${host.url}/text.txt`, ["media:read"]),
          ],
          [
            "notAnImage",
            "notAnImage",
            "notAnImage",
            "unreachable",
            "notPublic",
            "notAllowed",
          ]
        );

        // A file that is not an image is never stored.
        const [stored] = yield* SqlClient.SqlClient.use(
          (sql) =>
            sql<{
              readonly count: number;
            }>`SELECT count(*)::int AS count FROM media.media_assets WHERE workspace_id = ${workspaceId}`
        ).pipe(Effect.orDie);

        assert.strictEqual(stored?.count, 0);
      })
  );
});
