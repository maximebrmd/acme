import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { ConfigProvider, Effect, Layer, Option } from "effect";
import { MessageStorage, ShardingConfig } from "effect/cluster";
import { Dns } from "effect/net";

import { MediaLive } from "#media/container.ts";
import { MediaInPostsLive } from "#publishing/container.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { UnmeteredTest } from "#test/billing/support.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";

// The development stack's SeaweedFS (packages/peal-docker/compose.yaml),
// which CI starts too. The environment wins over these defaults, so another
// store can be named with the same variables the server reads. Every key
// goes under tests/media/, apart from what the server and other suites write.
export const storageSettings = ConfigProvider.layerAdd(
  ConfigProvider.fromUnknown({
    PEAL_S3_ACCESS_KEY_ID: "peal",
    PEAL_S3_BUCKET: "peal-media",
    PEAL_S3_ENDPOINT: "http://127.0.0.1:18333",
    PEAL_S3_FORCE_PATH_STYLE: "true",
    PEAL_S3_KEY_PREFIX: "tests/media/",
    PEAL_S3_SECRET_ACCESS_KEY: "peal-development-secret",
  })
);

/**
 * Postgres from DATABASE_URL, brought up to date, and random ids, so runs
 * and parallel suites never collide.
 */
export const DatabaseTest = Layer.mergeAll(MigrationsLive, IdsLive).pipe(
  Layer.provideMerge(DatabaseLive)
);

/** Transactions as the server runs them, over an in-memory message store. */
export const TransactionsTest = TransactionRunnerLive.pipe(
  Layer.provide(
    MessageStorage.layerMemory.pipe(Layer.provide(ShardingConfig.layer()))
  )
);

/** Webhooks nobody listens on: for tests that need none. */
export const NoWebhooks = Layer.succeed(
  WebhookEvents,
  WebhookEvents.of({ publish: () => Effect.void })
);

/**
 * Which posts show media, as the publishing context tells, on the database
 * the test gives, in transactions of its own: no job starts in them.
 */
export const MediaInPostsTest = MediaInPostsLive.pipe(
  Layer.provide(TransactionRunnerLive),
  Layer.provide(
    MessageStorage.layerMemory.pipe(Layer.provide(ShardingConfig.layer()))
  )
);

/**
 * The media context as the server builds it, with MediaInPostsTest, on a
 * server that does not bill, or with the entitlements given, telling
 * `webhooks` how uploads end.
 */
export const mediaTestWith = <E = never, R = never>(
  entitlements: typeof UnmeteredTest,
  webhooks: Layer.Layer<WebhookEvents, E, R> = NoWebhooks
) =>
  MediaLive.pipe(
    Layer.provide(
      Layer.mergeAll(
        MediaInPostsTest,
        entitlements,
        webhooks,
        TransactionsTest,
        // No name resolves: the guard refuses every address a test could
        // name, loopback ones included. Tests that import files bring the
        // context a RemoteMedia of their own (`mediaWith`).
        Dns.layerStatic({})
      )
    )
  );

/** The media context on a server that does not bill: no storage limit. */
export const MediaTestLive = mediaTestWith(UnmeteredTest);

const mebibyte = 1024 * 1024;

/** `size` bytes of a repeating pattern, so a misplaced part shows. */
export const syntheticBytes = (size: number): Uint8Array<ArrayBuffer> =>
  Uint8Array.from({ length: size }, (_, index) => index % 251);

export const mebibytes = (count: number): number => count * mebibyte;

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** `size` bytes that start like a PNG and go on as nothing a PNG holds. */
export const damagedPng = (size: number): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(
    syntheticBytes(size),
    (byte, index) => pngSignature[index] ?? byte
  );

/** An SVG of 4000×3000, which image decoders read but peal does not take. */
export const syntheticSvg = (): Uint8Array<ArrayBuffer> =>
  new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="3000"/>'
  );

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

const syntheticUser = UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

const mediaPermissions: readonly Permission[] = [
  "media:read",
  "media:upload",
  "media:delete",
];

/** Someone signed in, acting in the workspace with these permissions. */
export const memberIn = (
  workspaceId: WorkspaceId,
  permissions: readonly Permission[] = mediaPermissions
): Actor =>
  new Actor({
    permissions,
    subject: {
      _tag: "user",
      impersonatedBy: Option.none(),
      userId: syntheticUser,
    },
    workspaceId,
  });

// CI runners may lack FFmpeg; the parsing tests below cover its output.
export const hasFfmpeg =
  spawnSync("ffmpeg", ["-version"]).status === 0 &&
  spawnSync("ffprobe", ["-version"]).status === 0;

// A one-second 320×240 test pattern, encoded with FFmpeg's own MPEG-4 encoder,
// which every build has.
export const syntheticVideo = (): Uint8Array<ArrayBuffer> => {
  const folder = mkdtempSync(path.join(os.tmpdir(), "peal-probe-"));
  const file = path.join(folder, "pattern.mp4");

  try {
    execFileSync(
      "ffmpeg",
      [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=320x240:rate=25",
        "-t",
        "1",
        "-c:v",
        "mpeg4",
        file,
      ],
      { stdio: "ignore" }
    );

    return new Uint8Array(readFileSync(file));
  } finally {
    rmSync(folder, { force: true, recursive: true });
  }
};
