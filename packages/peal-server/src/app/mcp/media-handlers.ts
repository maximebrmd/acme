import { Effect, Option, Schema } from "effect";
import {
  CurrentMember,
  defaultMediaPageSize,
  imageRequestCost,
} from "peal-contract";

import { MediaTools } from "#app/mcp/media-tools.ts";
import { notAllowed, planRefusal, refuse } from "#app/mcp/refusals.ts";
import { WritingAssistant } from "#assistant/application/writing-assistant.ts";
import { itemView } from "#media/api/media-view.ts";
import { MediaLibrary } from "#media/application/media-library.ts";
import type { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { actorOf } from "#shared/api/actor.ts";

const decodeAssetId = Schema.decodeUnknownOption(MediaAssetIdSchema);

const noSuchMedia = () =>
  refuse(
    "The workspace has no media with this id: list_media answers those it has."
  );

// The media a call names, or a refusal: an id of the wrong form names none.
const assetOf = (raw: string) =>
  Option.match(decodeAssetId(raw), {
    onNone: noSuchMedia,
    onSome: (assetId) => Effect.succeed(assetId),
  });

// The log says why, for whoever runs the server; the model is told to wait.
const storeDown = (failure: MediaStorageFailed) =>
  Effect.logWarning("The media store failed", failure).pipe(
    Effect.andThen(
      refuse(
        "The server's media store did not answer: try again in a few minutes."
      )
    )
  );

const megabytes = (bytes: number) =>
  `${String(Math.ceil(bytes / 1_048_576))} MiB`;

// Why a file could not be fetched, and what to do about it.
const unreachable = {
  badStatus:
    "its host did not answer with the file (a page that needs a sign-in, or an address that no longer exists)",
  noAnswer: "its host did not answer, or broke off",
  tooManyRedirects: "it redirects more than three times",
  tooSlow:
    "it did not arrive in time: a file this large or this slow is uploaded by the user instead, in the web app or with `peal media upload`",
  unknownHost: "its host name does not exist",
} as const;

// Why the image model made no image, and what to do about it.
const imageFailures = {
  refused:
    "The image provider refused this description, under its content rules or for the size asked for. Nothing was made or spent. Ask the user for another description.",
  timedOut:
    "The image provider took too long to answer. Nothing was stored, and the requests it cost are spent, as it may have made the image: call again only if the user wants to.",
  unreachable:
    "The image provider could not be reached. Nothing was spent or stored: call again in a few minutes.",
  unusableAnswer:
    "The image provider answered with nothing Peal stores as an image. Nothing was stored; the requests it cost are spent.",
} as const;

// Why the workspace's own image provider made no image. Peal's own model
// is never asked instead, and nothing of the day's requests was spent.
const imageProviderRefusals = {
  addressRefused:
    "The workspace's own image provider is at an address Peal sends nothing to (not public, or a name that does not resolve). Nothing was made or spent. Someone who may change the workspace's assistant settings fixes the address in the web app.",
  keyUnreadable:
    "The key of the workspace's own image provider can no longer be read on this server. Nothing was made or spent. Someone who may change the workspace's assistant settings types the key again in the web app.",
  settingsRefused:
    "The workspace's own image provider refused its key, its account, its model or its address. Nothing was made or spent of Peal's requests. Someone who may change the workspace's assistant settings fixes them in the web app.",
} as const;

/**
 * What the media tools do, through the media context's use cases, and the
 * assistant's for an image it makes.
 */
export const MediaToolsLive = MediaTools.toLayer(
  Effect.gen(function* mediaTools() {
    const library = yield* MediaLibrary;
    const assistant = yield* WritingAssistant;
    const refusedByPlan = yield* planRefusal;

    const actor = CurrentMember.pipe(Effect.map(actorOf));

    return MediaTools.of({
      delete_media: ({ mediaId }) =>
        Effect.gen(function* deleting() {
          const assetId = yield* assetOf(mediaId);

          const lost = yield* library.deleteMedia(yield* actor, assetId).pipe(
            Effect.catchTags({
              MediaAssetNotFound: noSuchMedia,
              MediaInUse: ({ postIds }) =>
                refuse(
                  `The media was not deleted: posts that are scheduled or being published show it (${postIds.join(", ")}). Take them back to draft and remove it from them first, or wait until they have gone out.`
                ),
              MediaStorageFailed: storeDown,
              MissingPermission: notAllowed("delete media"),
            })
          );

          return { draftsThatLostIt: [...lost], mediaId: assetId };
        }),
      describe_media: ({ altText, mediaId }) =>
        Effect.gen(function* describing() {
          const assetId = yield* assetOf(mediaId);

          const described = yield* library
            .describeMedia(yield* actor, assetId, Option.fromNullOr(altText))
            .pipe(
              Effect.catchTags({
                AltTextTooLong: ({ maxLength }) =>
                  refuse(
                    `The altText is longer than the ${String(maxLength)} characters a description may have: shorten it.`
                  ),
                MediaAssetNotFound: noSuchMedia,
                MediaStorageFailed: storeDown,
                MissingPermission: notAllowed("describe media"),
              })
            );

          return itemView(described);
        }),
      generate_image: ({ aspect, prompt }) =>
        Effect.gen(function* generating() {
          const maker = yield* actor;

          return yield* assistant
            .generateImage(maker, { aspect: aspect ?? "square", prompt })
            .pipe(
              Effect.catchTags({
                AssistantQuotaExceeded: ({ dailyLimit }) =>
                  refuse(
                    dailyLimit < imageRequestCost
                      ? `The workspace's plan makes no image: an image costs ${String(imageRequestCost)} assistant requests, and its day holds ${String(dailyLimit)} for images (none while a plan is on trial). Nothing was made; the user moves to a plan that allows more, or uploads a picture instead.`
                      : `The workspace has fewer of its ${String(dailyLimit)} daily assistant requests left than an image costs. Nothing was made; ask again after midnight UTC, or the user moves to a plan that allows more.`
                  ),
                AssistantUnavailable: () =>
                  refuse(
                    "This Peal server makes no images for this workspace: the workspace has no image provider of its own, and the server's operator has not set up an image model, or that provider refused the server's settings. Ask the user for a picture to upload or import instead, or to have an owner or an admin set the workspace's own image provider in the web app."
                  ),
                DraftRejected: ({ maxLength, reason }) =>
                  refuse(
                    reason === "empty"
                      ? "The prompt is blank: describe what the image should show."
                      : `The prompt is longer than the ${String(maxLength)} characters an image is made from: shorten it.`
                  ),
                ImageFailed: ({ reason }) => refuse(imageFailures[reason]),
                ImageNotStored: () =>
                  refuse(
                    "The image was made, but the server's media store did not answer, so it was not kept: try again in a few minutes."
                  ),
                ImageProviderRefused: ({ reason }) =>
                  refuse(imageProviderRefusals[reason]),
                ImagesBusy: () =>
                  refuse(
                    "The workspace already has two images being made, or the server as many as it makes together: nothing was asked. Call again in a moment, once one has finished."
                  ),
                MissingPermission: notAllowed("make an image into the media"),
                OwnImagesExhausted: ({ dailyLimit }) =>
                  refuse(
                    `The workspace asked its own image provider for ${String(dailyLimit)} images today, the most a day allows, whatever each ended with: nothing was made. Ask again after midnight UTC.`
                  ),
                PlanLimitReached: refusedByPlan(
                  maker.workspaceId,
                  "Nothing was made."
                ),
              })
            );
        }),
      get_media: ({ mediaId }) =>
        Effect.gen(function* getting() {
          const assetId = yield* assetOf(mediaId);

          const item = yield* library.getMedia(yield* actor, assetId).pipe(
            Effect.catchTags({
              MediaAssetNotFound: noSuchMedia,
              MediaStorageFailed: storeDown,
              MissingPermission: notAllowed("see the workspace's media"),
            })
          );

          return itemView(item);
        }),
      get_media_usage: ({ mediaId }) =>
        Effect.gen(function* usage() {
          const assetId = yield* assetOf(mediaId);

          return yield* library.mediaUsage(yield* actor, assetId).pipe(
            Effect.catchTags({
              MediaAssetNotFound: noSuchMedia,
              MissingPermission: notAllowed("see the workspace's media"),
            })
          );
        }),
      import_media: ({ altText, url }) =>
        Effect.gen(function* importing() {
          const importer = yield* actor;

          const imported = yield* library
            .importMedia(importer, {
              altText: Option.fromUndefinedOr(altText),
              url,
            })
            .pipe(
              Effect.catchTags({
                AltTextTooLong: ({ maxLength }) =>
                  refuse(
                    `The altText is longer than the ${String(maxLength)} characters a description may have: shorten it.`
                  ),
                MediaImportBusy: () =>
                  refuse(
                    "The workspace already imports two files at once, or the server as many as it runs together: nothing was fetched. Call again in a moment, once one has finished."
                  ),
                MediaSourceNotPublic: () =>
                  refuse(
                    "Peal does not fetch this address: it must be an https:// URL on the default port, without a user name or password, whose host is public (not localhost or a private network), and so must every redirect it answers. Ask the user for a public link to the file, or to upload it themselves."
                  ),
                MediaSourceUnreachable: ({ reason, status }) =>
                  refuse(
                    `The file could not be fetched: ${unreachable[reason]}${Option.match(
                      status,
                      {
                        onNone: () => "",
                        onSome: (code) => ` (HTTP ${String(code)})`,
                      }
                    )}. Nothing was stored.`
                  ),
                MediaStorageFailed: storeDown,
                MediaTooLarge: ({ byteSize, kind, maxByteSize }) =>
                  refuse(
                    `The ${kind} is too large: ${megabytes(byteSize)} or more, where Peal stores ${megabytes(maxByteSize)} at most for ${kind === "image" ? "an image" : "a video"}. Nothing was stored.`
                  ),
                MissingPermission: notAllowed("add media"),
                PlanLimitReached: refusedByPlan(
                  importer.workspaceId,
                  "Nothing was stored."
                ),
                UnsupportedMediaType: ({ contentType }) =>
                  refuse(
                    `The address did not answer with a file Peal stores (its host calls it ${contentType}): JPEG, PNG, GIF and WebP images, MP4 and QuickTime videos. A link to a page that shows the picture is not the picture: ask for the file's own address.`
                  ),
                UploadRejected: () =>
                  refuse(
                    "The file is not in the format it starts as, and was not kept."
                  ),
              })
            );

          return itemView(imported);
        }),
      list_media: ({ cursor, limit }) =>
        Effect.gen(function* listing() {
          // A cursor is the id of the last media of the page before.
          const after = Option.fromUndefinedOr(cursor).pipe(
            Option.map(decodeAssetId)
          );

          if (Option.isSome(after) && Option.isNone(after.value)) {
            return yield* refuse(
              "This cursor is not one list_media answered: start again without it."
            );
          }

          const page = yield* library
            .listMedia(yield* actor, {
              after: Option.flatten(after),
              limit: limit ?? defaultMediaPageSize,
            })
            .pipe(
              Effect.catchTags({
                MediaStorageFailed: storeDown,
                MissingPermission: notAllowed("see the workspace's media"),
              })
            );

          return {
            items: page.items.map(itemView),
            nextCursor: Option.getOrNull(page.next),
          };
        }),
    });
  })
);
