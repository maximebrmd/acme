import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Config, DateTime, Effect, Layer, Option, Schema } from "effect";

import {
  acquireS3Client,
  S3StorageConfig,
} from "#shared/infrastructure/s3-store.ts";
import { ErasureLedgerUnavailable } from "#workspace/application/erasure-ledger-unavailable.ts";
import { ErasureLedger } from "#workspace/application/erasure-ledger.ts";
import { ErasureEntrySchema } from "#workspace/domain/erasure-ledger.ts";
import type {
  ErasureEntry,
  ErasureEntryId,
} from "#workspace/domain/erasure-ledger.ts";

// The erasure ledger in the object store: one small JSON object for each
// erasure, `<PEAL_S3_KEY_PREFIX>erasures/<entry id>.json`. Entry ids are
// UUIDv7s, so keys list in the order the erasures were made.
//
// Which bucket: the media bucket unless `PEAL_ERASURE_LEDGER_BUCKET` names
// another on the same store, which the same credentials must reach.
//
// - The media bucket is the default, so a server needs no bucket or
//   credential more than it has. Nothing serves the `erasures/` prefix: the
//   server signs no link to it, and media lives under `media/`.
// - A bucket of its own suits an operator whose media bucket is served
//   publicly (`PEAL_MEDIA_PUBLIC_BASE_URL`): every object of such a bucket
//   can be read by whoever knows its key, and the ledger must not be.
//   Its lifecycle rule (expire after 42 days) can then cover the whole
//   bucket, where a rule beside the media must name the prefix exactly.
// - Never the backups' bucket: the server would need its credentials, and
//   a server that can write there can delete the backups.

const folder = "erasures/";

const JsonEntry = Schema.fromJsonString(ErasureEntrySchema);

const encode = Schema.encodeEffect(JsonEntry);
const decode = Schema.decodeUnknownEffect(JsonEntry);

const unavailable = (cause: unknown) => new ErasureLedgerUnavailable({ cause });

// One call to the store, aborted if the fiber is interrupted.
const request = <A>(run: (signal: AbortSignal) => PromiseLike<A>) =>
  Effect.tryPromise({ catch: unavailable, try: run });

// Entries read or deleted at once.
const concurrency = 8;

/**
 * The erasure ledger on the store `PEAL_S3_*` names, in the bucket
 * `PEAL_ERASURE_LEDGER_BUCKET` names, or the media bucket. A server whose
 * media bucket is public and that names no other is warned when it starts.
 */
export const S3ErasureLedger = Layer.effect(
  ErasureLedger,
  Effect.gen(function* S3ErasureLedger() {
    const settings = yield* S3StorageConfig;

    const own = yield* Config.option(
      Config.NonEmptyString("PEAL_ERASURE_LEDGER_BUCKET")
    );

    const bucket = Option.getOrElse(own, () => settings.bucket);
    const client = yield* acquireS3Client(settings);
    const prefix = `${settings.keyPrefix}${folder}`;

    if (Option.isNone(own) && Option.isSome(settings.publicBaseUrl)) {
      yield* Effect.logWarning(
        "The erasure ledger is kept in the media bucket, which PEAL_MEDIA_PUBLIC_BASE_URL serves publicly: name a private bucket with PEAL_ERASURE_LEDGER_BUCKET"
      );
    }

    const keyOf = (id: ErasureEntryId) => `${prefix}${id}.json`;

    const record = Effect.fn("ErasureLedger.record")(function* record(
      entry: ErasureEntry
    ) {
      const body = yield* encode(entry).pipe(Effect.mapError(unavailable));

      yield* request(
        async (signal) =>
          await client.send(
            new PutObjectCommand({
              Body: body,
              Bucket: bucket,
              ContentType: "application/json",
              Key: keyOf(entry.id),
            }),
            { abortSignal: signal }
          )
      );
    });

    const remove = (key: string) =>
      request(
        async (signal) =>
          await client.send(
            new DeleteObjectCommand({ Bucket: bucket, Key: key }),
            { abortSignal: signal }
          )
      ).pipe(Effect.asVoid);

    // Every key under the prefix, in the store's order: by key, so by time.
    const keys = Effect.fn("ErasureLedger.keys")(function* keys() {
      const found: string[] = [];
      let token: string | undefined;
      let more = true;

      while (more) {
        const continuation = token;

        const page = yield* request(
          async (signal) =>
            await client.send(
              new ListObjectsV2Command({
                Bucket: bucket,
                ContinuationToken: continuation,
                Prefix: prefix,
              }),
              { abortSignal: signal }
            )
        );

        found.push(
          ...(page.Contents ?? []).flatMap(({ Key: key }) =>
            key === undefined ? [] : [key]
          )
        );
        token = page.NextContinuationToken;
        more = page.IsTruncated === true && token !== undefined;
      }

      return found.toSorted();
    });

    const read = Effect.fn("ErasureLedger.read")(function* read(key: string) {
      const text = yield* request(async (signal) => {
        const answer = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
          { abortSignal: signal }
        );

        return (await answer.Body?.transformToString()) ?? "";
      });

      const entry = yield* decode(text).pipe(Effect.mapError(unavailable));

      return { entry, key };
    });

    const stored = keys().pipe(
      Effect.flatMap((found) => Effect.forEach(found, read, { concurrency }))
    );

    const expire = Effect.fn("ErasureLedger.expire")(function* expire(
      cutoff: DateTime.Utc
    ) {
      const expired = (yield* stored).filter(({ entry }) =>
        DateTime.isLessThan(entry.at, cutoff)
      );

      yield* Effect.forEach(expired, ({ key }) => remove(key), {
        concurrency,
        discard: true,
      });

      return expired.length;
    });

    return ErasureLedger.of({
      discard: (id) =>
        remove(keyOf(id)).pipe(Effect.withSpan("ErasureLedger.discard")),
      entries: stored.pipe(
        Effect.map((found) => found.map(({ entry }) => entry)),
        Effect.withSpan("ErasureLedger.entries")
      ),
      expire,
      record,
    });
  })
);
