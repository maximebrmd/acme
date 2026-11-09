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
  S3Client,
  S3ServiceException,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import type { ListPartsCommandOutput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  Config,
  Duration,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
  Stream,
} from "effect";

import { MediaStorageFailed } from "#media/application/media-storage-failed.ts";
import { MultipartUploadNotFound } from "#media/application/multipart-upload-not-found.ts";
import { MediaFolders } from "#media/application/ports/media-folders.ts";
import { MediaStorage } from "#media/application/ports/media-storage.ts";
import type {
  MultipartUpload,
  PartToSign,
  SignedRequest,
  StoredPart,
  UploadToSign,
} from "#media/application/ports/media-storage.ts";
import type { MediaContentType } from "#media/domain/media-format.ts";
import { MultipartUploadIdSchema } from "#media/domain/media-status.ts";
import type { StorageKey } from "#media/domain/storage-key.ts";
import { PartNumberSchema } from "#media/domain/upload-plan.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  isProduction,
  requiredInProduction,
} from "#shared/infrastructure/environment.ts";

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

/** Segments of letters, digits, `.`, `-` or `_`, each ending with `/`. */
const KeyPrefixSchema = Schema.String.check(
  Schema.isPattern(/^(?:[\w.-]+\/)*$/u)
);

export const S3StorageConfig = Config.all({
  accessKeyId: requiredInProduction(
    Config.Redacted("PEAL_S3_ACCESS_KEY_ID"),
    Redacted.make("peal")
  ),
  bucket: requiredInProduction(
    Config.NonEmptyString("PEAL_S3_BUCKET"),
    "peal-media"
  ),
  endpoint: requiredInProduction(
    Config.URL("PEAL_S3_ENDPOINT"),
    new URL("http://127.0.0.1:18333")
  ),
  forcePathStyle: isProduction.pipe(
    Config.flatMap((production) =>
      Config.Boolean("PEAL_S3_FORCE_PATH_STYLE").pipe(
        Config.withDefault(!production)
      )
    )
  ),
  keyPrefix: Config.schema(KeyPrefixSchema, "PEAL_S3_KEY_PREFIX").pipe(
    Config.withDefault("")
  ),
  publicBaseUrl: Config.option(Config.URL("PEAL_MEDIA_PUBLIC_BASE_URL")),
  region: Config.NonEmptyString("PEAL_S3_REGION").pipe(
    Config.withDefault("auto")
  ),
  secretAccessKey: requiredInProduction(
    Config.Redacted("PEAL_S3_SECRET_ACCESS_KEY"),
    Redacted.make("peal-development-secret")
  ),
});

export type S3StorageSettings = Config.Success<typeof S3StorageConfig>;

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

const StoredPartSchema = Schema.Struct({
  ETag: Schema.NonEmptyString,
  PartNumber: PartNumberSchema,
  Size: Schema.Int,
});

const decodeParts = Schema.decodeUnknownEffect(Schema.Array(StoredPartSchema));

const decodeUploadId = Schema.decodeUnknownEffect(MultipartUploadIdSchema);

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

// An SDK client for the store, destroyed when the scope closes.
const acquireClient = (settings: S3StorageSettings) =>
  Effect.acquireRelease(
    Effect.sync(
      () =>
        new S3Client({
          credentials: {
            accessKeyId: Redacted.value(settings.accessKeyId),
            secretAccessKey: Redacted.value(settings.secretAccessKey),
          },
          endpoint: settings.endpoint.href,
          forcePathStyle: settings.forcePathStyle,
          region: settings.region,
          // By default the SDK adds a CRC32 checksum to uploads. In a
          // presigned URL it is the checksum of an empty body, so the store
          // refuses the real one (SeaweedFS answers BadDigest): keep to the
          // checksums an operation requires.
          requestChecksumCalculation: "WHEN_REQUIRED",
          responseChecksumValidation: "WHEN_REQUIRED",
        })
    ),
    (opened) =>
      Effect.sync(() => {
        opened.destroy();
      })
  );

/** Builds the store from settings, closing the client with the layer. */
export const makeS3MediaStorage = Effect.fn("S3MediaStorage.make")(
  function* makeS3MediaStorage(settings: S3StorageSettings) {
    const { bucket, keyPrefix, publicBaseUrl } = settings;
    const client = yield* acquireClient(settings);

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

    const publicUrl = Effect.fn("S3MediaStorage.publicUrl")(function* publicUrl(
      key: StorageKey,
      expiresIn: Duration.Duration
    ) {
      if (Option.isSome(publicBaseUrl)) {
        return publicObjectUrl(publicBaseUrl.value, objectKey(key));
      }

      return yield* request(
        "sign a download",
        async () =>
          await getSignedUrl(
            client,
            new GetObjectCommand({ Bucket: bucket, Key: objectKey(key) }),
            { expiresIn: presignedSeconds(expiresIn) }
          )
      );
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

    return MediaStorage.of({
      abortMultipartUpload,
      completeMultipartUpload,
      head,
      listUploadedParts,
      publicUrl,
      read,
      remove,
      signUpload,
      signUploadPart,
      startMultipartUpload,
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
    const client = yield* acquireClient(settings);

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

        while (more) {
          const page = yield* listObjects(prefix, token);

          const keys = (page.Contents ?? []).flatMap(({ Key: key }) =>
            key === undefined ? [] : [key]
          );

          yield* Effect.forEach(keys, deleteObject, {
            concurrency: removals,
            discard: true,
          });

          token = page.NextContinuationToken;
          more = page.IsTruncated === true && token !== undefined;
        }
      }
    );

    const abortUploads = Effect.fn("S3MediaFolders.abortUploads")(
      function* abortUploads(prefix: string) {
        let keyMarker: string | undefined;
        let uploadIdMarker: string | undefined;
        let more = true;

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

          keyMarker = page.NextKeyMarker;
          uploadIdMarker = page.NextUploadIdMarker;
          more = page.IsTruncated === true && keyMarker !== undefined;
        }
      }
    );

    const removeWorkspace = Effect.fn("S3MediaFolders.removeWorkspace")(
      function* removeWorkspace(workspaceId: WorkspaceId) {
        const prefix = `${keyPrefix}media/${workspaceId}/`;

        // Uploads first: completing one would add a file to the folder.
        yield* abortUploads(prefix);
        yield* removeObjects(prefix);
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
