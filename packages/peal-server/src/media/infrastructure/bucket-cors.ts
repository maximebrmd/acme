import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import type { CORSRule } from "@aws-sdk/client-s3";
import { Effect, Redacted } from "effect";

import { MediaStorageFailed } from "#media/application/media-storage-failed.ts";

import type { S3StorageSettings } from "./s3-media-storage.ts";

// Browsers send files straight to the bucket (see s3-media-storage.ts), so
// the bucket must answer their CORS preflight. Platforms and pages read
// media with plain GETs (<img>, <video>, server fetches), which need none.

/** The id of the rule Acme manages, so other rules are left alone. */
export const uploadRuleId = "acme-browser-uploads";

/**
 * What a browser upload sends: a PUT with the signed Content-Type and
 * If-None-Match of a single upload, or a bare PUT for a part. A preflight
 * is cached for an hour.
 */
export const uploadRule = (origins: readonly string[]): CORSRule => ({
  AllowedHeaders: ["content-type", "if-none-match"],
  AllowedMethods: ["PUT"],
  AllowedOrigins: [...new Set(origins)].toSorted(),
  ID: uploadRuleId,
  MaxAgeSeconds: 3600,
});

// A list of a rule as stores compare it: without case or order.
const listOf = (values: readonly string[] | undefined): string =>
  [...(values ?? [])]
    .map((value) => value.toLowerCase())
    .toSorted()
    .join(" ");

const sameRule = (left: CORSRule, right: CORSRule): boolean =>
  left.ID === right.ID &&
  left.MaxAgeSeconds === right.MaxAgeSeconds &&
  listOf(left.AllowedOrigins) === listOf(right.AllowedOrigins) &&
  listOf(left.AllowedMethods) === listOf(right.AllowedMethods) &&
  listOf(left.AllowedHeaders) === listOf(right.AllowedHeaders) &&
  listOf(left.ExposeHeaders) === listOf(right.ExposeHeaders);

/** A bucket's rules once Acme's is in place, and whether it changed. */
export interface UploadRuleChange {
  readonly changed: boolean;
  readonly rules: readonly CORSRule[];
}

/**
 * The bucket's rules with Acme's in place of any earlier version of it, and
 * whether that changes anything. Rules with another id stay as they are.
 */
export const withUploadRule = (
  existing: readonly CORSRule[],
  rule: CORSRule
): UploadRuleChange => {
  const others = existing.filter((current) => current.ID !== rule.ID);
  const current = existing.filter((candidate) => candidate.ID === rule.ID);

  const changed =
    current.length !== 1 || current.every((found) => !sameRule(found, rule));

  return { changed, rules: [...others, rule] };
};

/**
 * The same rule as Cloudflare R2's dashboard takes it (R2 › the bucket ›
 * Settings › CORS policy), which has no ids.
 */
export const r2Policy = (rule: CORSRule) => [
  {
    AllowedHeaders: rule.AllowedHeaders,
    AllowedMethods: rule.AllowedMethods,
    AllowedOrigins: rule.AllowedOrigins,
    MaxAgeSeconds: rule.MaxAgeSeconds,
  },
];

const noConfiguration = (cause: unknown): boolean =>
  cause instanceof S3ServiceException &&
  cause.name === "NoSuchCORSConfiguration";

const failed = (operation: string) => (cause: unknown) =>
  new MediaStorageFailed({ cause, operation });

/**
 * Puts Acme's upload rule on the bucket, keeping its other rules, unless the
 * bucket has it already. Only the bucket's CORS configuration changes,
 * never its objects. Answers whether it changed it, and the rules it holds.
 */
export const applyUploadRule = Effect.fn("BucketCors.applyUploadRule")(
  function* applyUploadRule(settings: S3StorageSettings, rule: CORSRule) {
    const client = yield* Effect.acquireRelease(
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
          })
      ),
      (opened) =>
        Effect.sync(() => {
          opened.destroy();
        })
    );

    const { bucket } = settings;

    const existing = yield* Effect.tryPromise({
      catch: (cause) => cause,
      try: async (signal) =>
        await client.send(new GetBucketCorsCommand({ Bucket: bucket }), {
          abortSignal: signal,
        }),
    }).pipe(
      Effect.map((found) => found.CORSRules ?? []),
      Effect.catchIf(noConfiguration, () => Effect.succeed([])),
      Effect.mapError(failed("read the bucket's CORS rules"))
    );

    const { changed, rules } = withUploadRule(existing, rule);

    if (changed) {
      yield* Effect.tryPromise({
        catch: failed("write the bucket's CORS rules"),
        try: async (signal) =>
          await client.send(
            new PutBucketCorsCommand({
              Bucket: bucket,
              CORSConfiguration: { CORSRules: [...rules] },
            }),
            { abortSignal: signal }
          ),
      });
    }

    return { changed, rules };
  }
);
