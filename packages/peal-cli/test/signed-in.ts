import { setTimeout as delay } from "node:timers/promises";

import { NodeFileSystem } from "@effect/platform-node-shared";
import { DateTime, Effect, Fiber, FileSystem, Layer, Path } from "effect";
import { TestClock } from "effect/testing";

import { runWith } from "#cli.ts";

import { makeAuthorizationServer } from "./authorization-server.ts";
import { makeStudio, studioId, studioMe } from "./studio.ts";
import type { Studio, StudioKey } from "./studio.ts";
import { cliEnvironment, inMemoryServer, output } from "./support.ts";

/** When the commands run, unless a test says otherwise. */
export const testNow = DateTime.makeUnsafe("2026-11-09T12:00:00Z");

/** What a test needs besides its run: a real file system and paths. */
export const filesLayer = Layer.mergeAll(NodeFileSystem.layer, Path.layer);

/** A command line run, and what it printed. */
export interface Runs {
  /** Runs the command line, and answers with what it printed on stdout. */
  readonly printed: (args: readonly string[]) => Effect.Effect<string, unknown>;
  /** Runs the command line, and answers with what it printed on stderr. */
  readonly refused: (args: readonly string[]) => Effect.Effect<string, unknown>;
  /** Runs a command that is refused, and answers with both of them. */
  readonly refusedAfter: (
    args: readonly string[]
  ) => Effect.Effect<
    { readonly errors: string; readonly logs: string },
    unknown
  >;
}

export interface SignedIn extends Runs {
  /** The folder the test may write in. */
  readonly directory: string;
  readonly studio: Studio;
  /** The same command line, with more of the environment set. */
  readonly withEnv: (env: Readonly<Record<string, string>>) => Runs;
}

/** A synthetic API key of the studio, which may read and write drafts. */
export const draftingKey: StudioKey = {
  id: "4e7a1b2c-3d5f-4a6b-9c8d-0e1f2a3b4c5d",
  key: "peal_test_synthetic_drafting_key",
  permissions: ["channel:read", "post:read", "post:create", "post:update"],
  workspaceId: studioId,
};

/**
 * The command line signed in to an in-memory server holding the studio,
 * with its sign-in saved in a temporary folder of the test's own, at
 * `now` on the test clock. `signIn: false` leaves it signed out, as a run
 * with an API key alone starts.
 */
export const signedIn = Effect.fn("signedIn")(function* signedIn(
  options: {
    readonly env?: Readonly<Record<string, string>>;
    /** The API keys the server takes. */
    readonly keys?: readonly StudioKey[];
    readonly me?: typeof studioMe;
    readonly now?: DateTime.Utc;
    /** The scopes the user approves at sign-in: all of them, unless told. */
    readonly scope?: string;
    readonly signIn?: boolean;
  } = {}
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = yield* fs.makeTempDirectoryScoped();

  const authorization = yield* makeAuthorizationServer(
    options.scope === undefined ? {} : { scope: options.scope }
  );

  const studio = yield* makeStudio(options.me ?? studioMe, options.keys ?? []);

  yield* TestClock.setTime(DateTime.toEpochMillis(options.now ?? testNow));

  const server = inMemoryServer(Effect.void, authorization, studio);

  const runs = (extra: Readonly<Record<string, string>>): Runs => {
    const environment = Layer.mergeAll(
      cliEnvironment(
        {
          PEAL_CONFIG_DIR: path.join(directory, "peal"),
          TZ: "Europe/Paris",
          ...options.env,
          ...extra,
        },
        NodeFileSystem.layer
      ),
      server
    );

    const run = (args: readonly string[]) =>
      runWith(args).pipe(Effect.provide(environment));

    return {
      printed: (args) =>
        Effect.gen(function* runPrinting() {
          const before = (yield* output).logs.length;

          yield* run(args);

          return (yield* output).logs.slice(before).join("\n");
        }),
      refused: (args) =>
        Effect.gen(function* runRefused() {
          const before = (yield* output).errors.length;

          yield* run(args).pipe(Effect.flip);

          return (yield* output).errors.slice(before).join("\n");
        }),
      refusedAfter: (args) =>
        Effect.gen(function* runRefusedAfter() {
          const before = yield* output;

          yield* run(args).pipe(Effect.flip);

          const after = yield* output;

          return {
            errors: after.errors.slice(before.errors.length).join("\n"),
            logs: after.logs.slice(before.logs.length).join("\n"),
          };
        }),
    };
  };

  const { printed, refused, refusedAfter } = runs({});

  if (options.signIn !== false) {
    // The sign-in waits five seconds before asking for its tokens: the
    // in-memory server answers on the event loop, which the test clock does
    // not drive.
    const login = yield* printed(["login"]).pipe(Effect.forkChild);

    yield* Effect.promise(async () => {
      await delay(10);
    });
    yield* TestClock.adjust("5 seconds");
    yield* Fiber.join(login);
  }

  return {
    directory,
    printed,
    refused,
    refusedAfter,
    studio,
    withEnv: runs,
  } satisfies SignedIn;
});
