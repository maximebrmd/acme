import { Context, Effect, Layer, Option, Redacted, Ref } from "effect";

import { ConnectLinkAddresses } from "#channels/application/connect-link-addresses.ts";
import { ConnectLinkJournal } from "#channels/application/connect-link-journal.ts";
import { ConnectLinks } from "#channels/application/connect-links.ts";
import type { NewConnectLink } from "#channels/application/connect-links.ts";
import { LinkHosts } from "#channels/application/link-hosts.ts";
import { DrizzleConnectLinkStore } from "#channels/infrastructure/drizzle-connect-link-store.ts";
import { RandomConnectLinkTokens } from "#channels/infrastructure/random-connect-link-tokens.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  connectChannelWith,
  MastodonAuthorizersTest,
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

/** Where the links' pages are, in these tests. */
export const pages = "https://peal.test/connect/link#";

/**
 * ConnectLinks with the real store and tokens, under a partner named
 * Partner Suite that returns to https://app.example.test.
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
          logoUrl: Option.some("https://cdn.example.test/logo.png"),
          name: "Partner Suite",
        },
        ["https://app.example.test"]
      )
    )
  ),
  Layer.provideMerge(
    connectChannelWith(
      MastodonAuthorizersTest.pipe(Layer.provide(OpenOutboundGuard))
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
  platform: "mastodon",
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
