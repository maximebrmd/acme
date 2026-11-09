import { setTimeout as delay } from "node:timers/promises";

import { NodeFileSystem } from "@effect/platform-node-shared";
import { assert, describe, it } from "@effect/vitest";
import { cliClientId } from "peal-contract";
import { Effect, Fiber, FileSystem, Layer, Path, Runtime } from "effect";
import type { HttpClient } from "effect/http";
import { TestClock } from "effect/testing";

import { runWith } from "#cli.ts";
import { loginScope } from "#commands/login.ts";
import { NotSignedIn } from "#not-signed-in.ts";
import { SignInFailed } from "#sign-in-failed.ts";

import {
  accessTokenOf,
  makeAuthorizationServer,
  publicUrl,
  refreshTokenOf,
} from "./authorization-server.ts";
import type {
  AuthorizationServer,
  AuthorizationServerOptions,
} from "./authorization-server.ts";
import { cliEnvironment, inMemoryServer, output } from "./support.ts";

// The sign-in commands against an in-memory server, with a real file
// system: each test saves its sign-in in a temporary folder of its own.

const server = "http://localhost:3000/";

const permissionsOf = (mode: number) => mode % 0o1000;

interface Setup {
  readonly authorization: AuthorizationServer;
  readonly directory: string;
  readonly file: string;
  /** Runs the command line with these arguments. */
  readonly run: (args: readonly string[]) => Effect.Effect<void, unknown>;
}

const setUp = Effect.fn("setUp")(function* setUp(
  options: AuthorizationServerOptions = {}
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = yield* fs.makeTempDirectoryScoped();
  const authorization = yield* makeAuthorizationServer(options);

  const transport: Layer.Layer<HttpClient.HttpClient> = inMemoryServer(
    Effect.void,
    authorization
  );

  const environment = Layer.mergeAll(
    cliEnvironment(
      { PEAL_CONFIG_DIR: path.join(directory, "peal") },
      NodeFileSystem.layer
    ),
    transport
  );

  return {
    authorization,
    directory: path.join(directory, "peal"),
    file: path.join(directory, "peal", "credentials.json"),
    run: (args: readonly string[]) =>
      runWith(args).pipe(Effect.provide(environment)),
  } satisfies Setup;
});

// Lets the fiber reach its next sleep, then wakes it: the in-memory server
// answers on the event loop, which the test clock does not drive.
const elapse = Effect.gen(function* elapse() {
  yield* Effect.promise(async () => {
    await delay(10);
  });
  yield* TestClock.adjust("5 seconds");
});

// Signs in, approving after the command line asked `approveAfter` times.
const signIn = Effect.fn("signIn")(function* signIn(
  setup: Setup,
  polls: number
) {
  const login = yield* setup.run(["login"]).pipe(Effect.forkChild);

  for (let poll = 0; poll < polls; poll += 1) {
    yield* elapse;
  }

  return yield* Fiber.join(login);
});

const environmentLayer = Layer.mergeAll(NodeFileSystem.layer, Path.layer);

describe("peal login", () => {
  it.effect(
    "shows a code, waits for its approval, and saves the tokens for the user alone",
    () =>
      Effect.gen(function* signsIn() {
        const setup = yield* setUp({ approveAfter: 2 });
        const fs = yield* FileSystem.FileSystem;

        yield* signIn(setup, 3);

        const { errors, logs } = yield* output;
        const printed = [...logs, ...errors].join("\n");

        assert.include(
          printed,
          `open ${publicUrl}/device in a browser and enter the code WDJB-MJHT`
        );
        assert.include(printed, `Signed in to http://localhost:3000.`);

        // The command line asked for the API's resource, as the server
        // names it, and for the scopes it needs.
        const state = yield* setup.authorization.state;

        assert.deepStrictEqual(state.deviceRequests, [
          {
            client_id: cliClientId,
            resource: `${publicUrl}/api`,
            scope: loginScope,
          },
        ]);
        assert.strictEqual(state.polls, 3);

        const saved = yield* fs.readFileString(setup.file);

        assert.include(saved, accessTokenOf(1));
        assert.include(saved, refreshTokenOf(1));
        assert.strictEqual(
          permissionsOf((yield* fs.stat(setup.file)).mode),
          0o600
        );
        assert.strictEqual(
          permissionsOf((yield* fs.stat(setup.directory)).mode),
          0o700
        );

        // The tokens never reach the output.
        assert.notInclude(printed, "synthetic-access");
        assert.notInclude(printed, "synthetic-refresh");
      }).pipe(Effect.scoped, Effect.provide(environmentLayer))
  );

  it.effect("makes a file others could read private again", () =>
    Effect.gen(function* tightens() {
      const setup = yield* setUp();
      const fs = yield* FileSystem.FileSystem;

      yield* fs.makeDirectory(setup.directory, { recursive: true });
      yield* fs.writeFileString(
        setup.file,
        JSON.stringify({ servers: {}, version: 1 }),
        { mode: 0o644 }
      );
      yield* fs.chmod(setup.file, 0o644);

      yield* signIn(setup, 1);

      assert.strictEqual(
        permissionsOf((yield* fs.stat(setup.file)).mode),
        0o600
      );
    }).pipe(Effect.scoped, Effect.provide(environmentLayer))
  );

  it.effect("fails when the user denies the sign-in", () =>
    Effect.gen(function* denied() {
      const setup = yield* setUp({ deny: true });
      const fs = yield* FileSystem.FileSystem;

      const error = yield* signIn(setup, 1).pipe(Effect.flip);

      assert.instanceOf(error, SignInFailed);
      assert.strictEqual(Runtime.getErrorExitCode(error), 1);
      assert.isFalse(yield* fs.exists(setup.file));
    }).pipe(Effect.scoped, Effect.provide(environmentLayer))
  );

  it.effect("gives up when the code runs out before its approval", () =>
    Effect.gen(function* expires() {
      const setup = yield* setUp({ approveAfter: 1000 });

      const login = yield* setup
        .run(["login"])
        .pipe(Effect.flip, Effect.forkChild);

      for (let poll = 0; poll < 121; poll += 1) {
        yield* elapse;
      }

      const error = yield* Fiber.join(login);

      assert.instanceOf(error, SignInFailed);

      if (error instanceof SignInFailed) {
        assert.strictEqual(error.reason, "expired");
      }
    }).pipe(Effect.scoped, Effect.provide(environmentLayer))
  );
});

describe("peal whoami", () => {
  it.effect("tells to sign in first", () =>
    Effect.gen(function* signedOut() {
      const setup = yield* setUp();

      const error = yield* setup.run(["whoami"]).pipe(Effect.flip);

      assert.instanceOf(error, NotSignedIn);
      assert.include(
        (yield* output).errors.join("\n"),
        "You are not signed in to http://localhost:3000. Run peal login first."
      );
    }).pipe(Effect.scoped, Effect.provide(environmentLayer))
  );

  it.effect("shows the user, renewing the sign-in once it ran out", () =>
    Effect.gen(function* signedIn() {
      const setup = yield* setUp();
      const fs = yield* FileSystem.FileSystem;

      yield* signIn(setup, 1);
      // The access token lasts 15 minutes.
      yield* TestClock.adjust("20 minutes");
      yield* setup.run(["whoami"]);

      const { logs } = yield* output;

      assert.include(
        logs.join("\n"),
        "Signed in to http://localhost:3000 as Synthetic User <synthetic@example.test>.\nWorkspaces:\n  Studio (owner)"
      );
      assert.strictEqual((yield* setup.authorization.state).generation, 2);

      const saved = yield* fs.readFileString(setup.file);

      assert.include(saved, accessTokenOf(2));
      assert.notInclude(saved, refreshTokenOf(1));
      assert.notInclude(logs.join("\n"), "synthetic-");
    }).pipe(Effect.scoped, Effect.provide(environmentLayer))
  );
});

describe("peal logout", () => {
  it.effect("revokes the sign-in and forgets it", () =>
    Effect.gen(function* signsOut() {
      const setup = yield* setUp();
      const fs = yield* FileSystem.FileSystem;

      yield* signIn(setup, 1);
      yield* setup.run(["logout"]);

      assert.deepStrictEqual((yield* setup.authorization.state).revoked, [
        refreshTokenOf(1),
      ]);
      assert.notInclude(yield* fs.readFileString(setup.file), server);
      assert.include(
        (yield* output).logs.join("\n"),
        "Signed out of http://localhost:3000."
      );

      const error = yield* setup.run(["whoami"]).pipe(Effect.flip);

      assert.instanceOf(error, NotSignedIn);
    }).pipe(Effect.scoped, Effect.provide(environmentLayer))
  );

  it.effect("keeps other servers' sign-ins", () =>
    Effect.gen(function* others() {
      const setup = yield* setUp();
      const fs = yield* FileSystem.FileSystem;

      yield* signIn(setup, 1);
      yield* setup.run(["logout", "--api-url", "https://peal.test"]);

      assert.include(yield* fs.readFileString(setup.file), server);
      assert.include(
        (yield* output).logs.join("\n"),
        "You are not signed in to https://peal.test."
      );
    }).pipe(Effect.scoped, Effect.provide(environmentLayer))
  );
});

describe("peal mcp", () => {
  it.effect("shows the MCP endpoint the server names", () =>
    Effect.gen(function* configures() {
      const setup = yield* setUp({ registration: true });

      yield* setup.run(["mcp"]);

      const printed = (yield* output).logs.join("\n");

      assert.include(printed, `URL        ${publicUrl}/api/mcp`);
      assert.include(printed, `"url": "${publicUrl}/api/mcp"`);
      assert.notInclude(printed, "MCP_DYNAMIC_REGISTRATION");
    }).pipe(Effect.scoped, Effect.provide(environmentLayer))
  );

  it.effect("tells when MCP clients may not register themselves", () =>
    Effect.gen(function* closed() {
      const setup = yield* setUp();

      yield* setup.run(["mcp"]);

      assert.include(
        (yield* output).logs.join("\n"),
        "MCP_DYNAMIC_REGISTRATION=true"
      );
    }).pipe(Effect.scoped, Effect.provide(environmentLayer))
  );
});
