import { S3Client } from "@aws-sdk/client-s3";
import { Config, Effect, Redacted, Schema } from "effect";

import { isProduction, requiredInProduction } from "./environment.ts";

// The object store's settings and client, on any S3-compatible API, for
// the adapters that keep things in it: the media context's files
// (`#media/infrastructure/s3-media-storage.ts`, which documents each
// `PEAL_S3_*` setting) and the workspace context's erasure ledger.

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

/** An SDK client for the store, destroyed when the scope closes. */
export const acquireS3Client = (settings: S3StorageSettings) =>
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
