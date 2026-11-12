import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Fiber, Layer, Option, Result } from "effect";
import { SqlClient } from "effect/sql";
import sharp from "sharp";

import { WritingAssistant } from "#assistant/application/writing-assistant.ts";
import type { ImageAsked } from "#assistant/application/writing-assistant.ts";
import { ownImagesPerDay } from "#assistant/domain/image-limits.ts";
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
  FakeOwnImageModel,
  freshWorkspace,
  imagesTest,
} from "#test/assistant/support.ts";
import type { ImageReply, OwnImageReply } from "#test/assistant/support.ts";
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

const ownCalls = FakeOwnImageModel.use((model) => model.calls);

const syntheticKey = "synthetic-workspace-image-key";

// The workspace brings its own provider, as an admin sets it.
const bringProvider = (workspaceId: WorkspaceId) =>
  WritingAssistant.use((assistant) =>
    assistant.saveImageProvider(actorIn(workspaceId, permissionsFor("admin")), {
      apiKey: syntheticKey,
      baseUrl: "https://images.example.com/v1",
      model: "synthetic-image-model",
    })
  );

// Asks for `request`, the workspace's own provider answering `reply`.
const askOwn = (
  workspaceId: WorkspaceId,
  reply: OwnImageReply,
  request: ImageAsked = lighthouse
) =>
  FakeOwnImageModel.use((model) => model.replyWith(reply)).pipe(
    Effect.andThen(
      WritingAssistant.use((assistant) =>
        assistant.generateImage(actorIn(workspaceId), request)
      )
    )
  );

const ownImage = (bytes: Uint8Array): OwnImageReply => ({
  _tag: "image",
  bytes,
});

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
          dailyLimit: 10,
          maxPromptLength: 1000,
          requestCost: 5,
          source: null,
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

    it.effect("gives the cost back whenever the provider made nothing", () =>
      Effect.gen(function* giveBack() {
        const workspaceId = yield* freshWorkspace;

        const reasons = yield* Effect.all(
          (
            ["unreachable", "refused", "unusableAnswer", "timedOut"] as const
          ).map((reason) =>
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
          "timedOut",
        ]);

        // A key the provider refused ran nothing either.
        const keyRefused = yield* ask(workspaceId, { _tag: "keyRefused" }).pipe(
          Effect.flip
        );

        assert.strictEqual(keyRefused._tag, "AssistantUnavailable");

        // The unusable answer and the timeout may have made an image.
        assert.strictEqual(yield* remainingIn(workspaceId), 10);
      }).pipe(Effect.provide(imagesTest({ dailyRequests: 20 })))
    );

    it.effect(
      "gives the cost back when the plan has no room left to keep it",
      () =>
        Effect.gen(function* full() {
          const workspaceId = yield* freshWorkspace;

          const refused = yield* ask(
            workspaceId,
            image(new Uint8Array(8))
          ).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "PlanLimitReached");
          assert.strictEqual(yield* remainingIn(workspaceId), 10);
        }).pipe(Effect.provide(imagesTest({ library: "full" })))
    );

    it.effect("makes no image while the workspace's plan is on trial", () =>
      Effect.gen(function* trial() {
        const workspaceId = yield* freshWorkspace;

        const status = yield* WritingAssistant.use((assistant) =>
          assistant.status(actorIn(workspaceId))
        );

        assert.strictEqual(status.images.dailyLimit, 0);

        const refused = yield* ask(workspaceId, image(new Uint8Array(8))).pipe(
          Effect.flip
        );

        assert.deepInclude(refused, {
          _tag: "AssistantQuotaExceeded",
          dailyLimit: 0,
        });
        assert.lengthOf(yield* sentRequests, 0);
        assert.strictEqual(yield* remainingIn(workspaceId), 10);
      }).pipe(Effect.provide(imagesTest({ imageRequests: 0 })))
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
        const model = yield* FakeImageModel;

        // The provider holds both until the test releases them.
        yield* model.replyWith({ _tag: "held" });

        const waiting = yield* Effect.forEach([1, 2], () =>
          WritingAssistant.use((assistant) =>
            assistant.generateImage(actorIn(workspaceId), lighthouse)
          ).pipe(Effect.flip, Effect.forkChild)
        );

        // Both hold their slot at the provider: a third finds none. Were it
        // let through, the provider would refuse it at once rather than
        // leave the test waiting.
        yield* model.arrived(2);

        const refused = yield* ask(workspaceId, {
          _tag: "failure",
          reason: "refused",
        }).pipe(Effect.flip);

        assert.strictEqual(refused._tag, "ImagesBusy");
        assert.lengthOf(yield* sentRequests, 2);

        // Once the two end, a slot is free again.
        yield* model.release({ _tag: "failure", reason: "refused" });

        const ended = yield* Effect.all(waiting.map(Fiber.join));

        assert.deepStrictEqual(
          ended.map((failure) => failure._tag),
          ["ImageFailed", "ImageFailed"]
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
  "images made by the workspace's own provider",
  (it) => {
    it.effect(
      "makes the image with the workspace's key, counting none of the day's requests",
      () =>
        Effect.gen(function* own() {
          const workspaceId = yield* freshWorkspace;

          yield* cleanedUp(workspaceId);
          yield* bringProvider(workspaceId);

          const status = yield* WritingAssistant.use((assistant) =>
            assistant.status(actorIn(workspaceId))
          );

          assert.deepInclude(status.images, {
            available: true,
            requestCost: 0,
            source: "workspace",
          });

          const png = yield* madePng;
          const made = yield* askOwn(workspaceId, ownImage(png));

          assert.deepInclude(made, { aiGenerated: true, kind: "image" });
          assert.deepStrictEqual(
            (yield* ownCalls).map(({ apiKey, baseUrl, model, request }) => ({
              apiKey,
              aspect: request.aspect,
              baseUrl,
              model,
              prompt: request.prompt,
            })),
            [
              {
                apiKey: syntheticKey,
                aspect: "landscape",
                baseUrl: "https://images.example.com/v1",
                model: "synthetic-image-model",
                prompt: lighthouse.prompt,
              },
            ]
          );

          // The day's count did not move, and Peal's model was not asked.
          assert.strictEqual(yield* remainingIn(workspaceId), 10);
          assert.lengthOf(yield* sentRequests, 0);
        }).pipe(Effect.provide(imagesTest()))
    );

    it.effect("makes images on a trial, whose day holds none for images", () =>
      Effect.gen(function* trial() {
        const workspaceId = yield* freshWorkspace;

        yield* cleanedUp(workspaceId);
        yield* bringProvider(workspaceId);

        const made = yield* askOwn(workspaceId, ownImage(yield* madePng));

        assert.strictEqual(made.kind, "image");
        assert.strictEqual(yield* remainingIn(workspaceId), 10);
      }).pipe(Effect.provide(imagesTest({ imageRequests: 0 })))
    );

    it.effect(
      "makes images on a day of 3 requests, fewer than one of Peal's costs",
      () =>
        Effect.gen(function* free() {
          const workspaceId = yield* freshWorkspace;

          yield* cleanedUp(workspaceId);
          yield* bringProvider(workspaceId);

          const png = yield* madePng;

          yield* askOwn(workspaceId, ownImage(png));
          yield* askOwn(workspaceId, ownImage(png));

          assert.lengthOf(yield* ownCalls, 2);
          assert.strictEqual(yield* remainingIn(workspaceId), 3);
        }).pipe(Effect.provide(imagesTest({ dailyRequests: 3 })))
    );

    it.effect(
      "fails when its provider fails, and never asks Peal's model instead",
      () =>
        Effect.gen(function* failing() {
          const workspaceId = yield* freshWorkspace;

          yield* bringProvider(workspaceId);

          const unreachable = yield* askOwn(workspaceId, {
            _tag: "failure",
            reason: "unreachable",
          }).pipe(Effect.flip);

          assert.deepInclude(unreachable, {
            _tag: "ImageFailed",
            reason: "unreachable",
          });

          const refused = yield* askOwn(workspaceId, {
            _tag: "settingsRefused",
            status: 401,
          }).pipe(Effect.flip);

          assert.deepInclude(refused, {
            _tag: "ImageProviderRefused",
            reason: "settingsRefused",
            status: 401,
          });
          assert.strictEqual(yield* remainingIn(workspaceId), 10);
          assert.lengthOf(yield* sentRequests, 0);
        }).pipe(Effect.provide(imagesTest()))
    );

    it.effect(
      "asks nobody with a key that no longer opens, and says to type it again",
      () =>
        Effect.gen(function* unreadable() {
          const workspaceId = yield* freshWorkspace;
          const sql = yield* SqlClient.SqlClient;

          yield* bringProvider(workspaceId);

          // The address moved without the key being typed again.
          yield* sql`UPDATE assistant.image_providers SET base_url = 'https://other-images.example.com/v1' WHERE workspace_id = ${workspaceId}`;

          const refused = yield* askOwn(
            workspaceId,
            ownImage(new Uint8Array(8))
          ).pipe(Effect.flip);

          assert.deepInclude(refused, {
            _tag: "ImageProviderRefused",
            reason: "keyUnreadable",
          });
          assert.lengthOf(yield* ownCalls, 0);
          assert.lengthOf(yield* sentRequests, 0);
          assert.strictEqual(yield* remainingIn(workspaceId), 10);
        }).pipe(Effect.provide(imagesTest()))
    );

    it.effect(
      "takes the same slots: two images at once, and a third refused",
      () =>
        Effect.gen(function* busy() {
          const workspaceId = yield* freshWorkspace;
          const model = yield* FakeOwnImageModel;

          yield* bringProvider(workspaceId);
          yield* model.replyWith({ _tag: "held" });

          const waiting = yield* Effect.forEach([1, 2], () =>
            WritingAssistant.use((assistant) =>
              assistant.generateImage(actorIn(workspaceId), lighthouse)
            ).pipe(Effect.flip, Effect.forkChild)
          );

          yield* model.arrived(2);

          const refused = yield* askOwn(workspaceId, {
            _tag: "failure",
            reason: "refused",
          }).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "ImagesBusy");

          yield* model.release({ _tag: "failure", reason: "refused" });
          yield* Effect.all(waiting.map(Fiber.join));

          // Once the two end, their slots are back.
          const after = yield* askOwn(workspaceId, {
            _tag: "failure",
            reason: "refused",
          }).pipe(Effect.flip);

          assert.strictEqual(after._tag, "ImageFailed");
        }).pipe(Effect.provide(imagesTest()))
    );

    it.effect(
      "keeps slots of its own: workspaces whose provider never answers starve nobody else",
      () =>
        Effect.gen(function* starvation() {
          const own = yield* FakeOwnImageModel;

          const held = yield* Effect.forEach(
            [1, 2, 3, 4],
            () => freshWorkspace
          );

          yield* Effect.all(
            held.map((workspaceId) => bringProvider(workspaceId))
          );
          yield* own.replyWith({ _tag: "held" });

          // Each holds both its slots at a provider that never answers.
          const waiting = yield* Effect.forEach(
            held.flatMap((workspaceId) => [workspaceId, workspaceId]),
            (workspaceId) =>
              WritingAssistant.use((assistant) =>
                assistant.generateImage(actorIn(workspaceId), lighthouse)
              ).pipe(Effect.flip, Effect.forkChild)
          );

          yield* own.arrived(8);

          // A workspace on Peal's model still makes its image.
          const other = yield* freshWorkspace;

          yield* cleanedUp(other);

          const made = yield* ask(other, image(yield* madePng));

          assert.strictEqual(made.kind, "image");

          yield* own.release({ _tag: "failure", reason: "unreachable" });
          yield* Effect.all(waiting.map(Fiber.join));
        }).pipe(Effect.provide(imagesTest()))
    );

    it.effect(
      "makes at most ownImagesPerDay images a day with the workspace's provider, whatever they end with",
      () =>
        Effect.gen(function* capped() {
          const workspaceId = yield* freshWorkspace;

          yield* bringProvider(workspaceId);

          for (let made = 0; made < ownImagesPerDay; made += 1) {
            yield* askOwn(workspaceId, {
              _tag: "failure",
              reason: "unreachable",
            }).pipe(Effect.flip);
          }

          const refused = yield* askOwn(workspaceId, {
            _tag: "failure",
            reason: "unreachable",
          }).pipe(Effect.flip);

          assert.deepInclude(refused, {
            _tag: "OwnImagesExhausted",
            dailyLimit: ownImagesPerDay,
          });
          assert.lengthOf(yield* ownCalls, ownImagesPerDay);
          // Peal's allowance never moved.
          assert.strictEqual(yield* remainingIn(workspaceId), 10);
        }).pipe(Effect.provide(imagesTest()))
    );

    it.effect("makes Peal's model the source again once removed", () =>
      Effect.gen(function* removed() {
        const workspaceId = yield* freshWorkspace;
        const admin = actorIn(workspaceId, permissionsFor("admin"));

        yield* bringProvider(workspaceId);
        yield* WritingAssistant.use((assistant) =>
          assistant.removeImageProvider(admin)
        );

        const status = yield* WritingAssistant.use((assistant) =>
          assistant.status(actorIn(workspaceId))
        );

        assert.deepInclude(status.images, { requestCost: 5, source: "server" });
      }).pipe(Effect.provide(imagesTest()))
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

        // The workspace's own provider is not asked either.
        yield* bringProvider(workspaceId);

        const ownRefused = yield* askOwn(
          workspaceId,
          ownImage(yield* madePng)
        ).pipe(Effect.flip);

        assert.deepInclude(ownRefused, {
          _tag: "PlanLimitReached",
          limit: "mediaStorage",
        });
        assert.lengthOf(yield* ownCalls, 0);
      }).pipe(
        Effect.provide(imagesTest({ entitlements: everyWorkspaceOn("free") }))
      )
    );
  }
);
