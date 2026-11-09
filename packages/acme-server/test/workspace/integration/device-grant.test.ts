import { assert, layer } from "@effect/vitest";
import { deviceCodeGrantType, MeSchema, OAuthApi } from "acme-contract";
import { Context, Effect, Layer } from "effect";
import { HttpApiClient } from "effect/http-api";

import {
  bodyOf,
  inProcessHttpClient,
  origin,
  signedUpUnconfirmed as signedUp,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "./harness.ts";
import type { Person } from "./harness.ts";

// The command line's sign-in, end to end: it asks for a code, the user
// approves it on the web app (here, its Better Auth routes), and the command
// line polls for tokens, which then work on the HTTP API. Every OAuth call
// goes through acme-contract's OAuthApi client, as the command line's do.

const apiResource = `${origin}/api`;

const scope = "offline_access workspace:read workspace:write";

class OAuth extends Context.Service<
  OAuth,
  HttpApiClient.ForApi<typeof OAuthApi>
>()("acme-server/test/OAuth") {
  // The fetch client reads its Fetch when each request runs, so it stays in
  // the tests' context.
  static readonly layer = Layer.effect(
    OAuth,
    HttpApiClient.make(OAuthApi, { baseUrl: origin })
  ).pipe(Layer.provideMerge(inProcessHttpClient));
}

// Email confirmation is not what these tests are about.
const DeviceGrantLive = OAuth.layer.pipe(
  Layer.provideMerge(TestApp.layerWith(unconfirmedEmails))
);

const startSignIn = Effect.gen(function* startSignIn() {
  const oauth = yield* OAuth;

  return yield* oauth.tokens.deviceAuthorization({
    payload: { client_id: "acme-cli", resource: apiResource, scope },
  });
});

const poll = (deviceCode: string) =>
  OAuth.use((oauth) =>
    oauth.tokens.token({
      payload: {
        client_id: "acme-cli",
        device_code: deviceCode,
        grant_type: deviceCodeGrantType,
      },
    })
  );

// What a refused token request answers, as its OAuth error code.
const refusal = <A, E, R>(request: Effect.Effect<A, E, R>) =>
  request.pipe(
    Effect.flip,
    Effect.map((failure) => JSON.stringify(failure))
  );

// The user code as people type it, in two groups of four.
const typed = (userCode: string) =>
  `${userCode.slice(0, 4)}-${userCode.slice(4)}`.toLowerCase();

const review = (person: Person, userCode: string) =>
  TestApp.use((app) =>
    app.request(`/api/auth/device?user_code=${typed(userCode)}`, {
      headers: { cookie: person.cookies },
    })
  );

const decide = (
  person: Person,
  decision: "approve" | "deny",
  userCode: string
) =>
  TestApp.use((app) =>
    app.request(`/api/auth/device/${decision}`, {
      body: { userCode },
      headers: { cookie: person.cookies },
    })
  );

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

layer(DeviceGrantLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "the command line's sign-in",
  (it) => {
    it.effect("is discoverable from the API's address", () =>
      Effect.gen(function* discovery() {
        const oauth = yield* OAuth;

        const resource = yield* oauth.discovery.apiResource();
        const server = yield* oauth.discovery.authorizationServer();

        assert.strictEqual(resource.resource, apiResource);
        assert.deepStrictEqual(resource.authorization_servers, [
          `${origin}/api/auth`,
        ]);
        assert.strictEqual(server.issuer, `${origin}/api/auth`);
        assert.strictEqual(
          server.device_authorization_endpoint,
          `${origin}/api/auth/device/code`
        );
        assert.strictEqual(
          server.token_endpoint,
          `${origin}/api/auth/oauth2/token`
        );
        // MCP clients may not register themselves unless the server says so.
        assert.isUndefined(server.registration_endpoint);
      })
    );

    it.effect(
      "issues tokens for a code the user approved, which act as them",
      () =>
        Effect.gen(function* signsIn() {
          const app = yield* TestApp;
          const oauth = yield* OAuth;
          const owner = yield* signedUp("terminal");
          const workspaceId = yield* workspaceOf(owner, "Studio");

          const device = yield* startSignIn;

          assert.strictEqual(device.verification_uri, `${origin}/device`);
          assert.strictEqual(device.expires_in, 600);
          assert.strictEqual(device.interval, 5);

          assert.include(
            yield* refusal(poll(device.device_code)),
            "authorization_pending"
          );
          // Asking again before the interval is up is too soon.
          assert.include(yield* refusal(poll(device.device_code)), "slow_down");

          const approved = yield* startSignIn;
          const reviewed = yield* review(owner, approved.user_code);

          assert.strictEqual(reviewed.status, 200);
          assert.deepInclude(reviewed.body, {
            client_id: "acme-cli",
            resource: apiResource,
            scope,
            status: "pending",
          });

          assert.strictEqual(
            (yield* decide(owner, "approve", approved.user_code)).status,
            200
          );

          const tokens = yield* poll(approved.device_code);

          assert.strictEqual(tokens.token_type, "Bearer");
          assert.strictEqual(tokens.expires_in, 900);
          assert.strictEqual(tokens.scope, scope);
          assert.isString(tokens.refresh_token);

          const me = yield* bodyOf(
            MeSchema,
            yield* app.request("/api/me", {
              headers: bearer(tokens.access_token),
            })
          );

          assert.strictEqual(me.user.id, owner.id);
          assert.deepStrictEqual(
            me.workspaces.map(({ id }) => id),
            [workspaceId]
          );
          assert.include(me.workspaces[0]?.permissions ?? [], "post:publish");

          const channels = yield* app.request(
            `/api/workspaces/${workspaceId}/channels`,
            { headers: bearer(tokens.access_token) }
          );

          assert.strictEqual(channels.status, 200);

          // A code works once.
          assert.include(yield* refusal(poll(approved.device_code)), "invalid");

          // Refresh tokens are rotated: each renews the tokens once.
          const renew = (refreshToken: string | undefined) =>
            oauth.tokens.token({
              payload: {
                client_id: "acme-cli",
                grant_type: "refresh_token",
                refresh_token: refreshToken ?? "",
              },
            });

          const renewed = yield* renew(tokens.refresh_token);

          const meAgain = yield* app.request("/api/me", {
            headers: bearer(renewed.access_token),
          });

          assert.strictEqual(meAgain.status, 200);

          // Signing out revokes the refresh token.
          yield* oauth.tokens.revoke({
            payload: {
              client_id: "acme-cli",
              token: renewed.refresh_token ?? "",
              token_type_hint: "refresh_token",
            },
          });

          assert.include(
            yield* refusal(renew(renewed.refresh_token)),
            "invalid_grant"
          );
          assert.include(
            yield* refusal(renew(tokens.refresh_token)),
            "invalid_grant"
          );
        })
    );

    it.effect("acts only where its user belongs, and only on the API", () =>
      Effect.gen(function* scoped() {
        const app = yield* TestApp;
        const owner = yield* signedUp("scoped");
        const stranger = yield* signedUp("stranger");
        const othersWorkspace = yield* workspaceOf(stranger, "Elsewhere");

        const device = yield* startSignIn;

        yield* review(owner, device.user_code);
        yield* decide(owner, "approve", device.user_code);

        const { access_token: token } = yield* poll(device.device_code);

        const elsewhere = yield* app.request(
          `/api/workspaces/${othersWorkspace}/channels`,
          { headers: bearer(token) }
        );

        assert.strictEqual(elsewhere.status, 404);

        // The MCP endpoint takes tokens issued for it, bound to a workspace.
        const mcp = yield* app.request("/api/mcp", {
          body: { id: 1, jsonrpc: "2.0", method: "tools/list" },
          headers: {
            accept: "application/json, text/event-stream",
            ...bearer(token),
          },
        });

        assert.strictEqual(mcp.status, 401);
        assert.include(
          mcp.headers.get("www-authenticate") ?? "",
          `resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp"`
        );

        // Nor may the command line ask for one.
        const forMcp = yield* refusal(
          OAuth.use((oauth) =>
            oauth.tokens.deviceAuthorization({
              payload: {
                client_id: "acme-cli",
                resource: `${origin}/api/mcp`,
                scope,
              },
            })
          )
        );

        assert.include(forMcp, "invalid_target");

        const forged = yield* app.request("/api/me", {
          headers: bearer("eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.c2ln"),
        });

        assert.strictEqual(forged.status, 401);
      })
    );

    it.effect("refuses a token that grants no workspace scope", () =>
      Effect.gen(function* identityOnly() {
        const app = yield* TestApp;
        const oauth = yield* OAuth;
        const owner = yield* signedUp("identity-only");

        // Anyone may start a sign-in as the command line, asking for less.
        const device = yield* oauth.tokens.deviceAuthorization({
          payload: {
            client_id: "acme-cli",
            resource: apiResource,
            scope: "offline_access",
          },
        });

        yield* review(owner, device.user_code);
        yield* decide(owner, "approve", device.user_code);

        const { access_token: token } = yield* poll(device.device_code);

        const me = yield* app.request("/api/me", { headers: bearer(token) });

        assert.strictEqual(me.status, 401);
      })
    );

    it.effect("refuses a code its user denied", () =>
      Effect.gen(function* denied() {
        const owner = yield* signedUp("denier");
        const device = yield* startSignIn;

        yield* review(owner, device.user_code);

        assert.strictEqual(
          (yield* decide(owner, "deny", device.user_code)).status,
          200
        );
        assert.include(
          yield* refusal(poll(device.device_code)),
          "access_denied"
        );
      })
    );

    it.effect("lets only the first person to open a code approve it", () =>
      Effect.gen(function* claimed() {
        const owner = yield* signedUp("claimer");
        const intruder = yield* signedUp("intruder");
        const device = yield* startSignIn;

        yield* review(owner, device.user_code);

        const peek = yield* review(intruder, device.user_code);

        assert.strictEqual(peek.status, 200);
        assert.notProperty(peek.body, "client_id");
        assert.strictEqual(
          (yield* decide(intruder, "approve", device.user_code)).status,
          403
        );
        assert.include(
          yield* refusal(poll(device.device_code)),
          "authorization_pending"
        );
      })
    );
  }
);
