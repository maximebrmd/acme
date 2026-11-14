import { Context, Effect, Layer, Option, Redacted, Ref } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { ConnectLinkAddresses } from "#channels/application/connect-link-addresses.ts";
import { ConnectLinkJournal } from "#channels/application/connect-link-journal.ts";
import { ConnectLinks } from "#channels/application/connect-links.ts";
import type { NewConnectLink } from "#channels/application/connect-links.ts";
import { LinkHosts } from "#channels/application/link-hosts.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type { PlatformAuthorizer } from "#channels/application/platform-authorizer.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { tokenPolicies } from "#channels/domain/token-policy.ts";
import { DrizzleConnectLinkStore } from "#channels/infrastructure/drizzle-connect-link-store.ts";
import { MastodonApps } from "#channels/infrastructure/platforms/mastodon/mastodon-apps.ts";
import { mastodonAuthorizer } from "#channels/infrastructure/platforms/mastodon/mastodon-authorizer.ts";
import { RandomConnectLinkTokens } from "#channels/infrastructure/random-connect-link-tokens.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { InstagramConnection } from "#shared/domain/instagram-connection.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import {
  authorizersOf,
  connectChannelWith,
  testPublicUrl,
} from "#test/channels/connect-support.ts";
import {
  actorIn,
  freshWorkspace,
  OpenOutboundGuard,
} from "#test/channels/support.ts";
// Connect links on the test database, with a fake Mastodon instance to
// sign in at: for the tests of their use cases and of their endpoints.
import { TransactionsTest } from "#test/notifications/support.ts";

/** What the links told the activity log they connected, oldest first. */
export interface LinkConnection {
  readonly channelIds: readonly string[];
  readonly linkId: string;
  readonly step: string;
  readonly workspaceId: string;
}

export class LinkConnections extends Context.Service<
  LinkConnections,
  Ref.Ref<readonly LinkConnection[]>
>()("peal-server/test/LinkConnections") {}

// A journal that keeps in memory what it is told.
const RememberedConnections = Layer.effect(
  ConnectLinkJournal,
  Effect.gen(function* remembered() {
    const kept = yield* LinkConnections;

    return ConnectLinkJournal.of({
      connected: (link, channelIds, step) =>
        Ref.update(kept, (all) => [
          ...all,
          { channelIds, linkId: link.id, step, workspaceId: link.workspaceId },
        ]),
    });
  })
).pipe(
  Layer.provideMerge(
    Layer.effect(LinkConnections, Ref.make<readonly LinkConnection[]>([]))
  )
);

/** Where a fake platform's sign-in page is: its state in the query. */
export const fakeSignIn = (platform: Platform) =>
  `https://${platform}.example.test/authorize`;

// A platform whose sign-in always connects the account its callback's
// code names, without asking anything first: for links of several
// platforms beside Mastodon's fake instance.
const fakeAuthorizer = (
  platform: Platform,
  connection?: InstagramConnection
): PlatformAuthorizer => {
  const authorizer: PlatformAuthorizer = {
    begin: () =>
      Effect.sync(() => {
        const state = `synthetic-${platform}-${globalThis.crypto.randomUUID()}`;

        return {
          authorizationUrl: `${fakeSignIn(platform)}?state=${state}`,
          instance: Option.none(),
          secret: Redacted.make("synthetic-secret"),
          state,
        };
      }),
    complete: ({ callback }) =>
      Effect.succeed({
        accountId: `${platform}-${Option.getOrElse(callback.code, () => "account")}`,
        avatarUrl: Option.none(),
        displayName: Option.none(),
        handle: `synthetic.${platform}`,
        tokens: {
          accessToken: Redacted.make("synthetic-access-token"),
          expiresAt: Option.none(),
          refreshToken: Option.none(),
          renewable: false,
          scopes: [],
        },
      }),
    platform,
    policy: tokenPolicies.threads,
    refresh: () => Effect.die(new Error("A fake sign-in renews nothing")),
  };

  return connection === undefined ? authorizer : { ...authorizer, connection };
};

// Mastodon on its fake instance, Threads, and Instagram through Instagram
// Login only.
const LinkAuthorizersTest = Layer.effect(
  PlatformAuthorizers,
  Effect.gen(function* LinkAuthorizersTest() {
    const http = yield* publicHttpClient;

    return authorizersOf(
      yield* mastodonAuthorizer({ http, publicUrl: testPublicUrl }),
      fakeAuthorizer("threads"),
      fakeAuthorizer("instagram", "instagramLogin")
    );
  })
).pipe(
  Layer.provide(MastodonApps.layer),
  Layer.provide(
    Layer.mergeAll(
      FetchHttpClient.layer,
      SecureRandom.layerWebCrypto,
      Digest.layerWebCrypto
    )
  )
);

/** Where the links' pages are, in these tests. */
export const pages = "https://peal.test/connect/link#";

/**
 * The origins the partner has registered, which a test empties to stand
 * for one removed since a link was made.
 */
export const partnerOrigins = ["https://app.example.test"];

/**
 * ConnectLinks with the real store and tokens, under a partner named
 * Partner Suite that returns to https://app.example.test, connecting
 * Mastodon (a fake instance), Threads and Instagram (fakes that connect
 * whatever their callback names).
 */
export const LinksTest = ConnectLinks.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleConnectLinkStore,
      TransactionsTest,
      RememberedConnections,
      RandomConnectLinkTokens,
      Layer.succeed(
        ConnectLinkAddresses,
        ConnectLinkAddresses.of({
          pageOf: (token) => `${pages}${Redacted.value(token)}`,
          secure: true,
        })
      ),
      LinkHosts.layerTest(
        {
          accentColor: Option.some("#166534"),
          logoUrl: Option.some("https://cdn.example.test/logo.png"),
          name: "Partner Suite",
        },
        partnerOrigins
      )
    )
  ),
  Layer.provideMerge(
    connectChannelWith(
      LinkAuthorizersTest.pipe(Layer.provide(OpenOutboundGuard))
    )
  )
);

/** Someone who connects accounts in the workspace. */
export const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read", "channel:connect"]);

/** A link for a Mastodon account, which returns to the partner. */
export const mastodonLink: NewConnectLink = {
  channelId: Option.none(),
  connection: Option.none(),
  expiresInHours: Option.none(),
  locale: Option.none(),
  platforms: ["mastodon"],
  returnUrl: Option.some("https://app.example.test/settings/social?tab=1"),
};

// A link of a new workspace, and the token its address holds.
export const linked = Effect.fn("linked")(function* linked(
  asked: Partial<NewConnectLink> = {}
) {
  const workspaceId = yield* freshWorkspace;
  const links = yield* ConnectLinks;

  const created = yield* links.create(manager(workspaceId), {
    ...mastodonLink,
    ...asked,
  });

  const url = Redacted.value(created.url);

  return {
    link: created.link,
    token: Redacted.make(url.slice(pages.length)),
    url,
    workspaceId,
  };
});
