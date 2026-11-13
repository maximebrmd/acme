import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Result } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { Dns } from "effect/net";

import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import {
  publicFetch,
  publicHttpClient,
} from "#shared/infrastructure/platforms/public-http.ts";
import { fakeHttpServer, json } from "#test/channels/fakes/fake-http-server.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";

// Names as a resolver would answer them: public servers, and names that lead
// inside, as an attacker would set up.
const GuardTest = OutboundGuard.layer.pipe(
  Layer.provide(
    Dns.layerStatic({
      hosts: {
        "cloud-metadata.example": ["169.254.169.254"],
        "dual.example": ["93.184.215.14", "10.1.2.3"],
        "intranet.example": ["10.0.0.5"],
        "mapped.example": ["::ffff:127.0.0.1"],
        "mastodon.example": ["93.184.215.14", "2606:2800:21f:cb07::1"],
        "nat64.example": ["64:ff9b::a00:5"],
        "printer.example": ["fd12:3456:789a::1"],
        "shared.example": ["100.64.0.10"],
      },
    })
  )
);

const refusalOf = (url: string) =>
  OutboundGuard.use((guard) => guard.check(new URL(url))).pipe(
    Effect.flip,
    Effect.map((refused) => refused.reason)
  );

layer(GuardTest)("the outbound guard", (it) => {
  it.effect("lets HTTPS through to a host whose addresses are all public", () =>
    Effect.gen(function* publicHost() {
      const passed = yield* OutboundGuard.use((guard) =>
        guard.check(new URL("https://mastodon.example/api/v1/apps"))
      ).pipe(Effect.result);

      assert.isTrue(Result.isSuccess(passed));
    })
  );

  it.effect("refuses anything but HTTPS on the default port", () =>
    Effect.gen(function* insecure() {
      assert.strictEqual(
        yield* refusalOf("http://mastodon.example/"),
        "notHttps"
      );
      assert.strictEqual(
        yield* refusalOf("https://mastodon.example:8443/"),
        "notHttps"
      );
    })
  );

  it.effect("refuses addresses that are not public, written or resolved", () =>
    Effect.gen(function* privateHosts() {
      for (const url of [
        "https://127.0.0.1/",
        "https://[::1]/",
        "https://10.20.30.40/",
        "https://169.254.169.254/latest/meta-data/",
        "https://intranet.example/",
        "https://cloud-metadata.example/",
        "https://printer.example/",
        "https://mapped.example/",
        "https://nat64.example/",
        "https://shared.example/",
        // One private address among public ones is enough.
        "https://dual.example/",
      ]) {
        assert.strictEqual(yield* refusalOf(url), "notPublic", url);
      }
    })
  );

  it.effect("says when a name does not resolve", () =>
    Effect.gen(function* unknownHost() {
      assert.strictEqual(
        yield* refusalOf("https://nowhere.example/"),
        "unknownHost"
      );
    })
  );
});

// The client the guard protects, against a server on loopback: the guard
// refuses before anything is sent.
const ClientTest = Layer.mergeAll(GuardTest, FetchHttpClient.layer);

layer(ClientTest)("the public HTTP client", (it) => {
  it.effect("sends nothing to a host the guard refuses", () =>
    Effect.gen(function* refusesFirst() {
      const local = yield* fakeHttpServer(() => ({ status: 200 }));
      const client = yield* publicHttpClient;

      const failure = yield* client.get(`${local.url}/admin`).pipe(Effect.flip);

      assert.strictEqual(failure._tag, "OutboundRequestRefused");
      assert.lengthOf(local.requests(), 0);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "checks the address a library prepends on top of it, as it is sent",
    () =>
      Effect.gen(function* prepended() {
        const local = yield* fakeHttpServer(() => ({ status: 200 }));

        // A provider package's client: relative paths, its base prepended
        // by a mapping of its own over the client it is given.
        const client = (yield* publicHttpClient).pipe(
          HttpClient.mapRequest(HttpClientRequest.prependUrl(local.url))
        );

        const failure = yield* client.get("/v1/messages").pipe(Effect.flip);

        assert.strictEqual(failure._tag, "OutboundRequestRefused");
        assert.lengthOf(local.requests(), 0);
      }).pipe(Effect.scoped)
  );

  it.effect("rejects the fetch it gives libraries, the way fetch fails", () =>
    Effect.gen(function* fetchRefuses() {
      const local = yield* fakeHttpServer(() => ({ status: 200 }));
      const fetch = yield* publicFetch;

      const failure = yield* Effect.tryPromise(
        async () => await fetch(`${local.url}/admin`)
      ).pipe(Effect.flip);

      const cause = Option.fromUndefinedOr(
        failure.cause instanceof TypeError ? failure.cause.cause : undefined
      );

      assert.isTrue(Option.isSome(cause));
      assert.lengthOf(local.requests(), 0);
    }).pipe(Effect.scoped)
  );
});

// The same client and fetch against a fake on loopback, which only an open
// guard lets through: what they do with the answers a host sends back.
const OpenClientTest = Layer.mergeAll(OpenOutboundGuard, FetchHttpClient.layer);

// More than any platform answer Peal reads: a megabyte and a half.
const oversized = "x".repeat(1_572_864);

layer(OpenClientTest)("answers from a host a user chose", (it) => {
  it.effect("are not followed when they redirect", () =>
    Effect.gen(function* noRedirects() {
      const local = yield* fakeHttpServer((request, origin) =>
        request.path === "/start"
          ? { headers: { location: `${origin}/inside` }, status: 302 }
          : { status: 200 }
      );

      const client = yield* publicHttpClient;
      const fetch = yield* publicFetch;

      const answered = yield* client.get(`${local.url}/start`);

      const fetched = yield* Effect.promise(
        async () => await fetch(`${local.url}/start`, { redirect: "follow" })
      );

      assert.strictEqual(answered.status, 302);
      assert.strictEqual(fetched.status, 302);
      assert.deepStrictEqual(
        local.requests().map(({ path }) => path),
        ["/start", "/start"]
      );
    }).pipe(Effect.scoped)
  );

  it.effect("are cut off past what a platform sends", () =>
    Effect.gen(function* tooLarge() {
      const local = yield* fakeHttpServer(() => json(oversized));
      const client = yield* publicHttpClient;
      const fetch = yield* publicFetch;

      const read = yield* client.get(`${local.url}/large`).pipe(
        Effect.flatMap((response) => response.text),
        Effect.result
      );

      const fetched = yield* Effect.tryPromise(async () => {
        const response = await fetch(`${local.url}/large`);

        return await response.text();
      }).pipe(Effect.result);

      assert.isTrue(Result.isFailure(read));
      assert.isTrue(Result.isFailure(fetched));
    }).pipe(Effect.scoped)
  );

  it.effect("are read whole when they are of a platform's size", () =>
    Effect.gen(function* small() {
      const local = yield* fakeHttpServer(() => json({ ok: true }));
      const client = yield* publicHttpClient;
      const fetch = yield* publicFetch;

      const read = yield* client
        .get(`${local.url}/small`)
        .pipe(Effect.flatMap((response) => response.text));

      const fetched = yield* Effect.promise(async () => {
        const response = await fetch(`${local.url}/small`);

        return await response.text();
      });

      assert.strictEqual(read, '{"ok":true}');
      assert.strictEqual(fetched, '{"ok":true}');
    }).pipe(Effect.scoped)
  );

  it.effect("tell the host nothing of Peal's traces", () =>
    Effect.gen(function* noTraceContext() {
      const local = yield* fakeHttpServer(() => ({ status: 204 }));
      const client = yield* publicHttpClient;

      yield* client.get(`${local.url}/traced`);

      const [received] = local.requests();

      assert.isUndefined(received?.headers["traceparent"]);
      assert.isUndefined(received?.headers["b3"]);
    }).pipe(Effect.scoped)
  );
});
