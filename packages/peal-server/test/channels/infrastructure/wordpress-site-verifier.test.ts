// A WordPress site is checked on its own REST API before it is connected:
// discovery finds the API's root, the index says it is WordPress, and the
// current user says what the application password lets Peal do.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Redacted } from "effect";
import { FetchHttpClient } from "effect/http";
import { Dns } from "effect/net";

import { SiteVerifier } from "#channels/application/site-verifier.ts";
import { WordPressSiteVerifierLive } from "#channels/infrastructure/platforms/wordpress/wordpress-site-verifier.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { fakeHttpServer, json } from "#test/channels/fakes/fake-http-server.ts";
import {
  contributor,
  editor,
  fakeWordPress,
} from "#test/channels/fakes/fake-wordpress.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";

const VerifierTest = WordPressSiteVerifierLive.pipe(
  Layer.provide(Layer.mergeAll(FetchHttpClient.layer, OpenOutboundGuard))
);

const signInAs = (
  address: string,
  user: { readonly login: string; readonly password: string } = editor
) => ({
  address,
  applicationPassword: Redacted.make(user.password),
  platform: "wordpress" as const,
  userName: user.login,
});

const verify = (address: string, user?: Parameters<typeof signInAs>[1]) =>
  SiteVerifier.use((verifier) => verifier.verify(signInAs(address, user)));

layer(VerifierTest)("checking a WordPress site", (it) => {
  it.effect("finds the API's root from the home page and reads the site", () =>
    Effect.gen(function* found() {
      const site = yield* fakeWordPress();

      const verified = yield* verify(site.home);

      assert.strictEqual(verified.accountId, site.root);
      assert.strictEqual(verified.handle, new URL(site.home).host);
      assert.deepStrictEqual(
        verified.displayName,
        Option.some("Synthetic Garden Journal")
      );
      assert.includeMembers(
        [...verified.scopes],
        ["publish_posts", "upload_files"]
      );

      const me = site
        .requests()
        .find(({ route }) => route === "/wp/v2/users/me");

      assert.strictEqual(me?.query.get("context"), "edit");
      assert.isTrue(me?.authorization?.startsWith("Basic "));
    })
  );

  it.effect("reads a site without pretty permalinks through rest_route", () =>
    Effect.gen(function* plain() {
      const site = yield* fakeWordPress({ pretty: false });

      const verified = yield* verify(site.home);

      assert.strictEqual(verified.accountId, site.root);
      assert.include(verified.accountId, "rest_route=");
    })
  );

  it.effect("keeps a site below a path as its home says", () =>
    Effect.gen(function* below() {
      const site = yield* fakeWordPress({ home: "/blog/" });

      const verified = yield* verify(site.home);

      assert.strictEqual(verified.handle, `${new URL(site.home).host}/blog`);
    })
  );

  it.effect("tries /wp-json/ when the home page names no root", () =>
    Effect.gen(function* unnamed() {
      const site = yield* fakeWordPress({ linkHeader: false });

      const verified = yield* verify(site.home);

      assert.strictEqual(verified.accountId, site.root);
    })
  );

  it.effect("refuses an address that leads to no WordPress", () =>
    Effect.gen(function* notWordPress() {
      const other = yield* fakeHttpServer(() => json({ hello: "world" }, 404));

      const refused = yield* verify(other.url).pipe(Effect.flip);

      assert.deepStrictEqual(refused._tag, "SiteRefused");
      assert.strictEqual(
        refused._tag === "SiteRefused" ? refused.reason : undefined,
        "notWordPress"
      );
    })
  );

  it.effect("refuses a password the site refuses", () =>
    Effect.gen(function* wrong() {
      const site = yield* fakeWordPress();

      const refused = yield* verify(site.home, {
        login: "editor",
        password: "synthetic wrong",
      }).pipe(Effect.flip);

      assert.strictEqual(
        refused._tag === "SiteRefused" ? refused.reason : undefined,
        "credentialsRefused"
      );
    })
  );

  it.effect("refuses a user who may not publish", () =>
    Effect.gen(function* writerOnly() {
      const site = yield* fakeWordPress();

      const refused = yield* verify(site.home, contributor).pipe(Effect.flip);

      assert.strictEqual(
        refused._tag === "SiteRefused" ? refused.reason : undefined,
        "cannotPublish"
      );
    })
  );

  it.effect("waits for a site that fails on its side", () =>
    Effect.gen(function* down() {
      const site = yield* fakeWordPress({
        intercept: ({ route }) =>
          route === "/wp/v2/users/me"
            ? { body: { code: "internal" }, status: 503 }
            : undefined,
      });

      const refused = yield* verify(site.home).pipe(Effect.flip);

      assert.strictEqual(refused._tag, "PlatformUnavailable");
    })
  );
});

// The real guard: a site members name is reached at public addresses only.
const GuardedTest = WordPressSiteVerifierLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      FetchHttpClient.layer,
      OutboundGuard.layer.pipe(
        Layer.provide(
          Dns.layerStatic({ hosts: { "intranet.example": ["10.0.0.5"] } })
        )
      )
    )
  )
);

layer(GuardedTest)("a site on a private address", (it) => {
  it.effect("is refused before anything is sent", () =>
    Effect.gen(function* inside() {
      const refused = yield* verify("intranet.example").pipe(Effect.flip);

      assert.strictEqual(
        refused._tag === "SiteRefused" ? refused.reason : undefined,
        "addressNotAllowed"
      );
    })
  );
});
