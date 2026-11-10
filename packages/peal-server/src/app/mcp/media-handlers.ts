import { Effect, Option, Schema } from "effect";
import { CurrentMember, defaultMediaPageSize } from "peal-contract";

import { MediaTools } from "#app/mcp/media-tools.ts";
import { notAllowed, planRefusal, refuse } from "#app/mcp/refusals.ts";
import { itemView } from "#media/api/media-view.ts";
import { MediaLibrary } from "#media/application/media-library.ts";
import type { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { actorOf } from "#shared/api/actor.ts";

const decodeAssetId = Schema.decodeUnknownOption(MediaAssetIdSchema);

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

/** What the media tools do, through the media context's use cases. */
export const MediaToolsLive = MediaTools.toLayer(
  Effect.gen(function* mediaTools() {
    const library = yield* MediaLibrary;
    const refusedByPlan = yield* planRefusal;

    const actor = CurrentMember.pipe(Effect.map(actorOf));

    return MediaTools.of({
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
