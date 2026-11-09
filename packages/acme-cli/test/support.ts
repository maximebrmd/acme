import {
  Api,
  Authentication,
  Unauthenticated,
  WorkspaceAccess,
  WorkspaceNotFound,
} from "acme-contract";
import {
  ConfigProvider,
  Effect,
  FileSystem,
  Layer,
  Path,
  Schema,
  Stdio,
  Terminal,
} from "effect";
import { CliOutput } from "effect/cli";
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { ChildProcessSpawner } from "effect/process";
import { TestConsole } from "effect/testing";

const unused = Effect.die("not used by the CLI tests");

// What a run needs besides the network: no terminal, file system or child
// processes, plain output, and only the environment variables a test names.
export const cliEnvironment = (env: Record<string, string> = {}) =>
  Layer.mergeAll(
    FileSystem.layerNoop({}),
    Path.layer,
    Stdio.layerTest({}),
    Layer.succeed(
      Terminal.Terminal,
      Terminal.make({
        columns: Effect.succeed(80),
        display: () => Effect.void,
        readInput: unused,
        readLine: unused,
        rows: Effect.succeed(24),
        size: unused,
      })
    ),
    Layer.succeed(
      ChildProcessSpawner.ChildProcessSpawner,
      ChildProcessSpawner.make(() => unused)
    ),
    CliOutput.layer(CliOutput.defaultFormatter({ colors: false })),
    ConfigProvider.layer(ConfigProvider.fromEnv({ env }))
  );

// The CLI's own fetch-based HttpClient, with `fetch` itself replaced, so
// requests go through the same transport and error mapping as in production.
// A responder that throws stands for a fetch that rejects.
export const fetching = (
  respond: (request: Request) => Response | Promise<Response>
) =>
  Layer.mergeAll(
    FetchHttpClient.layer,
    Layer.succeed(
      FetchHttpClient.Fetch,
      Object.assign(
        async (input: string | URL | Request, init?: RequestInit) =>
          await respond(
            input instanceof Request
              ? new Request(input, init)
              : new Request(input.toString(), init)
          ),
        {
          preconnect: () => {
            // Nothing to warm up: these requests never leave the process.
          },
        }
      )
    )
  );

// The commands under test call no endpoint that needs credentials. Those
// refuse anyone, as the server does a request without any.
const refusing = Effect.fail(new Unauthenticated());

const SecurityLive = Layer.mergeAll(
  Layer.succeed(
    Authentication,
    Authentication.of({ bearer: () => refusing, session: () => refusing })
  ),
  Layer.succeed(
    WorkspaceAccess,
    WorkspaceAccess.of(() => Effect.fail(new WorkspaceNotFound()))
  )
);

const SignedInGroupsLive = Layer.mergeAll(
  HttpApiBuilder.group(Api, "session", (handlers) =>
    handlers.handleAll({ me: () => refusing })
  ),
  HttpApiBuilder.group(Api, "apiKeys", (handlers) =>
    handlers.handleAll({
      create: () => refusing,
      list: () => refusing,
      revoke: () => refusing,
    })
  ),
  HttpApiBuilder.group(Api, "channels", (handlers) =>
    handlers.handleAll({
      disconnect: () => refusing,
      list: () => refusing,
    })
  ),
  HttpApiBuilder.group(Api, "posts", (handlers) =>
    handlers.handleAll({
      cancel: () => refusing,
      create: () => refusing,
      get: () => refusing,
      list: () => refusing,
      reschedule: () => refusing,
      schedule: () => refusing,
      update: () => refusing,
    })
  )
).pipe(Layer.provideMerge(SecurityLive));

// An Acme server in memory: acme-contract served by test handlers, without
// a socket. The CLI never imports acme-server, so its tests answer for it.
export const inMemoryServer = (health: Effect.Effect<void>) =>
  Layer.unwrap(
    Effect.map(
      Effect.acquireRelease(
        Effect.sync(() =>
          HttpRouter.toWebHandler(
            HttpApiBuilder.layer(Api).pipe(
              Layer.provide(
                HttpApiBuilder.group(Api, "system", (handlers) =>
                  handlers.handleAll({
                    health: () => health,
                    ready: () => health,
                  })
                )
              ),
              Layer.provide(SignedInGroupsLive),
              Layer.provide(HttpServer.layerServices)
            ),
            { disableLogger: true }
          )
        ),
        (app) =>
          Effect.promise(async () => {
            await app.dispose();
          })
      ),
      (app) => fetching(async (request) => await app.handler(request))
    )
  );

const decodeLines = Schema.decodeUnknownSync(Schema.Array(Schema.String));

// What the run printed on stdout and stderr.
export const output = Effect.all({
  errors: TestConsole.errorLines.pipe(Effect.map(decodeLines)),
  logs: TestConsole.logLines.pipe(Effect.map(decodeLines)),
});
