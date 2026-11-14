import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Effect, Layer, Result } from "effect";
import { Dns } from "effect/net";

import {
  OutboundGuard,
  allowedHostsConfig,
} from "#shared/infrastructure/platforms/outbound-guard.ts";

const resolved = {
  "blog.lan": ["192.168.1.20"],
  "intranet.example": ["10.0.0.5"],
};

// The guard as a self-hoster sets it up, with a site on their own network.
const AllowingTest = OutboundGuard.layer.pipe(
  Layer.provide(Dns.layerStatic({ hosts: resolved })),
  Layer.provide(
    ConfigProvider.layer(
      ConfigProvider.fromEnv({
        env: { PEAL_OUTBOUND_ALLOWED_HOSTS: " Blog.LAN , 10.9.8.7 " },
      })
    )
  )
);

// The setting as the server reads it from this value.
const read = (value: string | undefined) =>
  allowedHostsConfig.pipe(
    Effect.provide(
      ConfigProvider.layer(
        ConfigProvider.fromEnv({
          env:
            value === undefined ? {} : { PEAL_OUTBOUND_ALLOWED_HOSTS: value },
        })
      )
    ),
    Effect.result
  );

const checked = (url: string) =>
  OutboundGuard.use((guard) => guard.check(new URL(url))).pipe(Effect.result);

layer(AllowingTest)("hosts the operator allows", (it) => {
  it.effect("are reached on a private address, by name or literal", () =>
    Effect.gen(function* allowed() {
      assert.isTrue(
        Result.isSuccess(yield* checked("https://blog.lan/wp-json/"))
      );
      assert.isTrue(Result.isSuccess(yield* checked("https://10.9.8.7/")));
    })
  );

  it.effect("still need HTTPS on the default port", () =>
    Effect.gen(function* insecure() {
      const refused = yield* checked("http://blog.lan/").pipe(
        Effect.map(Result.getFailure)
      );

      assert.strictEqual(
        refused._tag === "Some" ? refused.value.reason : "none",
        "notHttps"
      );
    })
  );

  it.effect("leave every other private host refused", () =>
    Effect.gen(function* others() {
      const refused = yield* checked("https://intranet.example/").pipe(
        Effect.map(Result.getFailure)
      );

      assert.strictEqual(
        refused._tag === "Some" ? refused.value.reason : "none",
        "notPublic"
      );
    })
  );

  it.effect("is empty unless set", () =>
    Effect.gen(function* unset() {
      for (const value of [undefined, " "]) {
        const hosts = yield* read(value);

        assert.deepStrictEqual(
          Result.isSuccess(hosts) ? [...hosts.success] : undefined,
          []
        );
      }
    })
  );

  it.effect("refuses an address, a port or a wildcard rather than a host", () =>
    Effect.gen(function* malformed() {
      for (const value of [
        "https://blog.lan",
        "blog.lan:8443",
        "*.lan",
        "a b",
      ]) {
        assert.isTrue(Result.isFailure(yield* read(value)), value);
      }
    })
  );
});
