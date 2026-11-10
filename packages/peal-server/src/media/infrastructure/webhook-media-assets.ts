import { Effect, Layer, Option } from "effect";

import { MediaAssets } from "#media/application/ports/media-assets.ts";
import type { MediaAsset } from "#media/domain/media-asset.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import type { EventToPublish } from "#webhooks/application/webhook-events.ts";

// What the workspace's webhook endpoints hear of the asset as it now
// stands: `media.ready` once it is probed, `media.failed` when its file was
// refused or could not be probed, nothing while it waits. The key names the
// outcome, so one reached twice, as by two calls completing an upload at
// once, is sent once. Ids, the content type and a code: never the file,
// its name or its description.
const eventOf = (asset: MediaAsset): Option.Option<EventToPublish> => {
  const { status } = asset;
  const on = { mediaId: asset.id, workspaceId: asset.workspaceId };

  const failed = (reason: string): Option.Option<EventToPublish> =>
    Option.some({
      event: { data: { ...on, reason }, type: "media.failed" },
      key: `media:${asset.id}:failed:${reason}`,
    });

  if (status._tag === "ready") {
    return Option.some({
      event: {
        data: { ...on, contentType: asset.contentType },
        type: "media.ready",
      },
      key: `media:${asset.id}:ready`,
    });
  }

  if (status._tag === "rejected") {
    return failed(status.reason);
  }

  return status._tag === "uploaded" && status.probe !== "pending"
    ? failed(status.probe)
    : Option.none();
};

/**
 * The media assets of `stored`, telling the webhooks context how an upload
 * ended in the transaction that saves it: the asset's new status and its
 * event commit together, or not at all. A failure to tell is logged, and
 * never fails the upload: the asset says how it stands to whoever reads it.
 */
export const webhookMediaAssets = <E, R>(
  stored: Layer.Layer<MediaAssets, E, R>
) =>
  Layer.effect(
    MediaAssets,
    Effect.gen(function* WebhookMediaAssets() {
      const assets = yield* MediaAssets;
      const webhooks = yield* WebhookEvents;
      const { transaction } = yield* TransactionRunner;

      const tell = (asset: MediaAsset): Effect.Effect<void> =>
        Option.match(eventOf(asset), {
          onNone: () => Effect.void,
          onSome: (request) =>
            webhooks
              .publish(request)
              .pipe(
                Effect.catchCause((cause) =>
                  Effect.logError(
                    "A media asset's webhook event could not be published",
                    cause
                  ).pipe(Effect.annotateLogs({ assetId: asset.id }))
                )
              ),
        });

      return MediaAssets.of({
        ...assets,
        update: (asset, from) =>
          transaction(
            assets.update(asset, from).pipe(Effect.tap((saved) => tell(saved)))
          ).pipe(
            // The store's own failures are defects already: so is the
            // transaction's.
            Effect.catchTag("DatabaseError", Effect.die)
          ),
      });
    })
  ).pipe(Layer.provide(stored));
