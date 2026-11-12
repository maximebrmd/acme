import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Fiber, Layer, Option, Result } from "effect";
import { SqlClient } from "effect/sql";
import sharp from "sharp";

import { WritingAssistant } from "#assistant/application/writing-assistant.ts";
import type { ImageAsked } from "#assistant/application/writing-assistant.ts";
import { maxImagePromptLength } from "#assistant/domain/image-prompt.ts";
import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import {
  markReady,
  markUploaded,
  startUpload,
} from "#media/domain/media-asset.ts";
import { MediaMetadata } from "#media/domain/media-metadata.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import { Ids } from "#shared/application/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  actorIn,
  DatabaseTest,
  FakeImageModel,
  freshWorkspace,
  imagesTest,
} from "#test/assistant/support.ts";
import type { ImageReply } from "#test/assistant/support.ts";
import { everyWorkspaceOn } from "#test/billing/support.ts";
import { syntheticPdf } from "#test/media/pdf.ts";
import { storageSettings } from "#test/media/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Images made by the assistant: on Postgres and the development stack's
// store, with a fake image model. Nothing here reaches a provider.

const ImagesTest = Layer.mergeAll(
  S3MediaStorageLive,
  DrizzleMediaAssetsLive
).pipe(Layer.provideMerge(DatabaseTest), Layer.provide(storageSettings));

const madePng = Effect.promise(
  async () =>
    new Uint8Array(
      await sharp({
        create: { background: "#ff8800", channels: 3, height: 48, width: 48 },
      })
        .png()
        .toBuffer()
    )
);

const lighthouse: ImageAsked = {
  aspect: "landscape",
  prompt: "A lighthouse at dawn, in watercolour.",
};

const image = (bytes: Uint8Array): ImageReply => ({ _tag: "image", bytes });

// Asks for `request`, the model answering `reply`, as a contributor.
const ask = (
  workspaceId: WorkspaceId,
  reply: ImageReply,
  request: ImageAsked = lighthouse
) =>
  FakeImageModel.use((model) => model.replyWith(reply)).pipe(
    Effect.andThen(
      WritingAssistant.use((assistant) =>
        assistant.generateImage(actorIn(workspaceId), request)
      )
    )
  );

const remainingIn = (workspaceId: WorkspaceId) =>
  WritingAssistant.use((assistant) =>
    assistant.status(actorIn(workspaceId))
  ).pipe(Effect.map(({ remaining }) => remaining));

const sentRequests = FakeImageModel.use((model) => model.requests);

// The workspace's assets go when the test ends, their files first.
const cleanedUp = (workspaceId: WorkspaceId) =>
  Effect.addFinalizer(() =>
    Effect.gen(function* cleanUp() {
      const assets = yield* MediaAssets;
      const storage = yield* MediaStorage;

      const { assets: left } = yield* assets.list(workspaceId, {
        after: Option.none(),
        limit: 50,
      });

      yield* Effect.all(
        left.map((asset) =>
          storage
            .remove(asset.storageKey)
            .pipe(
              Effect.andThen(assets.remove(workspaceId, asset.id)),
              Effect.ignore
            )
        )
      );
    })
  );

const imagesOf = (workspaceId: WorkspaceId) =>
  MediaAssets.use((assets) =>
    assets.list(workspaceId, { after: Option.none(), limit: 50 })
  ).pipe(Effect.map(({ assets }) => assets));

layer(ImagesTest, { timeout: "60 seconds" })(
  "images made by the assistant",
  (it) => {
    it.effect("stores the image in the library, ready and marked", () =>
      Effect.gen(function* makes() {
        const workspaceId = yield* freshWorkspace;

        yield* cleanedUp(workspaceId);

        const png = yield* madePng;
        const made = yield* ask(workspaceId, image(png));

        assert.deepInclude(made, {
          aiGenerated: true,
          altText: null,
          byteSize: png.byteLength,
          contentType: "image/png",
          kind: "image",
          status: { _tag: "ready" },
        });
        assert.deepStrictEqual(made.dimensions, { height: 48, width: 48 });
        assert.isString(made.url);

        const [stored] = yield* imagesOf(workspaceId);

        assert.strictEqual(stored?.id, made.id);
        assert.strictEqual(stored?.workspaceId, workspaceId);

        // The prompt goes to the model as it is, with the size asked for.
        assert.deepStrictEqual(
          (yield* sentRequests).map(
            ({ aspect, prompt }): readonly [string, string] => [aspect, prompt]
          ),
          [["landscape", lighthouse.prompt]]
        );

        // One image is five of the day's requests.
        assert.strictEqual(yield* remainingIn(workspaceId), 5);
      }).pipe(Effect.provide(imagesTest()))
    );

    it.effect("needs assistant:use and media:upload", () =>
      Effect.gen(function* permissions() {
        const workspaceId = yield* freshWorkspace;
        const assistant = yield* WritingAssistant;

        yield* FakeImageModel.use((model) =>
          model.replyWith(image(new Uint8Array(8)))
        );

        const viewer = permissionsFor("viewer");
        const contributor = permissionsFor("contributor");

        const refusals = yield* Effect.forEach(
          [
            viewer,
            contributor.filter((permission) => permission !== "media:upload"),
            contributor.filter((permission) => permission !== "assistant:use"),
          ],
          (held) =>
            assistant
              .generateImage(actorIn(workspaceId, held), lighthouse)
              .pipe(
                Effect.flip,
                Effect.map((refusal) => refusal._tag)
              )
        );

        assert.deepStrictEqual(refusals, [
          "MissingPermission",
          "MissingPermission",
          "MissingPermission",
        ]);
        assert.lengthOf(yield* sentRequests, 0);
        assert.strictEqual(yield* remainingIn(workspaceId), 10);
      }).pipe(Effect.provide(imagesTest()))
    );

    it.effect("is off without an image model, and says so in the status", () =>
      Effect.gen(function* off() {
        const workspaceId = yield* freshWorkspace;

        const status = yield* WritingAssistant.use((assistant) =>
          assistant.status(actorIn(workspaceId))
        );

        assert.deepStrictEqual(status.images, {
          aspects: ["square", "landscape", "portrait"],
          available: false,
          maxPromptLength: 1000,
          requestCost: 5,
        });

        const refused = yield* ask(workspaceId, image(yield* madePng)).pipe(
          Effect.flip
        );

        assert.strictEqual(refused._tag, "AssistantUnavailable");
        assert.lengthOf(yield* sentRequests, 0);
      }).pipe(Effect.provide(imagesTest({ images: "off" })))
    );

    it.effect(
      "refuses a blank or overlong prompt before anything is spent",
      () =>
        Effect.gen(function* prompts() {
          const workspaceId = yield* freshWorkspace;

          for (const prompt of ["  \n", "a".repeat(maxImagePromptLength + 1)]) {
            const refused = yield* ask(workspaceId, image(new Uint8Array(8)), {
              ...lighthouse,
              prompt,
            }).pipe(Effect.flip);

            assert.deepInclude(refused, {
              _tag: "DraftRejected",
              maxLength: maxImagePromptLength,
            });
          }

          assert.lengthOf(yield* sentRequests, 0);
          assert.strictEqual(yield* remainingIn(workspaceId), 10);
        }).pipe(Effect.provide(imagesTest()))
    );

    it.effect("makes none with fewer requests left than an image costs", () =>
      Effect.gen(function* quota() {
        const workspaceId = yield* freshWorkspace;

        yield* cleanedUp(workspaceId);

        const png = yield* madePng;

        yield* ask(workspaceId, image(png));

        const refused = yield* ask(workspaceId, image(png)).pipe(Effect.flip);

        assert.deepInclude(refused, {
          _tag: "AssistantQuotaExceeded",
          dailyLimit: 7,
        });
        assert.lengthOf(yield* sentRequests, 1);
        assert.strictEqual(yield* remainingIn(workspaceId), 2);
      }).pipe(Effect.provide(imagesTest({ dailyRequests: 7 })))
    );

    it.effect("lets two requests sent together past the quota once", () =>
      Effect.gen(function* together() {
        const workspaceId = yield* freshWorkspace;

        yield* cleanedUp(workspaceId);

        const png = yield* madePng;

        yield* FakeImageModel.use((model) => model.replyWith(image(png)));

        const outcomes = yield* Effect.all(
          [lighthouse, lighthouse].map((request) =>
            WritingAssistant.use((assistant) =>
              assistant.generateImage(actorIn(workspaceId), request)
            ).pipe(
              Effect.match({
                onFailure: (refusal) => refusal._tag,
                onSuccess: () => "made",
              })
            )
          ),
          { concurrency: "unbounded" }
        );

        assert.deepStrictEqual(outcomes.toSorted(), [
          "AssistantQuotaExceeded",
          "made",
        ]);
        assert.strictEqual(yield* remainingIn(workspaceId), 2);
      }).pipe(Effect.provide(imagesTest({ dailyRequests: 7 })))
    );

    it.effect("gives the cost back only when the provider never ran it", () =>
      Effect.gen(function* giveBack() {
        const workspaceId = yield* freshWorkspace;

        const reasons = yield* Effect.all(
          (["unreachable", "refused", "unusableAnswer"] as const).map(
            (reason) =>
              ask(workspaceId, { _tag: "failure", reason }).pipe(
                Effect.flip,
                Effect.map((refusal) =>
                  refusal._tag === "ImageFailed" ? refusal.reason : refusal._tag
                )
              )
          )
        );

        assert.deepStrictEqual(reasons, [
          "unreachable",
          "refused",
          "unusableAnswer",
        ]);

        // The refusal and the unusable answer ran on the provider.
        assert.strictEqual(yield* remainingIn(workspaceId), 10);
      }).pipe(Effect.provide(imagesTest({ dailyRequests: 20 })))
    );

    it.effect(
      "counts bytes that are not an image, and keeps none of them",
      () =>
        Effect.gen(function* unusable() {
          const workspaceId = yield* freshWorkspace;

          const refused = yield* ask(workspaceId, image(syntheticPdf(1))).pipe(
            Effect.flip
          );

          assert.deepInclude(refused, {
            _tag: "ImageFailed",
            reason: "unusableAnswer",
          });
          assert.lengthOf(yield* imagesOf(workspaceId), 0);
          assert.strictEqual(yield* remainingIn(workspaceId), 5);
        }).pipe(Effect.provide(imagesTest()))
    );

    it.effect("runs two images a workspace at once, and refuses a third", () =>
      Effect.gen(function* busy() {
        const workspaceId = yield* freshWorkspace;

        yield* FakeImageModel.use((model) =>
          model.replyWith({ _tag: "silence" })
        );

        const waiting = yield* Effect.forEach([1, 2], () =>
          WritingAssistant.use((assistant) =>
            assistant.generateImage(actorIn(workspaceId), lighthouse)
          ).pipe(Effect.forkChild)
        );

        // Once both reached the model, a third finds no slot.
        for (let round = 0; round < 500; round += 1) {
          if ((yield* sentRequests).length === 2) {
            break;
          }

          yield* Effect.yieldNow;
        }

        const refused = yield* ask(workspaceId, { _tag: "silence" }).pipe(
          Effect.flip
        );

        assert.strictEqual(refused._tag, "ImagesBusy");

        yield* Effect.all(waiting.map((fiber) => Fiber.interrupt(fiber)));

        // Without the two, a slot is free again.
        yield* FakeImageModel.use((model) =>
          model.replyWith({ _tag: "failure", reason: "refused" })
        );

        const after = yield* ask(workspaceId, {
          _tag: "failure",
          reason: "refused",
        }).pipe(Effect.flip);

        assert.strictEqual(after._tag, "ImageFailed");
      }).pipe(Effect.provide(imagesTest({ dailyRequests: 100 })))
    );
  }
);

layer(ImagesTest, { timeout: "60 seconds" })(
  "images made by the assistant on a plan",
  (it) => {
    it.effect("refuses before anything is spent when storage is full", () =>
      Effect.gen(function* full() {
        const workspaceId = yield* freshWorkspace;
        const assets = yield* MediaAssets;
        const sql = yield* SqlClient.SqlClient;
        const id = MediaAssetIdSchema.make(yield* Ids.use((ids) => ids.next));
        const at = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

        // A video that leaves the free plan less room than an image takes.
        const video = startUpload(
          {
            accepted: {
              byteSize: 490_000_000,
              contentType: "video/mp4",
              kind: "video",
            },
            altText: Option.none(),
            id,
            upload: { _tag: "single" },
            workspaceId,
          },
          at
        );

        yield* assets.insert(
          Result.getOrThrow(
            markReady(
              Result.getOrThrow(markUploaded(video, at)),
              MediaMetadata.unknown,
              at
            )
          )
        );
        yield* Effect.addFinalizer(() =>
          sql`DELETE FROM media.media_assets WHERE id = ${id}`.pipe(
            Effect.ignore
          )
        );

        const refused = yield* ask(workspaceId, image(yield* madePng)).pipe(
          Effect.flip
        );

        assert.deepInclude(refused, {
          _tag: "PlanLimitReached",
          limit: "mediaStorage",
        });
        assert.lengthOf(yield* sentRequests, 0);
        assert.strictEqual(yield* remainingIn(workspaceId), 10);
      }).pipe(
        Effect.provide(imagesTest({ entitlements: everyWorkspaceOn("free") }))
      )
    );
  }
);
