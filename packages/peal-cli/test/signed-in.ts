import { setTimeout as delay } from "node:timers/promises";

import { NodeFileSystem } from "@effect/platform-node-shared";
import { DateTime, Effect, Fiber, FileSystem, Layer, Path } from "effect";
import { TestClock } from "effect/testing";

import { runWith } from "#cli.ts";

import { makeAuthorizationServer } from "./authorization-server.ts";
import { makeStudio, studioMe } from "./studio.ts";
import type { Studio } from "./studio.ts";
import { cliEnvironment, inMemoryServer, output } from "./support.ts";

/** When the commands run, unless a test says otherwise. */
export const testNow = DateTime.makeUnsafe("2026-11-09T12:00:00Z");

/** What a test needs besides its run: a real file system and paths. */
export const filesLayer = Layer.mergeAll(NodeFileSystem.layer, Path.layer);

export interface SignedIn {
  /** The folder the test may write in. */
  readonly directory: string;
  /** Runs the command line, and answers with what it printed on stdout. */
  readonly printed: (args: readonly string[]) => Effect.Effect<string, unknown>;
  /** Runs the command line, and answers with what it printed on stderr. */
  readonly refused: (args: readonly string[]) => Effect.Effect<string, unknown>;
  readonly studio: Studio;
}

/**
 * The command line signed in to an in-memory server holding the studio,
 * with its sign-in saved in a temporary folder of the test's own, at
 * `now` on the test clock.
 */
export const signedIn = Effect.fn("signedIn")(function* signedIn(
  options: {
    readonly env?: Readonly<Record<string, string>>;
    readonly me?: typeof studioMe;
    readonly now?: DateTime.Utc;
  } = {}
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = yield* fs.makeTempDirectoryScoped();
  const authorization = yield* makeAuthorizationServer();
  const studio = yield* makeStudio(options.me ?? studioMe);

  yield* TestClock.setTime(DateTime.toEpochMillis(options.now ?? testNow));

  const environment = Layer.mergeAll(
    cliEnvironment(
      {
        PEAL_CONFIG_DIR: path.join(directory, "peal"),
        TZ: "Europe/Paris",
        ...options.env,
      },
      NodeFileSystem.layer
    ),
    inMemoryServer(Effect.void, authorization, studio)
  );

  const run = (args: readonly string[]) =>
    runWith(args).pipe(Effect.provide(environment));

  // The sign-in waits five seconds before asking for its tokens: the
  // in-memory server answers on the event loop, which the test clock does
  // not drive.
  const login = yield* run(["login"]).pipe(Effect.forkChild);

  yield* Effect.promise(async () => {
    await delay(10);
  });
  yield* TestClock.adjust("5 seconds");
  yield* Fiber.join(login);

  const printed = (args: readonly string[]) =>
    Effect.gen(function* runPrinting() {
      const before = (yield* output).logs.length;

      yield* run(args);

      return (yield* output).logs.slice(before).join("\n");
    });

  const refused = (args: readonly string[]) =>
    Effect.gen(function* runRefused() {
      const before = (yield* output).errors.length;

      yield* run(args).pipe(Effect.flip);

      return (yield* output).errors.slice(before).join("\n");
    });

  return { directory, printed, refused, studio } satisfies SignedIn;
});
