import { BunRuntime } from "@effect/platform-bun";
import { Config, Console, Effect, Layer, Option, Redacted } from "effect";

import {
  claimMediaFolder,
  mediaFolderClaim,
} from "#media/application/claim-media-folder.ts";
import { ClaimNotConfirmed } from "#media/application/claim-not-confirmed.ts";
import type { OwnerMarker } from "#media/application/ports/media-bucket.ts";
import { MediaFolderClaimLive } from "#media/container.ts";
import { S3StorageConfig } from "#media/infrastructure/s3-media-storage.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";

// Hands the media folder (`<PEAL_S3_KEY_PREFIX>media/`) to the database
// `DATABASE_URL` names: writes its owner marker naming that database, its
// Postgres cluster and timeline and its next epoch, whatever it said, so
// the media sweeps that delete what the database does not know of run
// again. Only for a database meant to be the folder's newest truth: a
// restore confirmed final, a Postgres failover or upgrade, a database
// loaded from a dump, or a marker lost (the sweeps refuse `restored`,
// `rewound`, `foreign` or `unmarked`). It applies pending migrations
// first, prints the database, the bucket, the prefix and the marker there
// now, and writes only with `--yes`.
//
//   bun src/claim-media-folder.ts [--yes]
const confirmed = process.argv.includes("--yes");

const describe = (marker: OwnerMarker) =>
  `database ${marker.id}, epoch ${marker.epoch}, Postgres system ${marker.system}, timeline ${marker.timeline}`;

// The database's host and name, never its credentials.
const databaseOf = Config.Redacted("DATABASE_URL").pipe(
  Config.map((url) => {
    const parsed = URL.parse(Redacted.value(url));

    return parsed === null
      ? "an address that does not read"
      : `${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
  })
);

const program = Effect.gen(function* claim() {
  const { bucket, endpoint, keyPrefix } = yield* S3StorageConfig;
  const database = yield* databaseOf;
  const { cluster, current, self } = yield* mediaFolderClaim;

  yield* Console.log(
    [
      `Database:     ${database}`,
      `Media folder: ${keyPrefix}media/ in bucket ${bucket} at ${endpoint.origin}`,
      `Marker now:   ${Option.match(current, {
        onNone: () => "none",
        onSome: ({ marker }) =>
          Option.match(marker, {
            onNone: () => "one that does not read",
            onSome: describe,
          }),
      })}`,
      `Would write:  database ${self.id}, the next epoch after ${self.epoch}, Postgres system ${cluster.system}, timeline ${cluster.timeline}`,
    ].join("\n")
  );

  if (!confirmed) {
    yield* Console.log("Nothing written. Run again with --yes to write it.");

    return yield* new ClaimNotConfirmed();
  }

  const written = yield* claimMediaFolder;

  return yield* Console.log(`Written: ${describe(written)}.`);
});

BunRuntime.runMain(
  program.pipe(
    Effect.provide(
      MediaFolderClaimLive.pipe(
        Layer.provideMerge(Layer.mergeAll(MigrationsLive, IdsLive)),
        Layer.provideMerge(DatabaseLive)
      )
    )
  )
);
