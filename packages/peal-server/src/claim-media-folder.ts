import { BunRuntime } from "@effect/platform-bun";
import { Console, Effect, Layer, Option } from "effect";

import { claimMediaFolder } from "#media/application/claim-media-folder.ts";
import { MediaFolderClaimLive } from "#media/container.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";

// Hands the media folder (`<PEAL_S3_KEY_PREFIX>media/`) to the database
// `DATABASE_URL` names: writes its owner marker naming that database,
// whatever it named before, so the media sweeps that delete what the
// database does not know of run again. Only for a database meant to be
// the folder's newest truth: after a restore confirmed final, or when the
// sweeps refuse because the marker names a database that is gone. It
// applies pending migrations first, and changes no other object.
//
//   bun src/claim-media-folder.ts
const program = Effect.gen(function* claim() {
  const { id, previous } = yield* claimMediaFolder;

  yield* Console.log(
    `The media folder's owner marker now names this database (${id}); it named ${Option.getOrElse(previous, () => "none")}.`
  );
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
