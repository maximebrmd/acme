import { createHash, randomBytes } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import {
  AuthorizationServerSchema,
  ProtectedResourceSchema,
  PublicClientSchema,
} from "acme-contract";
import { Context, Effect, Layer, Option, Schema } from "effect";
import { McpClient, McpProtocol } from "effect/ai";
import type { McpSchema } from "effect/ai";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { freshChannel, syntheticCredentials } from "#test/channels/support.ts";
import {
  bodyOf,
  inProcessHttpClient,
  origin,
  signedUpUnconfirmed,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";
import type { Person, Reply } from "#test/workspace/integration/harness.ts";

// The MCP endpoint, as an MCP client meets it: a 401 that leads to the
// authorization server, dynamic registration, the authorization code flow
// with PKCE through the workspace picker and the consent page, then tool
// calls with a token bound to the workspace the user picked.

const mcpResource = `${origin}/api/mcp`;

const redirectUri = "http://127.0.0.1:33418/callback";

// The cookies a session holds after a reply that may change some.
const withCookies = (cookies: string, reply: Reply): string => {
  const jar = new Map(
    cookies
      .split("; ")
      .filter((cookie) => cookie !== "")
      .map((cookie) => [cookie.split("=")[0] ?? "", cookie])
  );

  for (const header of reply.headers.getSetCookie()) {
    const pair = header.split(";")[0] ?? "";
    const name = pair.split("=")[0] ?? "";

    if (pair.endsWith("=")) {
      jar.delete(name);
    } else {
      jar.set(name, pair);
    }
  }

  return [...jar.values()].join("; ");
};

const base64Url = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("base64url");

const RedirectSchema = Schema.Struct({
  redirect: Schema.Literal(true),
  url: Schema.String,
});

const RegisteredSchema = Schema.Struct({ client_id: Schema.String });

const TokensSchema = Schema.Struct({ access_token: Schema.String });

interface Fixture {
  readonly clientId: string;
  readonly owner: Person;
  /** A workspace with one channel. */
  readonly studio: string;
  readonly studioChannel: string;
  /** A workspace without channels. */
  readonly shop: string;
}

class McpFixture extends Context.Service<McpFixture, Fixture>()(
  "acme-server/test/McpFixture"
) {}

/**
 * Signs `person` in to the MCP client through the browser steps: authorize,
 * the workspace picker, the consent page; then exchanges the code for an
 * access token bound to `workspaceId`.
 */
const authorize = Effect.fn("authorize")(function* authorize(
  person: Person,
  clientId: string,
  workspaceId: string,
  scope: string
) {
  const app = yield* TestApp;
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());

  const query = new URLSearchParams({
    client_id: clientId,
    code_challenge: challenge,
    code_challenge_method: "S256",
    redirect_uri: redirectUri,
    resource: mcpResource,
    response_type: "code",
    scope,
    state: "mcp-test",
  });

  const authorization = yield* app.request(
    `/api/auth/oauth2/authorize?${query.toString()}`,
    { headers: { cookie: person.cookies } }
  );

  assert.strictEqual(authorization.status, 302);

  const picker = new URL(authorization.headers.get("location") ?? "", origin);

  assert.strictEqual(picker.pathname, "/oauth/workspace");

  const picked = yield* app.request("/api/auth/organization/set-active", {
    body: { organizationId: workspaceId },
    headers: { cookie: person.cookies },
  });

  const cookie = withCookies(person.cookies, picked);

  const continued = yield* bodyOf(
    RedirectSchema,
    yield* app.request("/api/auth/oauth2/continue", {
      body: { oauth_query: picker.search.slice(1), postLogin: true },
      headers: { cookie },
    })
  );

  const consentPage = new URL(continued.url, origin);

  assert.strictEqual(consentPage.pathname, "/oauth/consent");

  // What the consent page shows of the client.
  const described = yield* bodyOf(
    PublicClientSchema,
    yield* app.request(`/api/auth/oauth2/public-client?client_id=${clientId}`, {
      headers: { cookie },
    })
  );

  assert.strictEqual(described.client_name, "Synthetic agent");

  const consented = yield* bodyOf(
    RedirectSchema,
    yield* app.request("/api/auth/oauth2/consent", {
      body: { accept: true, oauth_query: consentPage.search.slice(1) },
      headers: { cookie },
    })
  );

  const callback = new URL(consented.url);

  assert.strictEqual(`${callback.origin}${callback.pathname}`, redirectUri);
  assert.strictEqual(callback.searchParams.get("state"), "mcp-test");

  const tokens = yield* app.request("/api/auth/oauth2/token", {
    form: {
      client_id: clientId,
      code: callback.searchParams.get("code") ?? "",
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      resource: mcpResource,
    },
  });

  return (yield* bodyOf(TokensSchema, tokens)).access_token;
});

const McpFixtureLive = Layer.effect(
  McpFixture,
  Effect.gen(function* mcpFixture() {
    const app = yield* TestApp;
    const owner = yield* signedUpUnconfirmed("agent-owner");
    const studio = yield* workspaceOf(owner, "Studio");
    const shop = yield* workspaceOf(owner, "Shop");

    const channel = yield* freshChannel(WorkspaceIdSchema.make(studio));

    yield* ChannelRepository.use((channels) =>
      channels.insert(channel, syntheticCredentials(channel))
    );

    // An MCP client registers itself (RFC 7591), with no account.
    const registered = yield* app.request("/api/auth/oauth2/register", {
      body: {
        client_name: "Synthetic agent",
        grant_types: ["authorization_code", "refresh_token"],
        redirect_uris: [redirectUri],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
    });

    const { client_id: clientId } = yield* bodyOf(RegisteredSchema, registered);

    return { clientId, owner, shop, studio, studioChannel: channel.id };
  })
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      TestApp.layerWith({
        ...unconfirmedEmails,
        MCP_DYNAMIC_REGISTRATION: "true",
      }),
      DrizzleChannelRepository.pipe(
        Layer.provideMerge(IdsLive),
        Layer.provideMerge(DatabaseLive)
      )
    )
  )
);

// An MCP client of the endpoint, in process, with the token if any. The fetch
// client reads its Fetch when each request runs, so both stay in context.
const connect = (
  token: Option.Option<string>,
  protocol:
    | typeof McpProtocol.v2025_11_25
    | typeof McpProtocol.v2026_07_28 = McpProtocol.v2026_07_28
) =>
  McpClient.layerHttp({
    headers: Option.match(token, {
      onNone: () => ({}),
      onSome: (value) => ({ authorization: `Bearer ${value}` }),
    }),
    name: "acme-test",
    protocol,
    url: mcpResource,
    version: "1.0.0",
  }).pipe(Layer.provideMerge(inProcessHttpClient));

const toolNamed = (tools: readonly McpSchema.Tool[], name: string) => {
  const found = tools.find((tool) => tool.name === name);

  if (found === undefined) {
    throw new Error(`The server offers no tool named ${name}`);
  }

  return found;
};

const WhoAmISchema = Schema.Struct({
  user: Schema.Struct({ id: Schema.String }),
  workspace: Schema.Struct({
    id: Schema.String,
    permissions: Schema.Array(Schema.String),
    role: Schema.String,
  }),
});

const WorkspacesSchema = Schema.Struct({
  workspaces: Schema.Array(
    Schema.Struct({ connected: Schema.Boolean, id: Schema.String })
  ),
});

const ChannelsSchema = Schema.Struct({
  channels: Schema.Array(Schema.Struct({ id: Schema.String })),
});

const HealthSchema = Schema.Struct({
  database: Schema.String,
  server: Schema.String,
});

// Calls every tool as the token's member.
const callTools = Effect.gen(function* callTools() {
  const client = yield* McpClient.McpClient;
  const tools = yield* client.listTools();

  const call = <S extends Schema.Top>(name: string, schema: S) =>
    client.callTool({ schema, tool: toolNamed(tools, name) });

  return {
    channels: yield* call("list_channels", ChannelsSchema),
    health: yield* call("server_health", HealthSchema),
    names: tools.map(({ name }) => name).toSorted(),
    whoami: yield* call("whoami", WhoAmISchema),
    workspaces: yield* call("list_workspaces", WorkspacesSchema),
  };
});

// The HTTP status and challenge a refused connection got.
const refusedConnection = (
  token: Option.Option<string>,
  protocol?: typeof McpProtocol.v2025_11_25
) =>
  McpClient.McpClient.pipe(
    Effect.provide(connect(token, protocol)),
    Effect.flip,
    Effect.map((error) =>
      error.reason._tag === "HttpError"
        ? {
            challenge: error.reason.wwwAuthenticate ?? "",
            status: error.reason.status,
          }
        : { challenge: "", status: 0 }
    )
  );

layer(McpFixtureLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "the MCP endpoint",
  (it) => {
    it.effect(
      "leads a client without a token to the authorization server",
      () =>
        Effect.gen(function* discovery() {
          const app = yield* TestApp;

          const refused = yield* refusedConnection(Option.none());

          assert.strictEqual(refused.status, 401);
          assert.include(
            refused.challenge,
            `resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp"`
          );

          const resource = yield* bodyOf(
            ProtectedResourceSchema,
            yield* app.request("/.well-known/oauth-protected-resource/api/mcp")
          );

          assert.strictEqual(resource.resource, mcpResource);
          assert.deepStrictEqual(resource.authorization_servers, [
            `${origin}/api/auth`,
          ]);

          const server = yield* bodyOf(
            AuthorizationServerSchema,
            yield* app.request(
              "/.well-known/oauth-authorization-server/api/auth"
            )
          );

          assert.strictEqual(
            server.registration_endpoint,
            `${origin}/api/auth/oauth2/register`
          );
        })
    );

    it.effect("refuses a token that is not one", () =>
      Effect.gen(function* forged() {
        const refused = yield* refusedConnection(
          Option.some("eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.c2ln")
        );

        assert.strictEqual(refused.status, 401);
        assert.include(refused.challenge, "resource_metadata=");
      })
    );

    it.effect("acts in the workspace the user picked, reading only", () =>
      Effect.gen(function* picked() {
        const fixture = yield* McpFixture;

        const token = yield* authorize(
          fixture.owner,
          fixture.clientId,
          fixture.studio,
          "openid offline_access workspace:read"
        );

        const results = yield* callTools.pipe(
          Effect.provide(connect(Option.some(token)))
        );

        assert.deepStrictEqual(results.names, [
          "list_channels",
          "list_workspaces",
          "server_health",
          "whoami",
        ]);
        assert.strictEqual(results.whoami.user.id, fixture.owner.id);
        assert.strictEqual(results.whoami.workspace.id, fixture.studio);
        assert.strictEqual(results.whoami.workspace.role, "owner");
        // The user agreed to reading only.
        assert.include(results.whoami.workspace.permissions, "channel:read");
        assert.notInclude(results.whoami.workspace.permissions, "post:publish");
        assert.deepStrictEqual(
          results.channels.channels.map(({ id }) => id),
          [fixture.studioChannel]
        );
        assert.deepStrictEqual(
          results.workspaces.workspaces
            .map(({ connected, id }) => ({ connected, id }))
            .toSorted((a, b) => a.id.localeCompare(b.id)),
          [
            { connected: true, id: fixture.studio },
            { connected: false, id: fixture.shop },
          ].toSorted((a, b) => a.id.localeCompare(b.id))
        );
        assert.deepStrictEqual(results.health, {
          database: "up",
          server: "up",
        });
      })
    );

    it.effect(
      "keeps a token for another workspace to that workspace, then refuses it once the user left",
      () =>
        Effect.gen(function* elsewhere() {
          const app = yield* TestApp;
          const fixture = yield* McpFixture;
          const workspace = yield* workspaceOf(fixture.owner, "Pop-up");

          const token = yield* authorize(
            fixture.owner,
            fixture.clientId,
            workspace,
            "openid workspace:read workspace:write"
          );

          // Over the sessionful revision as well.
          const results = yield* callTools.pipe(
            Effect.provide(connect(Option.some(token), McpProtocol.v2025_11_25))
          );

          assert.strictEqual(results.whoami.workspace.id, workspace);
          assert.include(results.whoami.workspace.permissions, "post:publish");
          assert.deepStrictEqual(results.channels.channels, []);

          const deleted = yield* app.request("/api/auth/organization/delete", {
            body: { organizationId: workspace },
            headers: { cookie: fixture.owner.cookies },
          });

          assert.strictEqual(deleted.status, 200);

          const refused = yield* refusedConnection(
            Option.some(token),
            McpProtocol.v2025_11_25
          );

          // Signing in again would not help: no challenge.
          assert.strictEqual(refused.status, 403);
          assert.strictEqual(refused.challenge, "");
        })
    );
  }
);
