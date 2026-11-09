import { assert, layer } from "@effect/vitest";
import { deviceCodeGrantType, MeSchema, OAuthApi } from "acme-contract";
import { Effect, Layer, Schema } from "effect";
import { HttpApiClient } from "effect/http-api";

import {
  bodyOf,
  cookiesOf,
  inProcessHttpClient,
  newEmail,
  origin,
  password,
  TestApp,
  unconfirmedEmails,
} from "./harness.ts";

// A server self-hosted on a home network, at a plain HTTP address that is
// not this machine's: MCP clients cannot sign in there, but the server
// starts, and the command line signs in as it does anywhere.

const publicUrl = "http://192.168.1.20:3001";

// What the web app at PUBLIC_URL sends.
const fromPublicUrl = { origin: publicUrl };

const SignedUpSchema = Schema.Struct({
  user: Schema.Struct({ id: Schema.String }),
});

const PlainHttpLive = inProcessHttpClient.pipe(
  Layer.provideMerge(
    TestApp.layerWith({ ...unconfirmedEmails, PUBLIC_URL: publicUrl })
  )
);

layer(PlainHttpLive, { excludeTestServices: true, timeout: "120 seconds" })(
  "a server at a plain HTTP address on the network",
  (it) => {
    it.effect("starts, and signs the command line in", () =>
      Effect.gen(function* plainHttp() {
        const app = yield* TestApp;
        const oauth = yield* HttpApiClient.make(OAuthApi, { baseUrl: origin });

        assert.strictEqual((yield* app.request("/api/health")).status, 204);

        const created = yield* app.request("/api/auth/sign-up/email", {
          body: {
            email: newEmail("home-network"),
            locale: "en",
            name: "Home network",
            password,
          },
          headers: fromPublicUrl,
        });

        const { user } = yield* bodyOf(SignedUpSchema, created);
        const cookie = cookiesOf(created);

        const { resource } = yield* oauth.discovery.apiResource();

        assert.strictEqual(resource, `${publicUrl}/api`);

        const device = yield* oauth.tokens.deviceAuthorization({
          payload: {
            client_id: "acme-cli",
            resource,
            scope: "offline_access workspace:read workspace:write",
          },
        });

        yield* app.request(`/api/auth/device?user_code=${device.user_code}`, {
          headers: { cookie, ...fromPublicUrl },
        });

        const approved = yield* app.request("/api/auth/device/approve", {
          body: { userCode: device.user_code },
          headers: { cookie, ...fromPublicUrl },
        });

        assert.strictEqual(approved.status, 200);

        const tokens = yield* oauth.tokens.token({
          payload: {
            client_id: "acme-cli",
            device_code: device.device_code,
            grant_type: deviceCodeGrantType,
          },
        });

        const me = yield* bodyOf(
          MeSchema,
          yield* app.request("/api/me", {
            headers: { authorization: `Bearer ${tokens.access_token}` },
          })
        );

        assert.strictEqual(me.user.id, user.id);
      })
    );

    it.effect("issues no token for its MCP endpoint", () =>
      Effect.gen(function* noMcp() {
        const app = yield* TestApp;
        const oauth = yield* HttpApiClient.make(OAuthApi, { baseUrl: origin });

        const forMcp = yield* oauth.tokens
          .deviceAuthorization({
            payload: {
              client_id: "acme-cli",
              resource: `${publicUrl}/api/mcp`,
              scope: "workspace:read",
            },
          })
          .pipe(Effect.flip);

        assert.include(JSON.stringify(forMcp), "invalid_target");

        const mcp = yield* app.request("/api/mcp", {
          body: { id: 1, jsonrpc: "2.0", method: "tools/list" },
          headers: { accept: "application/json, text/event-stream" },
        });

        assert.strictEqual(mcp.status, 401);
      })
    );
  }
);
