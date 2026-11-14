import { assert, layer } from "@effect/vitest";
import { Effect, Fiber, Layer, Option } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import {
  Api,
  AssistantFailed,
  AssistantQuotaExceeded,
  AssistantUnavailable,
  Forbidden,
  MediaImportBusy,
} from "peal-contract";
import type { ImageRequest, Member } from "peal-contract";
import sharp from "sharp";

import { AssistantApiLive } from "#assistant/container.ts";
import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import type { Permission } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  DatabaseTest,
  FakeImageModel,
  freshWorkspace,
  imagesTest,
} from "#test/assistant/support.ts";
import type { ImageReply } from "#test/assistant/support.ts";
import { memberOf } from "#test/channels/support.ts";
import { storageSettings } from "#test/media/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The image endpoint on its real use case, Postgres, the development
// stack's store and a fake image model. Each request acts as a member, as
// the WorkspaceAccess middleware would.

const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["assistant"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        AssistantApiLive.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const as = (
  workspaceId: WorkspaceId,
  permissions: readonly Permission[] = permissionsFor("editor")
) => clientAs(memberOf(workspaceId, permissions));

const StoreTest = Layer.mergeAll(
  S3MediaStorageLive,
  DrizzleMediaAssetsLive
).pipe(Layer.provideMerge(DatabaseTest), Layer.provide(storageSettings));

const lighthouse: ImageRequest = {
  aspect: "square",
  prompt: "A lighthouse at dawn, in watercolour.",
};

const madePng = Effect.promise(
  async () =>
    new Uint8Array(
      await sharp({
        create: { background: "#0088ff", channels: 3, height: 32, width: 32 },
      })
        .png()
        .toBuffer()
    )
);

const replying = (reply: ImageReply) =>
  FakeImageModel.use((model) => model.replyWith(reply));

// The workspace's files go when the test ends.
const cleanedUp = (workspaceId: WorkspaceId) =>
  Effect.addFinalizer(() =>
    Effect.gen(function* cleanUp() {
      const assets = yield* MediaAssets;
      const storage = yield* MediaStorage;

      const { assets: left } = yield* assets.list(workspaceId, {
        after: Option.none(),
        kind: Option.none(),
        limit: 50,
        text: Option.none(),
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

layer(StoreTest, { timeout: "60 seconds" })("the image endpoint", (it) => {
  it.effect("makes an image into the library, marked as made by AI", () =>
    Effect.gen(function* makes() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId);
      const params = { workspaceId };

      yield* cleanedUp(workspaceId);
      yield* replying({ _tag: "image", bytes: yield* madePng });

      const status = yield* client.assistant.status({ params });

      assert.deepStrictEqual(status.images, {
        aspects: ["square", "landscape", "portrait"],
        available: true,
        dailyLimit: 10,
        maxPromptLength: 1000,
        month: null,
        reason: null,
        requestCost: 5,
        source: "server",
      });

      const response = yield* client.assistant.generateImage({
        params,
        payload: lighthouse,
        responseMode: "decoded-and-response",
      });

      const [made, raw] = response;

      assert.strictEqual(raw.status, 201);
      assert.deepInclude(made, {
        aiGenerated: true,
        altText: null,
        contentType: "image/png",
        kind: "image",
        status: { _tag: "ready" },
      });
      assert.deepStrictEqual(made.dimensions, { height: 32, width: 32 });
      assert.strictEqual(
        (yield* client.assistant.status({ params })).remaining,
        status.remaining - 5
      );
    }).pipe(Effect.provide(imagesTest()))
  );

  it.effect("answer the quota with the plan that allows an image", () =>
    Effect.gen(function* quota() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId);

      yield* replying({ _tag: "image", bytes: yield* madePng });

      const refused = yield* client.assistant
        .generateImage({ params: { workspaceId }, payload: lighthouse })
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        refused instanceof AssistantQuotaExceeded
          ? {
              dailyLimit: refused.dailyLimit,
              plan: refused.plan,
              planWithRoom: refused.planWithRoom,
            }
          : refused,
        { dailyLimit: 3, plan: "free", planWithRoom: "starter" }
      );
    }).pipe(Effect.provide(imagesTest({ dailyRequests: 3 })))
  );

  it.effect("say why an image could not be made", () =>
    Effect.gen(function* failures() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId);
      const params = { workspaceId };

      const reasons = yield* Effect.all(
        (["refused", "unusableAnswer", "timedOut", "unreachable"] as const).map(
          (reason) =>
            replying({ _tag: "failure", reason }).pipe(
              Effect.andThen(
                client.assistant.generateImage({ params, payload: lighthouse })
              ),
              Effect.flip,
              Effect.map((refusal) =>
                refusal instanceof AssistantFailed
                  ? refusal.reason
                  : refusal._tag
              )
            )
        )
      );

      assert.deepStrictEqual(reasons, [
        "declined",
        "invalidAnswer",
        "timedOut",
        "unreachable",
      ]);

      const keyRefused = yield* replying({ _tag: "keyRefused" }).pipe(
        Effect.andThen(
          client.assistant.generateImage({ params, payload: lighthouse })
        ),
        Effect.flip
      );

      assert.instanceOf(keyRefused, AssistantUnavailable);
    }).pipe(Effect.provide(imagesTest({ dailyRequests: 100 })))
  );

  it.effect("are off without an image model", () =>
    Effect.gen(function* off() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId);

      const refused = yield* client.assistant
        .generateImage({ params: { workspaceId }, payload: lighthouse })
        .pipe(Effect.flip);

      assert.instanceOf(refused, AssistantUnavailable);
    }).pipe(Effect.provide(imagesTest({ images: "off" })))
  );

  it.effect("answer 429 past the images a workspace makes at once", () =>
    Effect.gen(function* busy() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId);
      const params = { workspaceId };

      const model = yield* FakeImageModel;

      // The provider holds both until the test releases them.
      yield* model.replyWith({ _tag: "held" });

      const waiting = yield* Effect.forEach([1, 2], () =>
        client.assistant
          .generateImage({ params, payload: lighthouse })
          .pipe(Effect.flip, Effect.forkChild)
      );

      yield* model.arrived(2);

      // Were the third let through, the provider would refuse it at once
      // rather than leave the test waiting.
      yield* model.replyWith({ _tag: "failure", reason: "refused" });

      const refused = yield* client.assistant
        .generateImage({ params, payload: lighthouse })
        .pipe(Effect.flip);

      yield* model.release({ _tag: "failure", reason: "refused" });
      yield* Effect.all(waiting.map(Fiber.join));

      assert.instanceOf(refused, MediaImportBusy);
    }).pipe(Effect.provide(imagesTest({ dailyRequests: 100 })))
  );

  it.effect("are forbidden without media:upload or assistant:use", () =>
    Effect.gen(function* forbidden() {
      const workspaceId = yield* freshWorkspace;
      const params = { workspaceId };

      const refusals = yield* Effect.all(
        [
          permissionsFor("viewer"),
          permissionsFor("editor").filter(
            (permission) => permission !== "media:upload"
          ),
        ].map((permissions) =>
          as(workspaceId, permissions).pipe(
            Effect.flatMap((client) =>
              client.assistant.generateImage({ params, payload: lighthouse })
            ),
            Effect.flip
          )
        )
      );

      for (const refusal of refusals) {
        assert.instanceOf(refusal, Forbidden);
      }
    }).pipe(Effect.provide(imagesTest()))
  );
});
