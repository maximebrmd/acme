import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  AltTextTooLong,
  Api,
  CurrentMember,
  defaultMediaPageSize,
  MediaImportBusy,
  MediaInUse,
  MediaNotFound,
  MediaSourceNotPublic,
  MediaSourceUnreachable,
  MediaStoreUnavailable,
  MediaTooLarge,
  UnsupportedMediaType,
  UploadIncomplete,
  UploadRejected,
} from "peal-contract";
import type { UploadTarget as UploadTargetView } from "peal-contract";

import { MediaLibrary } from "#media/application/media-library.ts";
import type { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { limitRefusal } from "#shared/api/limit-reached.ts";

import { itemView, toView } from "./media-view.ts";

const decodeAssetId = Schema.decodeUnknownOption(MediaAssetIdSchema);

const notFound = () => Effect.fail(new MediaNotFound());

// The answer says only that the store is down; the log says why, for
// whoever runs the server.
const storeUnavailable = (failure: MediaStorageFailed) =>
  Effect.logWarning("The media store failed", failure).pipe(
    Effect.andThen(Effect.fail(new MediaStoreUnavailable()))
  );

/**
 * The asset an id in a path names. An id that is not a media id at all
 * names nothing, like one of another workspace.
 */
const assetIdOf = (mediaId: string) =>
  Option.match(decodeAssetId(mediaId), {
    onNone: notFound,
    onSome: Effect.succeed,
  });

export const MediaHandlers = HttpApiBuilder.group(
  Api,
  "media",
  Effect.fn(function* mediaHandlers(handlers) {
    const library = yield* MediaLibrary;
    const limitReached = yield* limitRefusal;

    return handlers.handleAll({
      complete: ({ params }) =>
        Effect.gen(function* complete() {
          const actor = actorOf(yield* CurrentMember);
          const assetId = yield* assetIdOf(params.mediaId);

          const finished = yield* library.finishUpload(actor, assetId).pipe(
            Effect.catchTags({
              InvalidMediaTransition: Effect.die,
              MediaAssetNotFound: notFound,
              MediaStorageFailed: storeUnavailable,
              MissingPermission: forbidden,
              PlanLimitReached: limitReached,
              UploadIncomplete: () => Effect.fail(new UploadIncomplete()),
              UploadRejected: ({ reason }) =>
                Effect.fail(new UploadRejected({ reason })),
            })
          );

          return itemView(finished);
        }),
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);

          const prepared = yield* library
            .createUpload(actor, {
              altText: Option.fromNullishOr(payload.altText),
              byteSize: payload.byteSize,
              contentType: payload.contentType,
            })
            .pipe(
              Effect.catchTags({
                AltTextTooLong: ({ maxLength }) =>
                  Effect.fail(new AltTextTooLong({ maxLength })),
                MediaStorageFailed: storeUnavailable,
                MediaTooLarge: ({ byteSize, kind, maxByteSize }) =>
                  Effect.fail(
                    new MediaTooLarge({ byteSize, kind, maxByteSize })
                  ),
                MissingPermission: forbidden,
                PlanLimitReached: limitReached,
                UnsupportedMediaType: ({ contentType }) =>
                  Effect.fail(new UnsupportedMediaType({ contentType })),
              })
            );

          const { target } = prepared;

          const upload: UploadTargetView =
            target._tag === "single"
              ? target
              : {
                  _tag: "multipart",
                  expiresAt: target.expiresAt,
                  partSize: target.partSize,
                  parts: target.parts,
                };

          // Nothing is stored yet, so there is nothing to show.
          return { media: toView(prepared.asset, Option.none()), upload };
        }),
      delete: ({ params }) =>
        Effect.gen(function* remove() {
          const actor = actorOf(yield* CurrentMember);
          const assetId = yield* assetIdOf(params.mediaId);

          yield* library.deleteMedia(actor, assetId).pipe(
            Effect.catchTags({
              MediaAssetNotFound: notFound,
              MediaInUse: ({ postIds }) =>
                Effect.fail(new MediaInUse({ postIds })),
              MediaStorageFailed: storeUnavailable,
              MissingPermission: forbidden,
            })
          );
        }),
      describe: ({ params, payload }) =>
        Effect.gen(function* describe() {
          const actor = actorOf(yield* CurrentMember);
          const assetId = yield* assetIdOf(params.mediaId);

          const described = yield* library
            .describeMedia(actor, assetId, Option.fromNullOr(payload.altText))
            .pipe(
              Effect.catchTags({
                AltTextTooLong: ({ maxLength }) =>
                  Effect.fail(new AltTextTooLong({ maxLength })),
                MediaAssetNotFound: notFound,
                MediaStorageFailed: storeUnavailable,
                MissingPermission: forbidden,
              })
            );

          return itemView(described);
        }),
      get: ({ params }) =>
        Effect.gen(function* get() {
          const actor = actorOf(yield* CurrentMember);
          const assetId = yield* assetIdOf(params.mediaId);

          const item = yield* library.getMedia(actor, assetId).pipe(
            Effect.catchTags({
              MediaAssetNotFound: notFound,
              MediaStorageFailed: storeUnavailable,
              MissingPermission: forbidden,
            })
          );

          return itemView(item);
        }),
      importFromUrl: ({ payload }) =>
        Effect.gen(function* importFromUrl() {
          const actor = actorOf(yield* CurrentMember);

          const imported = yield* library
            .importMedia(actor, {
              altText: Option.fromNullishOr(payload.altText),
              url: payload.url,
            })
            .pipe(
              Effect.catchTags({
                AltTextTooLong: ({ maxLength }) =>
                  Effect.fail(new AltTextTooLong({ maxLength })),
                MediaImportBusy: () => Effect.fail(new MediaImportBusy()),
                MediaSourceNotPublic: () =>
                  Effect.fail(new MediaSourceNotPublic()),
                MediaSourceUnreachable: ({ reason, status }) =>
                  Effect.fail(
                    new MediaSourceUnreachable({
                      reason,
                      status: Option.getOrNull(status),
                    })
                  ),
                MediaStorageFailed: storeUnavailable,
                MediaTooLarge: ({ byteSize, kind, maxByteSize }) =>
                  Effect.fail(
                    new MediaTooLarge({ byteSize, kind, maxByteSize })
                  ),
                MissingPermission: forbidden,
                PlanLimitReached: limitReached,
                UnsupportedMediaType: ({ contentType }) =>
                  Effect.fail(new UnsupportedMediaType({ contentType })),
                UploadRejected: ({ reason }) =>
                  Effect.fail(new UploadRejected({ reason })),
              })
            );

          return itemView(imported);
        }),
      list: ({ query }) =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          // A cursor is the id of the last media of the page before.
          const after = Option.fromUndefinedOr(query.cursor).pipe(
            Option.map(decodeAssetId)
          );

          if (Option.isSome(after) && Option.isNone(after.value)) {
            return yield* new HttpApiError.BadRequest();
          }

          const page = yield* library
            .listMedia(actor, {
              after: Option.flatten(after),
              limit: query.limit ?? defaultMediaPageSize,
            })
            .pipe(
              Effect.catchTags({
                MediaStorageFailed: storeUnavailable,
                MissingPermission: forbidden,
              })
            );

          return {
            items: page.items.map(itemView),
            nextCursor: Option.getOrNull(page.next),
          };
        }),
      usage: ({ params }) =>
        Effect.gen(function* usage() {
          const actor = actorOf(yield* CurrentMember);
          const assetId = yield* assetIdOf(params.mediaId);

          return yield* library.mediaUsage(actor, assetId).pipe(
            Effect.catchTags({
              MediaAssetNotFound: notFound,
              MissingPermission: forbidden,
            })
          );
        }),
    });
  })
);
