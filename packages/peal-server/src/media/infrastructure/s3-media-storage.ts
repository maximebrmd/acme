import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListMultipartUploadsCommand,
  ListObjectsV2Command,
  ListPartsCommand,
  PutObjectCommand,
  S3ServiceException,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import type { ListPartsCommandOutput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Ref,
  Schema,
  Stream,
} from "effect";

import { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import { MultipartUploadNotFound } from "#media/application/multipart-upload-not-found.ts";
import { MediaBucket } from "#media/application/ports/media-bucket.ts";
import type {
  BucketFile,
  BucketPage,
  BucketUpload,
  UploadMarker,
} from "#media/application/ports/media-bucket.ts";
import { MediaFolders } from "#media/application/ports/media-folders.ts";
import type { RemovedFolder } from "#media/application/ports/media-folders.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import type {
  FileToStore,
  MultipartUpload,
  PartToSign,
  SignedRequest,
  StoredPart,
  UploadToSign,
} from "#media/application/ports/media-storage.ts";
import { CurrentUploadPolicy } from "#media/application/upload-policy.ts";
import type { MediaContentType } from "#media/domain/media-format.ts";
import { MultipartUploadIdSchema } from "#media/domain/media-status.ts";
import { mediaKeyOf } from "#media/domain/storage-key.ts";
import type { StorageKey } from "#media/domain/storage-key.ts";
import { PartNumberSchema } from "#media/domain/upload-plan.ts";
import type { PartNumber } from "#media/domain/upload-plan.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  acquireS3Client,
  S3StorageConfig,
} from "#shared/infrastructure/s3-store.ts";
import type { S3StorageSettings } from "#shared/infrastructure/s3-store.ts";

import { PartBuffer } from "./part-buffer.ts";

// The store's settings, which the shared kernel reads: the erasure ledger
// keeps its entries in the same store.
export { S3StorageConfig } from "#shared/infrastructure/s3-store.ts";

export type { S3StorageSettings } from "#shared/infrastructure/s3-store.ts";

// The media store, on any S3-compatible API: Cloudflare R2 in production,
// SeaweedFS in development, or the store a self-hoster runs.
//
// It uses the AWS SDK v3 rather than Bun's S3 client: Bun presigns whole
// objects only (S3FilePresignOptions takes a method, an expiry and object
// options such as the content type, but no upload id or part number), and
// exposes no call to start, list, complete or abort a multipart upload. Bun.* is also out of reach of
// the tests, which run on Node. Presigned POST is never used, because R2
// does not support it; presigned PUTs and part URLs work on every store.
//
// Settings, from the environment. Production must name the store; elsewhere
// it defaults to the development stack's SeaweedFS
// (packages/peal-docker/compose.yaml), so the server runs without setup.
//
// | Variable                     | Meaning                                         |
// | ---------------------------- | ----------------------------------------------- |
// | PEAL_S3_ENDPOINT             | the S3 API's URL (required in production)       |
// | PEAL_S3_REGION               | signing region, "auto" by default (R2)          |
// | PEAL_S3_BUCKET               | the bucket (required in production)             |
// | PEAL_S3_ACCESS_KEY_ID        | access key (required in production, redacted)   |
// | PEAL_S3_SECRET_ACCESS_KEY    | secret key (required in production, redacted)   |
// | PEAL_S3_FORCE_PATH_STYLE     | "true" for bucket-in-path URLs (SeaweedFS), the |
// |                              | default outside production                      |
// | PEAL_S3_KEY_PREFIX           | prefix for every key, such as "staging/"        |
// | PEAL_MEDIA_PUBLIC_BASE_URL   | where the bucket is served publicly, if it is   |

// SigV4 presigned URLs last at most a week.
const maxPresignedSeconds = 7 * 24 * 60 * 60;

const presignedSeconds = (expiresIn: Duration.Duration): number =>
  Math.min(
    maxPresignedSeconds,
    Math.max(1, Math.ceil(Duration.toSeconds(expiresIn)))
  );

/**
 * The public URL of an object under `base`, which stands for the bucket's
 * root, as an R2 custom domain does.
 */
export const publicObjectUrl = (base: URL, objectKey: string): string => {
  const root = base.href.endsWith("/") ? base.href : `${base.href}/`;
  const path = objectKey.split("/").map(encodeURIComponent).join("/");

  return new URL(path, root).href;
};

const isS3Error = (cause: unknown, names: ReadonlySet<string>): boolean =>
  cause instanceof S3ServiceException &&
  (names.has(cause.name) ||
    (names.has("NotFound") && cause.$metadata.httpStatusCode === 404));

const noSuchUpload: ReadonlySet<string> = new Set(["NoSuchUpload"]);

const notFound: ReadonlySet<string> = new Set(["NoSuchKey", "NotFound"]);

// What a store answers to a create-only write when the object exists.
const isPreconditionFailed = (cause: unknown): boolean =>
  cause instanceof S3ServiceException &&
  (cause.name === "PreconditionFailed" ||
    cause.$metadata.httpStatusCode === 412);

const StoredPartSchema = Schema.Struct({
  ETag: Schema.NonEmptyString,
  PartNumber: PartNumberSchema,
  Size: Schema.Int,
});

const decodeParts = Schema.decodeUnknownEffect(Schema.Array(StoredPartSchema));

const decodeUploadId = Schema.decodeUnknownEffect(MultipartUploadIdSchema);

const decodeEtag = Schema.decodeUnknownEffect(Schema.NonEmptyString);

const decodePartNumber = Schema.decodeUnknownEffect(PartNumberSchema);

const decodeContentLength = Schema.decodeUnknownEffect(Schema.Int);

// Runs one SDK call, aborted if the fiber is interrupted.
const request = <A>(
  operation: string,
  run: (signal: AbortSignal) => PromiseLike<A>
): Effect.Effect<A, MediaStorageFailed> =>
  Effect.tryPromise({
    catch: (cause) => new MediaStorageFailed({ cause, operation }),
    try: run,
  });

const multipartNotFound =
  (upload: MultipartUpload) =>
  (
    failure: MediaStorageFailed
  ): Effect.Effect<never, MediaStorageFailed | MultipartUploadNotFound> =>
    isS3Error(failure.cause, noSuchUpload)
      ? Effect.fail(new MultipartUploadNotFound({ uploadId: upload.uploadId }))
      : Effect.fail(failure);

const readFailed = (cause: unknown) =>
  new MediaStorageFailed({ cause, operation: "read a file" });

/** Builds the store from settings, closing the client with the layer. */
export const makeS3MediaStorage = Effect.fn("S3MediaStorage.make")(
  function* makeS3MediaStorage(settings: S3StorageSettings) {
    const { bucket, keyPrefix, publicBaseUrl } = settings;
    const client = yield* acquireS3Client(settings);

    const objectKey = (key: StorageKey): string => `${keyPrefix}${key}`;

    const signUpload = Effect.fn("S3MediaStorage.signUpload")(
      function* signUpload(upload: UploadToSign) {
        // Signing content-type and content-length makes the store refuse a
        // body of any other type or size. Signing If-None-Match: * makes the
        // PUT create-only, so the URL cannot replace a file once stored,
        // after completeUpload checked it. The presigner leaves both headers
        // unsigned unless asked. Browsers send them after a CORS preflight:
        // the bucket's CORS rule allows Content-Type and If-None-Match.
        const url = yield* request(
          "sign an upload",
          async () =>
            await getSignedUrl(
              client,
              new PutObjectCommand({
                Bucket: bucket,
                ContentLength: upload.byteSize,
                ContentType: upload.contentType,
                IfNoneMatch: "*",
                Key: objectKey(upload.key),
              }),
              {
                expiresIn: presignedSeconds(upload.expiresIn),
                signableHeaders: new Set(["content-type", "if-none-match"]),
              }
            )
        );

        const signed: SignedRequest = {
          headers: { "content-type": upload.contentType, "if-none-match": "*" },
          method: "PUT",
          url,
        };

        return signed;
      }
    );

    const startMultipartUpload = Effect.fn(
      "S3MediaStorage.startMultipartUpload"
    )(function* startMultipartUpload(
      key: StorageKey,
      contentType: MediaContentType
    ) {
      const started = yield* request(
        "start a multipart upload",
        async (signal) =>
          await client.send(
            new CreateMultipartUploadCommand({
              Bucket: bucket,
              ContentType: contentType,
              Key: objectKey(key),
            }),
            { abortSignal: signal }
          )
      );

      return yield* decodeUploadId(started.UploadId).pipe(
        Effect.mapError(
          (cause) =>
            new MediaStorageFailed({
              cause,
              operation: "start a multipart upload",
            })
        )
      );
    });

    const signUploadPart = Effect.fn("S3MediaStorage.signUploadPart")(
      function* signUploadPart({ expiresIn, part, upload }: PartToSign) {
        const url = yield* request(
          "sign an upload part",
          async () =>
            await getSignedUrl(
              client,
              new UploadPartCommand({
                Bucket: bucket,
                ContentLength: part.byteSize,
                Key: objectKey(upload.key),
                PartNumber: part.partNumber,
                UploadId: upload.uploadId,
              }),
              { expiresIn: presignedSeconds(expiresIn) }
            )
        );

        const signed: SignedRequest = { headers: {}, method: "PUT", url };

        return signed;
      }
    );

    const listPage = (upload: MultipartUpload, marker: string | undefined) =>
      request(
        "list upload parts",
        async (signal): Promise<ListPartsCommandOutput> =>
          await client.send(
            new ListPartsCommand({
              Bucket: bucket,
              Key: objectKey(upload.key),
              PartNumberMarker: marker,
              UploadId: upload.uploadId,
            }),
            { abortSignal: signal }
          )
      );

    const listUploadedParts = Effect.fn("S3MediaStorage.listUploadedParts")(
      function* listUploadedParts(upload: MultipartUpload) {
        const parts: StoredPart[] = [];
        let marker: string | undefined;
        let more = true;

        // Stores list up to 1,000 parts a page, and a plan has at most 10,000.
        while (more) {
          const page = yield* listPage(upload, marker).pipe(
            Effect.catch(multipartNotFound(upload))
          );

          const listed = yield* decodeParts(page.Parts ?? []).pipe(
            Effect.mapError(
              (cause) =>
                new MediaStorageFailed({
                  cause,
                  operation: "list upload parts",
                })
            )
          );

          for (const part of listed) {
            parts.push({
              byteSize: part.Size,
              etag: part.ETag,
              partNumber: part.PartNumber,
            });
          }

          marker = page.NextPartNumberMarker;
          more = page.IsTruncated === true && marker !== undefined;
        }

        // A part sent again replaces the one before. SeaweedFS lists every
        // upload of it all the same, so each part number is kept once: the
        // last listed. Each upload of a part comes from the same URL, which
        // only takes the part's planned size.
        const byNumber = new Map(parts.map((part) => [part.partNumber, part]));

        return [...byNumber.values()].toSorted(
          (left, right) => left.partNumber - right.partNumber
        );
      }
    );

    const completeMultipartUpload = Effect.fn(
      "S3MediaStorage.completeMultipartUpload"
    )(function* completeMultipartUpload(
      upload: MultipartUpload,
      parts: readonly StoredPart[]
    ) {
      yield* request(
        "complete a multipart upload",
        async (signal) =>
          await client.send(
            new CompleteMultipartUploadCommand({
              Bucket: bucket,
              Key: objectKey(upload.key),
              MultipartUpload: {
                Parts: parts.map((part) => ({
                  ETag: part.etag,
                  PartNumber: part.partNumber,
                })),
              },
              UploadId: upload.uploadId,
            }),
            { abortSignal: signal }
          )
      ).pipe(Effect.catch(multipartNotFound(upload)));
    });

    const abortMultipartUpload = Effect.fn(
      "S3MediaStorage.abortMultipartUpload"
    )(function* abortMultipartUpload(upload: MultipartUpload) {
      yield* request(
        "abort a multipart upload",
        async (signal) =>
          await client.send(
            new AbortMultipartUploadCommand({
              Bucket: bucket,
              Key: objectKey(upload.key),
              UploadId: upload.uploadId,
            }),
            { abortSignal: signal }
          )
      ).pipe(
        Effect.catchIf(
          (failure) => isS3Error(failure.cause, noSuchUpload),
          () => Effect.void
        )
      );
    });

    const head = Effect.fn("S3MediaStorage.head")(function* head(
      key: StorageKey
    ) {
      const found = yield* request(
        "read a file's size and type",
        async (signal) =>
          await client.send(
            new HeadObjectCommand({ Bucket: bucket, Key: objectKey(key) }),
            { abortSignal: signal }
          )
      ).pipe(
        Effect.map(Option.some),
        Effect.catchIf(
          (failure) => isS3Error(failure.cause, notFound),
          () => Effect.succeed(Option.none())
        )
      );

      if (Option.isNone(found)) {
        return Option.none();
      }

      const byteSize = yield* decodeContentLength(
        found.value.ContentLength
      ).pipe(
        Effect.mapError(
          (cause) =>
            new MediaStorageFailed({
              cause,
              operation: "read a file's size and type",
            })
        )
      );

      return Option.some({
        byteSize,
        contentType: Option.fromUndefinedOr(found.value.ContentType),
      });
    });

    const downloadUrl = (key: StorageKey, expiresIn: Duration.Duration) =>
      request(
        "sign a download",
        async () =>
          await getSignedUrl(
            client,
            new GetObjectCommand({ Bucket: bucket, Key: objectKey(key) }),
            { expiresIn: presignedSeconds(expiresIn) }
          )
      ).pipe(Effect.withSpan("S3MediaStorage.downloadUrl"));

    const publicUrl = Effect.fn("S3MediaStorage.publicUrl")(function* publicUrl(
      key: StorageKey,
      expiresIn: Duration.Duration
    ) {
      if (Option.isSome(publicBaseUrl)) {
        return publicObjectUrl(publicBaseUrl.value, objectKey(key));
      }

      return yield* downloadUrl(key, expiresIn);
    });

    // The body streams once the answer's headers arrive, so the request is
    // not tied to an abort signal that would end with the call.
    const read = (key: StorageKey) =>
      Stream.unwrap(
        request(
          "read a file",
          async () =>
            await client.send(
              new GetObjectCommand({ Bucket: bucket, Key: objectKey(key) })
            )
        ).pipe(
          Effect.flatMap(({ Body: body }) =>
            body === undefined
              ? Effect.fail(readFailed("The store sent no body"))
              : Effect.succeed(
                  Stream.fromReadableStream({
                    evaluate: () => body.transformToWebStream(),
                    onError: readFailed,
                  })
                )
          )
        )
      );

    const remove = Effect.fn("S3MediaStorage.remove")(function* remove(
      key: StorageKey
    ) {
      yield* request(
        "delete a file",
        async (signal) =>
          await client.send(
            new DeleteObjectCommand({ Bucket: bucket, Key: objectKey(key) }),
            { abortSignal: signal }
          )
      );
    });

    // Sends one part of a file the server stores itself.
    const putPart = Effect.fn("S3MediaStorage.putPart")(function* putPart(
      upload: MultipartUpload,
      partNumber: PartNumber,
      body: Uint8Array<ArrayBuffer>
    ) {
      const sent = yield* request(
        "store a file part",
        async (signal) =>
          await client.send(
            new UploadPartCommand({
              Body: body,
              Bucket: bucket,
              ContentLength: body.byteLength,
              Key: objectKey(upload.key),
              PartNumber: partNumber,
              UploadId: upload.uploadId,
            }),
            { abortSignal: signal }
          )
      );

      const etag = yield* decodeEtag(sent.ETag).pipe(
        Effect.mapError(
          (cause) =>
            new MediaStorageFailed({ cause, operation: "store a file part" })
        )
      );

      const part: StoredPart = { byteSize: body.byteLength, etag, partNumber };

      return part;
    });

    const store = <E>({ bytes, contentType, key }: FileToStore<E>) =>
      Effect.gen(function* storing() {
        const { partSize } = yield* CurrentUploadPolicy;
        const buffer = new PartBuffer(partSize);
        const upload = yield* Ref.make(Option.none<MultipartUpload>());
        const parts = yield* Ref.make<readonly StoredPart[]>([]);

        // The multipart upload, started with the first part to go.
        const opened = Ref.get(upload).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () =>
                startMultipartUpload(key, contentType).pipe(
                  Effect.map((uploadId): MultipartUpload => ({
                    key,
                    uploadId,
                  })),
                  Effect.tap((started) => Ref.set(upload, Option.some(started)))
                ),
              onSome: (started) => Effect.succeed(started),
            })
          )
        );

        const sendPart = Effect.fn("S3MediaStorage.sendPart")(
          function* sendPart(body: Uint8Array<ArrayBuffer>) {
            const sent = (yield* Ref.get(parts)).length;

            const partNumber = yield* decodePartNumber(sent + 1).pipe(
              Effect.mapError(
                (cause) =>
                  new MediaStorageFailed({
                    cause,
                    operation: "store a file part",
                  })
              )
            );

            const part = yield* putPart(yield* opened, partNumber, body);

            yield* Ref.update(parts, (all) => [...all, part]);
          }
        );

        const stored = Effect.gen(function* sending() {
          yield* Stream.runForEachArray(bytes, (chunks) =>
            Effect.gen(function* buffering() {
              for (const chunk of chunks) {
                buffer.push(chunk);
              }

              while (buffer.hasPart) {
                yield* sendPart(buffer.takePart());
              }
            })
          );

          const started = yield* Ref.get(upload);

          // Smaller than a part: one request stores it.
          if (Option.isNone(started)) {
            const body = buffer.takeRest();

            yield* request(
              "store a file",
              async (signal) =>
                await client.send(
                  new PutObjectCommand({
                    Body: body,
                    Bucket: bucket,
                    ContentLength: body.byteLength,
                    ContentType: contentType,
                    Key: objectKey(key),
                  }),
                  { abortSignal: signal }
                )
            );

            return body.byteLength;
          }

          if (buffer.size > 0) {
            yield* sendPart(buffer.takeRest());
          }

          const sent = yield* Ref.get(parts);

          yield* completeMultipartUpload(started.value, sent).pipe(
            Effect.catchTag("MultipartUploadNotFound", (cause) =>
              Effect.fail(
                new MediaStorageFailed({ cause, operation: "store a file" })
              )
            )
          );

          return sent.reduce((total, part) => total + part.byteSize, 0);
        });

        // Nothing stays of a file that did not arrive whole: neither the
        // parts sent so far, nor a file stored before something else failed.
        const discard = Ref.get(upload).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.void,
              onSome: (started) => abortMultipartUpload(started),
            })
          ),
          Effect.andThen(remove(key)),
          Effect.ignore
        );

        return yield* stored.pipe(Effect.onError(() => discard));
      }).pipe(Effect.withSpan("S3MediaStorage.store"));

    return MediaStorage.of({
      abortMultipartUpload,
      completeMultipartUpload,
      downloadUrl,
      head,
      listUploadedParts,
      publicUrl,
      read,
      remove,
      signUpload,
      signUploadPart,
      startMultipartUpload,
      store,
    });
  }
);

/** The media store, configured from the environment. */
export const S3MediaStorageLive = Layer.effect(
  MediaStorage,
  S3StorageConfig.pipe(Effect.flatMap(makeS3MediaStorage))
);

// Objects and uploads are deleted a few at a time: a workspace's folder can
// hold thousands of files, and stores rate-limit bursts.
const removals = 8;

/**
 * The store's workspace folders, from settings. Objects are listed and
 * deleted one by one rather than with DeleteObjects, which needs a checksum
 * some S3-compatible stores compute differently.
 */
export const makeS3MediaFolders = Effect.fn("S3MediaFolders.make")(
  function* makeS3MediaFolders(settings: S3StorageSettings) {
    const { bucket, keyPrefix } = settings;
    const client = yield* acquireS3Client(settings);

    const deleteObject = (key: string) =>
      request(
        "delete a file",
        async (signal) =>
          await client.send(
            new DeleteObjectCommand({ Bucket: bucket, Key: key }),
            {
              abortSignal: signal,
            }
          )
      );

    const abortUpload = (key: string, uploadId: string) =>
      request(
        "abort a multipart upload",
        async (signal) =>
          await client.send(
            new AbortMultipartUploadCommand({
              Bucket: bucket,
              Key: key,
              UploadId: uploadId,
            }),
            { abortSignal: signal }
          )
      ).pipe(
        Effect.catchIf(
          (failure) => isS3Error(failure.cause, noSuchUpload),
          () => Effect.void
        )
      );

    // One page of the folder's files, from `token`.
    const listObjects = (prefix: string, token: string | undefined) =>
      request(
        "list a folder",
        async (signal) =>
          await client.send(
            new ListObjectsV2Command({
              Bucket: bucket,
              ContinuationToken: token,
              Prefix: prefix,
            }),
            { abortSignal: signal }
          )
      );

    // One page of the folder's multipart uploads, after the markers.
    const listUploads = (
      prefix: string,
      keyMarker: string | undefined,
      uploadIdMarker: string | undefined
    ) =>
      request(
        "list a folder's uploads",
        async (signal) =>
          await client.send(
            new ListMultipartUploadsCommand({
              Bucket: bucket,
              KeyMarker: keyMarker,
              Prefix: prefix,
              UploadIdMarker: uploadIdMarker,
            }),
            { abortSignal: signal }
          )
      );

    const removeObjects = Effect.fn("S3MediaFolders.removeObjects")(
      function* removeObjects(prefix: string) {
        let token: string | undefined;
        let more = true;
        let files = 0;
        let bytes = 0;

        while (more) {
          const page = yield* listObjects(prefix, token);

          const listed = (page.Contents ?? []).flatMap(
            ({ Key: key, Size: size }) =>
              key === undefined ? [] : [{ byteSize: size ?? 0, key }]
          );

          yield* Effect.forEach(listed, ({ key }) => deleteObject(key), {
            concurrency: removals,
            discard: true,
          });

          files += listed.length;
          bytes += listed.reduce((total, { byteSize }) => total + byteSize, 0);
          token = page.NextContinuationToken;
          more = page.IsTruncated === true && token !== undefined;
        }

        return { bytes, files };
      }
    );

    const abortUploads = Effect.fn("S3MediaFolders.abortUploads")(
      function* abortUploads(prefix: string) {
        let keyMarker: string | undefined;
        let uploadIdMarker: string | undefined;
        let more = true;
        let aborted = 0;

        while (more) {
          const page = yield* listUploads(prefix, keyMarker, uploadIdMarker);

          const uploads = (page.Uploads ?? []).flatMap(
            ({ Key: key, UploadId: uploadId }) =>
              key === undefined || uploadId === undefined
                ? []
                : [{ key, uploadId }]
          );

          yield* Effect.forEach(
            uploads,
            ({ key, uploadId }) => abortUpload(key, uploadId),
            { concurrency: removals, discard: true }
          );

          aborted += uploads.length;
          keyMarker = page.NextKeyMarker;
          uploadIdMarker = page.NextUploadIdMarker;
          more = page.IsTruncated === true && keyMarker !== undefined;
        }

        return aborted;
      }
    );

    const removeWorkspace = Effect.fn("S3MediaFolders.removeWorkspace")(
      function* removeWorkspace(workspaceId: WorkspaceId) {
        const prefix = `${keyPrefix}media/${workspaceId}/`;

        // Uploads first: completing one would add a file to the folder.
        const uploads = yield* abortUploads(prefix);
        const { bytes, files } = yield* removeObjects(prefix);
        const removed: RemovedFolder = { bytes, files, uploads };

        return removed;
      }
    );

    return MediaFolders.of({ removeWorkspace });
  }
);

/** The store's workspace folders, configured from the environment. */
export const S3MediaFoldersLive = Layer.effect(
  MediaFolders,
  S3StorageConfig.pipe(Effect.flatMap(makeS3MediaFolders))
);

const ListedFileSchema = Schema.Struct({
  Key: Schema.String,
  LastModified: Schema.Date,
  Size: Schema.Int,
});

const ListedUploadSchema = Schema.Struct({
  Initiated: Schema.Date,
  Key: Schema.String,
  UploadId: MultipartUploadIdSchema,
});

const listingFailed = (operation: string) => (cause: unknown) =>
  new MediaStorageFailed({ cause, operation });

const decodeFiles = Schema.decodeUnknownEffect(Schema.Array(ListedFileSchema));

const decodeUploads = Schema.decodeUnknownEffect(
  Schema.Array(ListedUploadSchema)
);

/**
 * The bucket's media folder, `<prefix>media/`, from settings, for the
 * sweeps. Every listing names that folder as its prefix, so nothing else
 * of the bucket is listed, and hands out only the keys Peal writes
 * (`mediaKeyOf`), relative to the store's prefix as every other call
 * takes them.
 */
export const makeS3MediaBucket = Effect.fn("S3MediaBucket.make")(
  function* makeS3MediaBucket(
    settings: S3StorageSettings,
    // Keys a page at most; the store's own (1,000 on most) when unset.
    pageSize?: number
  ) {
    const { bucket, keyPrefix } = settings;
    const client = yield* acquireS3Client(settings);
    const folder = `${keyPrefix}media/`;
    // Never a key `mediaKeyOf` reads, so no listing hands it out.
    const marker = `${folder}.owner`;

    // The key relative to the store's prefix, if it is one Peal writes.
    const ownKey = (objectKey: string) =>
      objectKey.startsWith(folder)
        ? mediaKeyOf(objectKey.slice(keyPrefix.length))
        : Option.none();

    const listFiles = Effect.fn("S3MediaBucket.listFiles")(function* listFiles(
      after: Option.Option<string>
    ) {
      const page = yield* request(
        "list the media folder",
        async (signal) =>
          await client.send(
            new ListObjectsV2Command({
              Bucket: bucket,
              MaxKeys: pageSize,
              Prefix: folder,
              StartAfter: after.pipe(
                Option.map((key) => `${keyPrefix}${key}`),
                Option.getOrUndefined
              ),
            }),
            { abortSignal: signal }
          )
      );

      const listed = yield* decodeFiles(page.Contents ?? []).pipe(
        Effect.mapError(listingFailed("list the media folder"))
      );

      const items = listed.flatMap(({ Key, LastModified, Size }) =>
        Option.match(ownKey(Key), {
          onNone: () => [],
          onSome: (key): readonly BucketFile[] => [
            {
              byteSize: Size,
              key,
              modifiedAt: DateTime.fromDateUnsafe(LastModified),
            },
          ],
        })
      );

      const last = listed.at(-1);

      const result: BucketPage<BucketFile, string> = {
        items,
        next:
          page.IsTruncated === true && last !== undefined
            ? Option.some(last.Key.slice(keyPrefix.length))
            : Option.none(),
      };

      return result;
    });

    const listUploads = Effect.fn("S3MediaBucket.listUploads")(
      function* listUploads(after: Option.Option<UploadMarker>) {
        const page = yield* request(
          "list the media folder's uploads",
          async (signal) =>
            await client.send(
              new ListMultipartUploadsCommand({
                Bucket: bucket,
                KeyMarker: after.pipe(
                  Option.map(({ key }) => `${keyPrefix}${key}`),
                  Option.getOrUndefined
                ),
                MaxUploads: pageSize,
                Prefix: folder,
                UploadIdMarker: after.pipe(
                  Option.flatMap(({ uploadId }) => uploadId),
                  Option.getOrUndefined
                ),
              }),
              { abortSignal: signal }
            )
        );

        const listed = yield* decodeUploads(page.Uploads ?? []).pipe(
          Effect.mapError(listingFailed("list the media folder's uploads"))
        );

        const items = listed.flatMap(({ Initiated, Key, UploadId }) =>
          Option.match(ownKey(Key), {
            onNone: () => [],
            onSome: (key): readonly BucketUpload[] => [
              {
                key,
                startedAt: DateTime.fromDateUnsafe(Initiated),
                uploadId: UploadId,
              },
            ],
          })
        );

        const last = listed.at(-1);

        const result: BucketPage<BucketUpload, UploadMarker> = {
          items,
          next:
            page.IsTruncated === true && last !== undefined
              ? Option.some({
                  key: last.Key.slice(keyPrefix.length),
                  uploadId: Option.some(last.UploadId),
                })
              : Option.none(),
        };

        return result;
      }
    );

    const owner = request("read the media folder's owner", async (signal) => {
      const answer = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: marker }),
        { abortSignal: signal }
      );

      return (await answer.Body?.transformToString()) ?? "";
    }).pipe(
      Effect.map((text) => Option.some(text.trim())),
      Effect.catchIf(
        (failure) => isS3Error(failure.cause, notFound),
        () => Effect.succeed(Option.none<string>())
      ),
      Effect.withSpan("S3MediaBucket.owner")
    );

    const claim = (id: string, { replace }: { readonly replace: boolean }) =>
      request(
        "write the media folder's owner",
        async (signal) =>
          await client.send(
            new PutObjectCommand({
              Body: id,
              Bucket: bucket,
              ContentType: "text/plain",
              IfNoneMatch: replace ? undefined : "*",
              Key: marker,
            }),
            { abortSignal: signal }
          )
      ).pipe(
        Effect.as(true),
        Effect.catchIf(
          (failure) => isPreconditionFailed(failure.cause),
          () => Effect.succeed(false)
        ),
        Effect.withSpan("S3MediaBucket.claim")
      );

    return MediaBucket.of({ claim, listFiles, listUploads, owner });
  }
);

/** The bucket's media folder, configured from the environment. */
export const S3MediaBucketLive = Layer.effect(
  MediaBucket,
  S3StorageConfig.pipe(Effect.flatMap(makeS3MediaBucket))
);
