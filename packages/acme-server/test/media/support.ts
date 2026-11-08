import { ConfigProvider, Effect, Layer } from "effect";

import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";

// The development stack's SeaweedFS (packages/acme-docker/compose.yaml),
// which CI starts too. The environment wins over these defaults, so another
// store can be named with the same variables the server reads. Every key
// goes under tests/media/, apart from what the server and other suites write.
export const storageSettings = ConfigProvider.layerAdd(
  ConfigProvider.fromUnknown({
    ACME_S3_ACCESS_KEY_ID: "acme",
    ACME_S3_BUCKET: "acme-media",
    ACME_S3_ENDPOINT: "http://127.0.0.1:18333",
    ACME_S3_FORCE_PATH_STYLE: "true",
    ACME_S3_KEY_PREFIX: "tests/media/",
    ACME_S3_SECRET_ACCESS_KEY: "acme-development-secret",
  })
);

/**
 * Postgres from DATABASE_URL, brought up to date, and random ids, so runs
 * and parallel suites never collide.
 */
export const DatabaseTest = Layer.mergeAll(MigrationsLive, IdsLive).pipe(
  Layer.provideMerge(DatabaseLive)
);

const mebibyte = 1024 * 1024;

/** `size` bytes of a repeating pattern, so a misplaced part shows. */
export const syntheticBytes = (size: number): Uint8Array<ArrayBuffer> =>
  Uint8Array.from({ length: size }, (_, index) => index % 251);

export const mebibytes = (count: number): number => count * mebibyte;

/** Sends a signed request with plain fetch, as a browser would. */
export const sendSigned = (
  request: {
    readonly headers: Readonly<Record<string, string>>;
    readonly url: string;
  },
  body: Uint8Array<ArrayBuffer>
): Effect.Effect<Response> =>
  Effect.promise(
    async () =>
      await fetch(request.url, {
        body,
        headers: request.headers,
        method: "PUT",
      })
  );

/** Reads a URL with plain fetch, as a platform fetching media would. */
export const fetchBytes = (
  url: string
): Effect.Effect<{ readonly bytes: Uint8Array; readonly response: Response }> =>
  Effect.promise(async () => {
    const response = await fetch(url);

    return { bytes: new Uint8Array(await response.arrayBuffer()), response };
  });
