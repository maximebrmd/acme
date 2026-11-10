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
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import { ChildProcessSpawner } from "effect/process";
import { TestConsole } from "effect/testing";
import {
  Api,
  Authentication,
  BillingNotEnabled,
  ClientErrorIntake,
  ConnectLinkIntake,
  ConnectLinkNotFound,
  ContractRequestIntake,
  ContractRequestNotFound,
  CurrentPrincipal,
  DataDeletionNotFound,
  MetaAppNotConfigured,
  OAuthApi,
  OAuthClientNotPublished,
  StaffAccess,
  Unauthenticated,
} from "peal-contract";
import type { Me } from "peal-contract";

import { makeAuthorizationServer } from "./authorization-server.ts";
import type { AuthorizationServer } from "./authorization-server.ts";
import {
  makeStudio,
  storeHost,
  storePut,
  studioAccessLive,
  studioGroupsLive,
} from "./studio.ts";
import type { Studio } from "./studio.ts";

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
// token; nothing else signs in. Workspace routes act as the user, as a
// member of the studio's workspaces.
const securityLive = (authorization: AuthorizationServer, studio: Studio) =>
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
                oauth: {
                  clientId: "peal-cli",
                  scopes: authorization.scopes,
                  workspaceId: null,
                },
                userId: syntheticMe.user.id,
              })
            );
          }),
        session: () => refusing,
      })
    ),
    studioAccessLive(studio)
  );

// The groups the studio does not answer refuse every request.
const signedInGroupsLive = (
  authorization: AuthorizationServer,
  studio: Studio
) =>
  Layer.mergeAll(
    studioGroupsLive(studio),
    HttpApiBuilder.group(Api, "apiKeys", (handlers) =>
      handlers.handleAll({
        create: () => refusing,
        list: () => refusing,
        revoke: () => refusing,
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
    HttpApiBuilder.group(Api, "connectLinks", (handlers) =>
      handlers.handleAll({
        create: () => refusing,
        get: () => refusing,
        list: () => refusing,
        revoke: () => refusing,
      })
    ),
    HttpApiBuilder.group(Api, "partner", (handlers) =>
      handlers.handleAll({
        account: () => refusing,
        createWorkspace: () => refusing,
        deleteWorkspace: () => refusing,
        getWorkspace: () => refusing,
        listWorkspaces: () => refusing,
        updateWorkspace: () => refusing,
      })
    ),
    HttpApiBuilder.group(Api, "partnerAccount", (handlers) =>
      handlers.handleAll({
        close: () => refusing,
        createKey: () => refusing,
        get: () => refusing,
        listKeys: () => refusing,
        listWorkspaces: () => refusing,
        open: () => refusing,
        revokeKey: () => refusing,
        update: () => refusing,
      })
    ),
    HttpApiBuilder.group(Api, "billingActions", (handlers) =>
      handlers.handleAll({
        cancel: () => refusing,
        order: () => refusing,
        reduce: () => refusing,
        withdraw: () => refusing,
        withdrawal: () => refusing,
      })
    )
  ).pipe(Layer.provideMerge(securityLive(authorization, studio)));

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

// Nobody is staff: the staff console answers 404 to every request.
const notStaff = Effect.fail(new HttpApiError.NotFound());

const StaffLive = HttpApiBuilder.group(Api, "staff", (handlers) =>
  handlers.handleAll({
    audit: () => notStaff,
    ban: () => notStaff,
    impersonate: () => notStaff,
    resendVerification: () => notStaff,
    revokeSessions: () => notStaff,
    session: () => notStaff,
    system: () => notStaff,
    unban: () => notStaff,
    user: () => notStaff,
    users: () => notStaff,
    workspace: () => notStaff,
    workspaces: () => notStaff,
  })
).pipe(
  Layer.provideMerge(
    Layer.succeed(StaffAccess, StaffAccess.of({ session: () => notStaff }))
  )
);

// Nor are legal requests answered.
const LegalLive = HttpApiBuilder.group(Api, "legal", (handlers) =>
  handlers.handleAll({
    answer: () => notStaff,
    answered: () => notStaff,
    standing: () => notStaff,
  })
).pipe(
  Layer.provideMerge(
    Layer.succeed(StaffAccess, StaffAccess.of({ session: () => notStaff }))
  )
);

// This server sells no subscription: it has no contract to cancel or
// withdraw from, and no request waits for staff.
const noContract = Effect.fail(new BillingNotEnabled());

const ContractRequestsLive = Layer.mergeAll(
  HttpApiBuilder.group(Api, "contractRequests", (handlers) =>
    handlers.handleAll({
      confirm: () => noContract,
      functions: () =>
        Effect.succeed({ enabled: false, turnstileSiteKey: null }),
      preview: () => Effect.fail(new ContractRequestNotFound()),
      send: () => noContract,
    })
  ),
  HttpApiBuilder.group(Api, "contractRequestsDesk", (handlers) =>
    handlers.handleAll({
      apply: () => notStaff,
      close: () => notStaff,
      list: () => notStaff,
    })
  )
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      Layer.succeed(
        ContractRequestIntake,
        ContractRequestIntake.of((httpEffect) => httpEffect)
      ),
      Layer.succeed(StaffAccess, StaffAccess.of({ session: () => notStaff }))
    )
  )
);

// Error reports are taken, and dropped.
const ClientErrorsLive = HttpApiBuilder.group(Api, "clientErrors", (handlers) =>
  handlers.handleAll({ reportClientError: () => Effect.void })
).pipe(
  Layer.provideMerge(
    Layer.succeed(
      ClientErrorIntake,
      ClientErrorIntake.of((httpEffect) => httpEffect)
    )
  )
);

// No link opens anything here: the hosted pages are the web app's.
const noLink = Effect.fail(new ConnectLinkNotFound());

const HostedConnectLive = HttpApiBuilder.group(
  Api,
  "hostedConnect",
  (handlers) =>
    handlers.handleAll({
      choose: () => noLink,
      complete: () => noLink,
      open: () => noLink,
      start: () => noLink,
    })
).pipe(
  Layer.provideMerge(
    Layer.succeed(
      ConnectLinkIntake,
      ConnectLinkIntake.of((httpEffect) => httpEffect)
    )
  )
);

const notConfigured = Effect.fail(new MetaAppNotConfigured());

const DataDeletionLive = HttpApiBuilder.group(Api, "dataDeletion", (handlers) =>
  handlers.handleAll({
    deauthorize: () => notConfigured,
    request: () => notConfigured,
    status: () => Effect.fail(new DataDeletionNotFound()),
  })
);

// A Peal server in memory: peal-contract served by test handlers, without
// a socket, with an OAuth authorization server and a studio of synthetic
// workspaces, where the user belongs to syntheticMe's unless a test brings
// its own. The CLI never imports peal-server, so its tests answer for it.
export const inMemoryServer = (
  health: Effect.Effect<void>,
  authorization?: AuthorizationServer,
  studio?: Studio
) =>
  Layer.unwrap(
    Effect.gen(function* inMemory() {
      const server = authorization ?? (yield* makeAuthorizationServer());
      const workspaces = studio ?? (yield* makeStudio(syntheticMe));

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
                Layer.provide(signedInGroupsLive(server, workspaces)),
                Layer.provide(ChannelOAuthLive),
                Layer.provide(CaptchaLive),
                Layer.provide(DataDeletionLive),
                Layer.provide(StaffLive),
                Layer.provide(LegalLive),
                Layer.provide(ClientErrorsLive),
                Layer.provide(HostedConnectLive),
                Layer.provide(ContractRequestsLive)
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

      // The media store is another host: signed requests go to it, never
      // to the API.
      return fetching(async (request) =>
        new URL(request.url).host === storeHost
          ? await storePut(workspaces, request)
          : await app.handler(request)
      );
    })
  );

const decodeLines = Schema.decodeUnknownSync(Schema.Array(Schema.String));

// What the run printed on stdout and stderr.
export const output = Effect.all({
  errors: TestConsole.errorLines.pipe(Effect.map(decodeLines)),
  logs: TestConsole.logLines.pipe(Effect.map(decodeLines)),
});
