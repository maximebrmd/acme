import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Redacted } from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import type {
  AuthorizationCallback,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { ConnectAttempt } from "#channels/domain/connect-attempt.ts";
import { facebookAuthorizer } from "#channels/infrastructure/platforms/meta/facebook-authorizer.ts";
import { instagramAuthorizer } from "#channels/infrastructure/platforms/meta/instagram-authorizer.ts";
import { instagramLoginAuthorizer } from "#channels/infrastructure/platforms/meta/instagram-login-authorizer.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { InboxPlatforms } from "#shared/domain/inbox-platform.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import { testPublicUrl } from "#test/channels/connect-support.ts";
import {
  fakeInstagram,
  instagramPermissions,
} from "#test/channels/fakes/fake-instagram.ts";
import {
  fakeMeta,
  instagramApp,
  metaApp,
} from "#test/channels/fakes/fake-meta.ts";
import type { FakePage } from "#test/channels/fakes/fake-meta.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";

// What Facebook Login and Instagram Login ask for, with the inbox's
// optional platforms off and on: off, exactly what they asked before the
// inbox read Meta; on, the comment permissions too, which a member may
// decline and still connect.

const off: InboxPlatforms = new Set();

const on: InboxPlatforms = new Set(["facebook", "instagram"]);

const page: FakePage = {
  id: "102000000000001",
  instagram: {
    id: "17841400000000001",
    name: "Synthetic Studio",
    username: "synthetic_studio",
  },
  name: "Synthetic Page",
  tasks: ["CREATE_CONTENT", "MANAGE", "MODERATE"],
  username: "syntheticpage",
};

const begun = {
  handle: Option.none(),
  instance: Option.none(),
  reconnecting: Option.none(),
};

const Services = Layer.mergeAll(
  FetchHttpClient.layer,
  OpenOutboundGuard,
  Mac.layerWebCrypto
).pipe(Layer.provideMerge(SecureRandom.layerWebCrypto));

// The authorizers as the server builds them for `inbox`, against fakes.
const authorizers = Effect.fnUntraced(function* authorizers(
  inbox: InboxPlatforms
) {
  const meta = yield* fakeMeta();
  const instagram = yield* fakeInstagram();
  const http = yield* publicHttpClient;

  meta.setPages([page]);

  const options = (app: typeof metaApp) => ({
    app,
    hosts: instagram.hostsOver(meta.hosts),
    http,
    inbox,
    publicUrl: testPublicUrl,
  });

  return {
    facebook: yield* facebookAuthorizer(options(metaApp)),
    instagram,
    instagramLogin: yield* instagramLoginAuthorizer(options(instagramApp)),
    instagramPage: yield* instagramAuthorizer(options(metaApp)),
    meta,
  };
});

const scopeOf = (authorizer: PlatformAuthorizer) =>
  authorizer
    .begin(begun)
    .pipe(
      Effect.map(({ authorizationUrl }) =>
        new URL(authorizationUrl).searchParams.get("scope")
      )
    );

// The member signs in on `authorizer`'s page and comes back approved.
const signIn = Effect.fnUntraced(function* signIn(
  authorizer: PlatformAuthorizer,
  approve: (url: string) => { readonly code: string; readonly state: string }
) {
  const { authorizationUrl } = yield* authorizer.begin(begun);
  const back = approve(authorizationUrl);
  const now = DateTime.makeUnsafe("2026-11-12T09:00:00.000Z");

  const callback: AuthorizationCallback = {
    code: Option.some(back.code),
    error: Option.none(),
    issuer: Option.none(),
    state: back.state,
  };

  return yield* authorizer.complete({
    attempt: new ConnectAttempt({
      channelId: Option.none(),
      connection: Option.fromUndefinedOr(authorizer.connection),
      createdAt: now,
      expiresAt: DateTime.addDuration(now, "15 minutes"),
      instance: Option.none(),
      platform: authorizer.platform,
      startedBy: "user:synthetic",
      state: back.state,
      workspaceId: WorkspaceIdSchema.make(
        "01900000-0000-7000-8000-0000000000f1"
      ),
    }),
    callback,
    reconnecting: Option.none(),
    secret: Redacted.make(""),
  });
});

describe("the comment permissions at sign-in", () => {
  it.effect("are not asked where the inbox does not read Meta", () =>
    Effect.gen(function* notAsked() {
      const built = yield* authorizers(off);

      assert.strictEqual(
        yield* scopeOf(built.facebook),
        "pages_show_list,pages_read_engagement,pages_manage_posts"
      );
      assert.strictEqual(
        yield* scopeOf(built.instagramPage),
        "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,instagram_manage_insights"
      );
      assert.strictEqual(
        yield* scopeOf(built.instagramLogin),
        "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights"
      );
    }).pipe(Effect.scoped, Effect.provide(Services))
  );

  it.effect("are asked, as optional, where it does", () =>
    Effect.gen(function* asked() {
      const built = yield* authorizers(on);

      assert.strictEqual(
        yield* scopeOf(built.facebook),
        "pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content,pages_manage_engagement"
      );
      assert.strictEqual(
        yield* scopeOf(built.instagramPage),
        "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,instagram_manage_insights,instagram_manage_comments"
      );
      assert.strictEqual(
        yield* scopeOf(built.instagramLogin),
        "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights,instagram_business_manage_comments"
      );
      // Only where the server reads the platform.
      const facebookOnly = yield* authorizers(new Set(["facebook"]));

      assert.notInclude(
        (yield* scopeOf(facebookOnly.instagramPage)) ?? "",
        "comments"
      );
    }).pipe(Effect.scoped, Effect.provide(Services))
  );

  it.effect("connect a Page whose member declined them", () =>
    Effect.gen(function* declined() {
      const built = yield* authorizers(on);

      built.meta.setDeclined([
        "pages_read_user_content",
        "pages_manage_engagement",
      ]);

      const outcome = yield* signIn(built.facebook, built.meta.approve);

      const [account] = "accounts" in outcome ? outcome.accounts : [];

      assert.isDefined(account);
      assert.notInclude(
        account?.tokens.scopes ?? [],
        "pages_manage_engagement"
      );
      assert.include(account?.tokens.scopes ?? [], "pages_manage_posts");
    }).pipe(Effect.scoped, Effect.provide(Services))
  );

  it.effect("connect an Instagram Login account that declined them", () =>
    Effect.gen(function* declined() {
      const built = yield* authorizers(on);

      built.instagram.setGranted([...instagramPermissions]);

      const outcome = yield* signIn(
        built.instagramLogin,
        built.instagram.approve
      );

      assert.deepStrictEqual("tokens" in outcome ? outcome.tokens.scopes : [], [
        ...instagramPermissions,
      ]);
    }).pipe(Effect.scoped, Effect.provide(Services))
  );
});
