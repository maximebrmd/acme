import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Result } from "effect";

import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import {
  markReady,
  markRejected,
  markUnprobed,
  markUploaded,
  startUpload,
} from "#media/domain/media-asset.ts";
import { MediaMetadata } from "#media/domain/media-metadata.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { webhookMediaAssets } from "#media/infrastructure/webhook-media-assets.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { eventsSentTo } from "#test/webhooks/fakes/event-log.ts";
import {
  freshEndpoint,
  freshOwner,
  WebhooksTest,
} from "#test/webhooks/support.ts";

const Test = webhookMediaAssets(DrizzleMediaAssetsLive).pipe(
  Layer.provideMerge(WebhooksTest)
);

const now = DateTime.makeUnsafe("2026-11-10T09:00:00Z");

const probed = new MediaMetadata({
  codec: Option.none(),
  dimensions: Option.some({ height: 600, width: 800 }),
  duration: Option.none(),
});

// An image of the owner's workspace, its file stored and not probed yet,
// with an endpoint that hears about media.
const uploadedImage = Effect.fn("uploadedImage")(function* uploadedImage(
  owner: Actor
) {
  const assets = yield* MediaAssets;

  const { endpoint } = yield* freshEndpoint(owner, {
    eventTypes: ["media.ready", "media.failed"],
  });

  const pending = startUpload(
    {
      accepted: { byteSize: 2048, contentType: "image/png", kind: "image" },
      altText: Option.none(),
      id: yield* newId(MediaAssetIdSchema),
      upload: { _tag: "single" },
      workspaceId: owner.workspaceId,
    },
    now
  );

  yield* assets.insert(pending);

  const uploaded = yield* assets.update(
    Result.getOrThrow(markUploaded(pending, now)),
    "pending"
  );

  return { endpointId: endpoint.id, uploaded };
});

layer(Test)("media assets, to webhook endpoints", (it) => {
  it.effect("say nothing while a file waits, then that it is ready, once", () =>
    Effect.gen(function* ready() {
      const owner = yield* freshOwner;
      const assets = yield* MediaAssets;
      const { endpointId, uploaded } = yield* uploadedImage(owner);

      assert.lengthOf(yield* eventsSentTo(owner, endpointId), 0);

      const probedAsset = Result.getOrThrow(markReady(uploaded, probed, now));

      yield* assets.update(probedAsset, "uploaded");
      // A second call that completed the same upload finds it ready.
      yield* assets.update(probedAsset, "uploaded");

      assert.deepStrictEqual(yield* eventsSentTo(owner, endpointId), [
        {
          data: {
            contentType: "image/png",
            mediaId: uploaded.id,
            workspaceId: owner.workspaceId,
          },
          type: "media.ready",
        },
      ]);
    })
  );

  it.effect("say why a file was refused, or could not be probed", () =>
    Effect.gen(function* failed() {
      const owner = yield* freshOwner;
      const assets = yield* MediaAssets;
      const first = yield* uploadedImage(owner);

      yield* assets.update(
        Result.getOrThrow(markUnprobed(first.uploaded, "unreadable", now)),
        "uploaded"
      );
      yield* assets.update(
        Result.getOrThrow(markRejected(first.uploaded, "typeMismatch", now)),
        "uploaded"
      );

      assert.deepStrictEqual(
        (yield* eventsSentTo(owner, first.endpointId)).map((event) =>
          event.type === "media.failed" ? event.data.reason : event.type
        ),
        ["unreadable", "typeMismatch"]
      );
    })
  );

  it.effect("say nothing of a change that rolled back", () =>
    Effect.gen(function* rolledBack() {
      const owner = yield* freshOwner;
      const assets = yield* MediaAssets;
      const { transaction } = yield* TransactionRunner;
      const { endpointId, uploaded } = yield* uploadedImage(owner);
      const ready = Result.getOrThrow(markReady(uploaded, probed, now));

      yield* transaction(
        assets
          .update(ready, "uploaded")
          .pipe(Effect.andThen(Effect.fail("rolled back" as const)))
      ).pipe(Effect.flip);

      const stored = yield* assets.findById(owner.workspaceId, uploaded.id);

      assert.strictEqual(Option.getOrThrow(stored).status._tag, "uploaded");
      assert.lengthOf(yield* eventsSentTo(owner, endpointId), 0);
    })
  );
});
