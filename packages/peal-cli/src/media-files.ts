import { Effect, FileSystem, Option, Path } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import type { Media, MediaContentType, SignedRequest } from "peal-contract";

import { explain } from "#explain.ts";
import { Refused } from "#refused.ts";
import type { signedIn } from "#workspace.ts";

type SignedInClient = Effect.Success<typeof signedIn>["client"];

/** Where a command sends media: the server, as the user, in a workspace. */
export interface MediaDestination {
  readonly client: SignedInClient;
  readonly url: string;
  readonly workspaceId: string;
}

// The types Peal stores, by the extensions files of each carry: the server
// checks the file itself once it is stored.
const contentTypes = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".qt": "video/quicktime",
  ".webp": "image/webp",
} satisfies Readonly<Record<string, MediaContentType>>;

const contentTypeOf = (extension: string): MediaContentType | undefined =>
  Object.entries(contentTypes).find(([known]) => known === extension)?.[1];

/** Whether `--media` names an address to import rather than a file. */
export const isAddress = (source: string): boolean =>
  /^https?:\/\//iu.test(source);

const altOf = (altText: Option.Option<string>) =>
  Option.match(altText, {
    onNone: () => ({}),
    onSome: (text) => ({ altText: text }),
  });

const cannotRead =
  (file: string) =>
  (failure: { readonly message: string }): Refused =>
    new Refused({ reason: `Cannot read ${file} (${failure.message}).` });

// A signed header, whatever its case.
const headerOf = (request: SignedRequest, name: string): string | undefined =>
  Object.entries(request.headers).find(
    ([key]) => key.toLowerCase() === name
  )?.[1];

/**
 * Sends bytes to the media store with a request the server signed: its
 * headers exactly as given, and nothing of the user's sign-in, which is
 * for the API alone. The address is a credential: it is never printed, nor
 * is a failure that could quote it.
 */
const put = (request: SignedRequest, bytes: Uint8Array) =>
  Effect.gen(function* sending() {
    const http = yield* HttpClient.HttpClient;

    const response = yield* http
      .execute(
        HttpClientRequest.put(request.url).pipe(
          HttpClientRequest.setHeaders(request.headers),
          HttpClientRequest.bodyUint8Array(
            bytes,
            headerOf(request, "content-type")
          )
        )
      )
      .pipe(
        Effect.provideService(HttpClient.TracerPropagationEnabled, false),
        Effect.mapError(
          () =>
            new Refused({
              reason:
                "The media store did not answer: nothing was stored. Try again.",
            })
        )
      );

    if (response.status < 200 || response.status >= 300) {
      yield* new Refused({
        reason: `The media store refused the file (HTTP ${String(response.status)}): nothing was stored.`,
      });
    }
  });

/**
 * Uploads a file as media of the workspace, as the web app does: the
 * server signs the requests, the file goes straight to the media store,
 * whole or in parts read one at a time, and the server then checks and
 * probes it. An upload that fails leaves no pending media behind.
 */
export const uploadFile = (
  { client, url, workspaceId }: MediaDestination,
  given: string,
  altText: Option.Option<string>
): Effect.Effect<
  Media,
  ReturnType<ReturnType<typeof explain>> | Refused,
  FileSystem.FileSystem | HttpClient.HttpClient | Path.Path
> =>
  Effect.gen(function* uploading() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const file = path.resolve(given);
    const contentType = contentTypeOf(path.extname(file).toLowerCase());

    if (contentType === undefined) {
      return yield* new Refused({
        reason: `${given} is not a file Peal takes, by its name: it stores JPEG, PNG, GIF and WebP images (.jpg, .jpeg, .png, .gif, .webp), and MP4 and QuickTime videos (.mp4, .mov).`,
      });
    }

    const info = yield* fs.stat(file).pipe(Effect.mapError(cannotRead(given)));
    const byteSize = Number(info.size);

    if (info.type !== "File" || byteSize === 0) {
      return yield* new Refused({
        reason: `${given} is not a file with something in it.`,
      });
    }

    const params = { workspaceId };

    const prepared = yield* client.media
      .create({
        params,
        payload: { ...altOf(altText), byteSize, contentType },
      })
      .pipe(Effect.mapError(explain(url)));

    const mediaParams = { ...params, mediaId: prepared.media.id };

    const send = Effect.gen(function* sendingFile() {
      const handle = yield* fs.open(file, { flag: "r" });

      // Exactly `length` bytes from `offset`: a read may answer fewer.
      const range = (offset: number, length: number) =>
        Effect.gen(function* reading() {
          const bytes = new Uint8Array(length);

          const fill = (filled: number): Effect.Effect<void, Refused> =>
            filled >= length
              ? Effect.void
              : handle
                  .read(bytes.subarray(filled), {
                    position: BigInt(offset + filled),
                  })
                  .pipe(
                    Effect.mapError(cannotRead(given)),
                    Effect.flatMap((read) =>
                      read === 0
                        ? Effect.fail(
                            new Refused({
                              reason: `${given} changed while it was read: upload it again.`,
                            })
                          )
                        : fill(filled + read)
                    )
                  );

          yield* fill(0);

          return bytes;
        });

      if (prepared.upload._tag === "single") {
        yield* put(prepared.upload.request, yield* range(0, byteSize));

        return;
      }

      const { partSize, parts } = prepared.upload;

      for (const part of parts) {
        yield* put(
          part.request,
          yield* range((part.partNumber - 1) * partSize, part.byteSize)
        );
      }
    }).pipe(
      Effect.scoped,
      Effect.catchTag("PlatformError", (failure) =>
        Effect.fail(cannotRead(given)(failure))
      )
    );

    yield* send.pipe(
      Effect.tapError(() =>
        client.media.delete({ params: mediaParams }).pipe(Effect.ignore)
      )
    );

    return yield* client.media
      .complete({ params: mediaParams })
      .pipe(Effect.mapError(explain(url)));
  });

/** Has the server fetch a file from a public address, as media. */
export const importAddress = (
  { client, url, workspaceId }: MediaDestination,
  address: string,
  altText: Option.Option<string>
) =>
  client.media
    .importFromUrl({
      params: { workspaceId },
      payload: { ...altOf(altText), url: address },
    })
    .pipe(Effect.mapError(explain(url)));

/** Why a media that is not ready cannot go in a post. */
export const statusOf = (media: Media): string => {
  switch (media.status._tag) {
    case "ready": {
      return "ready";
    }

    case "uploaded": {
      return `stored, not ready for posts: ${media.status.probe}`;
    }

    case "rejected": {
      return `rejected: ${media.status.reason}`;
    }

    case "pending": {
      return "waiting for its file";
    }

    default: {
      return media.status satisfies never;
    }
  }
};
