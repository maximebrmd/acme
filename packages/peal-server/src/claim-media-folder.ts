import { BunRuntime } from "@effect/platform-bun";
import { Config, Console, Effect, Layer, Option, Redacted } from "effect";

import {
  claimMediaFolder,
  mediaFolderClaim,
} from "#media/application/claim-media-folder.ts";
import { ClaimNotConfirmed } from "#media/application/claim-not-confirmed.ts";
import { MediaBucket } from "#media/application/ports/media-bucket.ts";
import type { OwnerMarker } from "#media/application/ports/media-bucket.ts";
import { MediaSweepStore } from "#media/application/ports/media-sweep-store.ts";
import type { StoreIdentity } from "#media/application/ports/media-sweep-store.ts";
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
// `rewound`, `foreign` or `unmarked`). It prints the database, the
// bucket, the prefix, the marker there now and what it would write, and
// changes nothing: no migration, no row, no object. With `--yes` it
// applies pending migrations, as the server would, writes the marker,
// and fails unless the store then holds it.
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

  // Read only. A database not migrated yet has no identity table: it is
  // read as having no identity, which `--yes` makes after migrating.
  const { cluster, current, self } = yield* mediaFolderClaim.pipe(
    Effect.catchTag("DatabaseError", () =>
      Effect.gen(function* unmigrated() {
        const store = yield* MediaSweepStore;
        const folder = yield* MediaBucket;

        return {
          cluster: yield* store.cluster,
          current: yield* folder.owner,
          self: Option.none<StoreIdentity>(),
        };
      })
    ),
    Effect.provide(MediaFolderClaimLive.pipe(Layer.provideMerge(DatabaseLive)))
  );

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
      `Would write:  ${Option.match(self, {
        onNone: () => "a database id made now (this database has none yet)",
        onSome: ({ epoch, id }) =>
          `database ${id}, the next epoch after ${epoch}`,
      })}, Postgres system ${cluster.system}, timeline ${cluster.timeline}`,
    ].join("\n")
  );

  if (!confirmed) {
    yield* Console.log(
      "Nothing changed: no migration applied, nothing written. Run again with --yes to write it."
    );

    return yield* new ClaimNotConfirmed();
  }

  const written = yield* claimMediaFolder.pipe(
    Effect.provide(
      MediaFolderClaimLive.pipe(
        Layer.provideMerge(Layer.mergeAll(MigrationsLive, IdsLive)),
        Layer.provideMerge(DatabaseLive)
      )
    )
  );

  return yield* Console.log(
    `Written, and read back from the store: ${describe(written)}.`
  );
});

BunRuntime.runMain(program);
