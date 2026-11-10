// The hosted pages' endpoints: what whoever holds a link's token reads and
// does, without any other credential.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Redacted } from "effect";
import { Cookies, HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api, connectLinkTokenHeader } from "peal-contract";

import { HostedConnectHandlers } from "#channels/api/connect-links.ts";
import { mastodonInstance } from "#test/channels/connect-support.ts";
import { linked, LinksTest } from "#test/channels/link-support.ts";
import { anonymousSecurityTest } from "#workspace/api/security.ts";

// A client that sends no credential at all.
const makeClient = HttpApiTest.groups(Api, ["hostedConnect"]).pipe(
  Effect.provide(
    Layer.mergeAll(
      HostedConnectHandlers.pipe(Layer.provideMerge(anonymousSecurityTest)),
      HttpServer.layerServices
    )
  )
);

const tokenHeader = (token: string) => ({ [connectLinkTokenHeader]: token });

layer(LinksTest)("the hosted connect endpoints", (it) => {
  it.effect("show who asks, and nothing of the link's workspace", () =>
    Effect.gen(function* opens() {
      const client = yield* makeClient;
      const { link, token } = yield* linked();

      const opened = yield* client.hostedConnect.open({
        headers: tokenHeader(Redacted.value(token)),
      });

      assert.deepStrictEqual(opened, {
        expiresAt: link.expiresAt,
        host: {
          logoUrl: "https://cdn.example.test/logo.png",
          name: "Partner Suite",
        },
        input: "instance",
        platform: "mastodon",
        reconnecting: null,
        returnTo: `https://app.example.test/settings/social?tab=1&peal_link=${link.id}&peal_status=cancelled`,
        status: "pending",
      });

      const missing = yield* client.hostedConnect
        .open({ headers: tokenHeader("not-a-token") })
        .pipe(Effect.flip);

      assert.strictEqual(missing._tag, "ConnectLinkNotFound");
    })
  );

  it.effect(
    "give the browser that starts a cookie scripts cannot read, for these endpoints alone",
    () =>
      Effect.gen(function* starts() {
        const instance = yield* mastodonInstance();
        const client = yield* makeClient;
        const { token } = yield* linked();

        const response = yield* client.hostedConnect.start({
          headers: tokenHeader(Redacted.value(token)),
          payload: { instance: instance.url },
          responseMode: "response-only",
        });

        assert.strictEqual(response.status, 200);

        const [cookie = ""] = Cookies.toSetCookieHeaders(response.cookies);
        const [pair = "", ...attributes] = cookie.split("; ");

        assert.match(pair, /^peal_connect_link=[\w-]{43}$/u);
        assert.sameMembers(attributes, [
          "Path=/api/connect-links",
          "Max-Age=1800",
          "HttpOnly",
          "SameSite=Lax",
          "Secure",
        ]);

        // The body tells where to go, and nothing of the cookie.
        const body = yield* response.text;

        assert.include(body, "authorizationUrl");
        assert.notInclude(body, pair.slice("peal_connect_link=".length));
      }).pipe(Effect.scoped)
  );

  it.effect("complete nothing for a request without that cookie", () =>
    Effect.gen(function* withoutCookie() {
      const instance = yield* mastodonInstance();
      const client = yield* makeClient;
      const { token } = yield* linked();
      const headers = tokenHeader(Redacted.value(token));

      const started = yield* client.hostedConnect.start({
        headers,
        payload: { instance: instance.url },
      });

      const refused = yield* client.hostedConnect
        .complete({
          headers,
          payload: instance.approve(started.authorizationUrl),
        })
        .pipe(Effect.flip);

      assert.deepInclude(refused, {
        _tag: "HostedConnectFailed",
        reason: "invalidState",
      });
    }).pipe(Effect.scoped)
  );
});
