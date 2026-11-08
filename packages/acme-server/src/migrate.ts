import { BunRuntime } from "@effect/platform-bun";
import { Effect } from "effect";

import { DatabaseLive } from "#shared/infrastructure/database.ts";
import {
  migrate,
  migrationsFolder,
} from "#shared/infrastructure/migrations.ts";

// Applies the pending migrations and exits, without starting the server, which
// would apply them too.
BunRuntime.runMain(
  migrate({ migrationsFolder }).pipe(Effect.provide(DatabaseLive))
);
