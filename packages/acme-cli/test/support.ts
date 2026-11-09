import {
  Api,
  Authentication,
  CurrentPrincipal,
  DataDeletionNotFound,
  MetaAppNotConfigured,
  OAuthApi,
  OAuthClientNotPublished,
  Unauthenticated,
  WorkspaceAccess,
  WorkspaceNotFound,
} from "acme-contract";
import type { Me } from "acme-contract";
import {
  ConfigProvider,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Redacted,
  Schema,
  Stdio,
  Terminal,
} from "effect";
import { CliOutput } from "effect/cli";
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { ChildProcessSpawner } from "effect/process";
import { TestConsole } from "effect/testing";

import { makeAuthorizationServer } from "./authorization-server.ts";
import type { AuthorizationServer } from "./authorization-server.ts";

const unused = Effect.die("not used by the CLI tests");

// What a run needs besides the network: no terminal or child processes,
// plain output, only the environment variables a test names, and a file
// system that does nothing unless a test brings a real one.
export const cliEnvironment = (
  env: Record<string, string> = {},
  fileSystem: Layer.Layer<FileSystem.FileSystem> = FileSystem.layerNoop({})
) =>
  Layer.mergeAll(
    fileSystem,
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

/** The user the in-memory server's access tokens sign in. */
export const syntheticMe: Me = {
  impersonatedBy: null,
  user: {
    email: "synthetic@example.test",
    emailVerified: true,
    id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    image: null,
    locale: "en",
    name: "Synthetic User",
  },
  workspaces: [
    {
      id: "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60",
      name: "Studio",
      permissions: ["post:read"],
      role: "owner",
      slug: "studio",
    },
  ],
};

const refusing = Effect.fail(new Unauthenticated());

// Bearer tokens work when they are the authorization server's latest access
// token; nothing else signs in.
const securityLive = (authorization: AuthorizationServer) =>
  Layer.mergeAll(
    Layer.succeed(
      Authentication,
      Authentication.of({
        bearer: (httpEffect, { credential }) =>
          Effect.gen(function* bearer() {
            const accepted = yield* authorization.acceptedToken;

            if (!Option.contains(accepted, Redacted.value(credential))) {
              return yield* new Unauthenticated();
            }

            return yield* httpEffect.pipe(
              Effect.provideService(CurrentPrincipal, {
                _tag: "user",
                impersonatedBy: null,
                userId: syntheticMe.user.id,
              })
            );
          }),
        session: () => refusing,
      })
    ),
    Layer.succeed(
      WorkspaceAccess,
      WorkspaceAccess.of(() => Effect.fail(new WorkspaceNotFound()))
    )
  );

const signedInGroupsLive = (authorization: AuthorizationServer) =>
  Layer.mergeAll(
    HttpApiBuilder.group(Api, "session", (handlers) =>
      handlers.handleAll({ me: () => Effect.succeed(syntheticMe) })
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
        chooseAccounts: () => refusing,
        completeConnect: () => refusing,
        connect: () => refusing,
        disconnect: () => refusing,
        list: () => refusing,
        platforms: () => refusing,
        reconnect: () => refusing,
      })
    ),
    HttpApiBuilder.group(Api, "posts", (handlers) =>
      handlers.handleAll({
        attempts: () => refusing,
        cancel: () => refusing,
        confirm: () => refusing,
        create: () => refusing,
        discard: () => refusing,
        drafts: () => refusing,
        get: () => refusing,
        list: () => refusing,
        repost: () => refusing,
        reschedule: () => refusing,
        schedule: () => refusing,
        unschedule: () => refusing,
        update: () => refusing,
      })
    ),
    HttpApiBuilder.group(Api, "media", (handlers) =>
      handlers.handleAll({
        complete: () => refusing,
        create: () => refusing,
        delete: () => refusing,
        describe: () => refusing,
        get: () => refusing,
        list: () => refusing,
        usage: () => refusing,
      })
    ),
    HttpApiBuilder.group(Api, "notices", (handlers) =>
      handlers.handleAll({
        list: () => refusing,
        markAllRead: () => refusing,
        markRead: () => refusing,
        unread: () => refusing,
      })
    ),
    HttpApiBuilder.group(Api, "notificationPreferences", (handlers) =>
      handlers.handleAll({ get: () => refusing, update: () => refusing })
    ),
    HttpApiBuilder.group(Api, "assistant", (handlers) =>
      handlers.handleAll({
        status: () => refusing,
        suggest: () => refusing,
      })
    ),
    HttpApiBuilder.group(Api, "workspaces", (handlers) =>
      handlers.handleAll({ delete: () => refusing })
    ),
    HttpApiBuilder.group(Api, "members", (handlers) =>
      handlers.handleAll({ list: () => refusing })
    ),
    HttpApiBuilder.group(Api, "invitations", (handlers) =>
      handlers.handleAll({
        create: () => refusing,
        list: () => refusing,
        revoke: () => refusing,
      })
    ),
    HttpApiBuilder.group(Api, "account", (handlers) =>
      handlers.handleAll({ delete: () => refusing, export: () => refusing })
    ),
    HttpApiBuilder.group(Api, "connectedApps", (handlers) =>
      handlers.handleAll({ list: () => refusing, revoke: () => refusing })
    ),
    HttpApiBuilder.group(Api, "billing", (handlers) =>
      handlers.handleAll({ get: () => refusing })
    ),
    HttpApiBuilder.group(Api, "analytics", (handlers) =>
      handlers.handleAll({ post: () => refusing, summary: () => refusing })
    )
  ).pipe(Layer.provideMerge(securityLive(authorization)));

const notPublished = Effect.fail(new OAuthClientNotPublished());

const ChannelOAuthLive = HttpApiBuilder.group(Api, "channelOAuth", (handlers) =>
  handlers.handleAll({
    blueskyClientMetadata: () => notPublished,
    blueskyJwks: () => notPublished,
  })
);

// A server without a captcha.
const CaptchaLive = HttpApiBuilder.group(Api, "captcha", (handlers) =>
  handlers.handleAll({
    get: () => Effect.succeed({ turnstileSiteKey: null }),
  })
);

const notConfigured = Effect.fail(new MetaAppNotConfigured());

const DataDeletionLive = HttpApiBuilder.group(Api, "dataDeletion", (handlers) =>
  handlers.handleAll({
    request: () => notConfigured,
    status: () => Effect.fail(new DataDeletionNotFound()),
  })
);

// An Acme server in memory: acme-contract served by test handlers, without
// a socket, with an OAuth authorization server. The CLI never imports
// acme-server, so its tests answer for it.
export const inMemoryServer = (
  health: Effect.Effect<void>,
  authorization?: AuthorizationServer
) =>
  Layer.unwrap(
    Effect.gen(function* inMemory() {
      const server = authorization ?? (yield* makeAuthorizationServer());

      const app = yield* Effect.acquireRelease(
        Effect.sync(() =>
          HttpRouter.toWebHandler(
            Layer.mergeAll(
              HttpApiBuilder.layer(Api).pipe(
                Layer.provide(
                  HttpApiBuilder.group(Api, "system", (handlers) =>
                    handlers.handleAll({
                      health: () => health,
                      ready: () => health,
                    })
                  )
                ),
                Layer.provide(signedInGroupsLive(server)),
                Layer.provide(ChannelOAuthLive),
                Layer.provide(CaptchaLive),
                Layer.provide(DataDeletionLive)
              ),
              HttpApiBuilder.layer(OAuthApi).pipe(
                Layer.provide(server.handlers)
              )
            ).pipe(Layer.provide(HttpServer.layerServices)),
            { disableLogger: true }
          )
        ),
        (handler) =>
          Effect.promise(async () => {
            await handler.dispose();
          })
      );

      return fetching(async (request) => await app.handler(request));
    })
  );

const decodeLines = Schema.decodeUnknownSync(Schema.Array(Schema.String));

// What the run printed on stdout and stderr.
export const output = Effect.all({
  errors: TestConsole.errorLines.pipe(Effect.map(decodeLines)),
  logs: TestConsole.logLines.pipe(Effect.map(decodeLines)),
});
