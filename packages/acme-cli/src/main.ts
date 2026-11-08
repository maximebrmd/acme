import { BunHttpClient, BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Layer } from "effect";

import { run } from "#cli.ts";

BunRuntime.runMain(
  run.pipe(
    Effect.provide(Layer.mergeAll(BunServices.layer, BunHttpClient.layer))
  )
);
