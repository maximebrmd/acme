import { createHash, randomBytes } from "node:crypto";

import { assert } from "@effect/vitest";
import { PublicClientSchema } from "peal-contract";
import { Effect, Layer, Option, Schema } from "effect";
import { McpClient, McpProtocol } from "effect/ai";
import type { McpSchema } from "effect/ai";

import {
  bodyOf,
  inProcessHttpClient,
  origin,
  TestApp,
} from "#test/workspace/integration/harness.ts";
import type { Person, Reply } from "#test/workspace/integration/harness.ts";

// What MCP tests share: an MCP client registering itself, a user signing it
// in to one workspace through the browser steps, and the client calling the
// endpoint in process.

export const mcpResource = `${origin}/api/mcp`;

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

const clientName = "Synthetic agent";

/** An MCP client that registers itself (RFC 7591), with no account. */
export const registeredClient = Effect.gen(function* registeredClient() {
  const app = yield* TestApp;

  const registered = yield* app.request("/api/auth/oauth2/register", {
    body: {
      client_name: clientName,
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: [redirectUri],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
  });

  return (yield* bodyOf(RegisteredSchema, registered)).client_id;
});

/**
 * Signs `person` in to the MCP client through the browser steps: authorize,
 * the workspace picker, the consent page; then exchanges the code for an
 * access token bound to `workspaceId`.
 */
export const authorize = Effect.fn("authorize")(function* authorize(
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

  assert.strictEqual(described.client_name, clientName);

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

// An MCP client of the endpoint, in process, with the token if any. The fetch
// client reads its Fetch when each request runs, so both stay in context.
export const connect = (
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
    name: "peal-test",
    protocol,
    url: mcpResource,
    version: "1.0.0",
  }).pipe(Layer.provideMerge(inProcessHttpClient));

// A JSON-RPC request, as MCP clients send them.
export interface JsonRpcRequest {
  readonly id: number;
  readonly jsonrpc: "2.0";
  readonly method: string;
  readonly params?: object;
}

export const toolNamed = (tools: readonly McpSchema.Tool[], name: string) => {
  const found = tools.find((tool) => tool.name === name);

  if (found === undefined) {
    throw new Error(`The server offers no tool named ${name}`);
  }

  return found;
};
