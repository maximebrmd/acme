// Connect links: whoever holds one connects an account on a hosted page,
// without a Peal account, once, from the browser that started the sign-in.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import { ConnectLinkAddresses } from "#channels/application/connect-link-addresses.ts";
import { ConnectLinks } from "#channels/application/connect-links.ts";
import type { NewConnectLink } from "#channels/application/connect-links.ts";
import { LinkHosts } from "#channels/application/link-hosts.ts";
import type { AuthorizationCallback } from "#channels/application/platform-authorizer.ts";
import { maxLinkStarts } from "#channels/domain/connect-link.ts";
import { DrizzleConnectLinkStore } from "#channels/infrastructure/drizzle-connect-link-store.ts";
import { RandomConnectLinkTokens } from "#channels/infrastructure/random-connect-link-tokens.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  connectChannelWith,
  MastodonAuthorizersTest,
  mastodonInstance,
} from "#test/channels/connect-support.ts";
import {
  actorIn,
  freshWorkspace,
  OpenOutboundGuard,
} from "#test/channels/support.ts";

const pages = "https://peal.test/connect/link/";

const LinksTest = ConnectLinks.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleConnectLinkStore,
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

const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read", "channel:connect"]);

const mastodon: NewConnectLink = {
  channelId: Option.none(),
  connection: Option.none(),
  expiresInHours: Option.none(),
  locale: Option.none(),
  platform: "mastodon",
  returnUrl: Option.some("https://app.example.test/settings/social?tab=1"),
};

const callbackOf = (back: {
  readonly code?: string;
  readonly error?: string;
  readonly state: string;
}): AuthorizationCallback => ({
  code: Option.fromUndefinedOr(back.code),
  error: Option.fromUndefinedOr(back.error),
  issuer: Option.none(),
  state: back.state,
});

// A link of a new workspace, and the token its address holds.
const linked = Effect.fn("linked")(function* linked(
  asked: Partial<NewConnectLink> = {}
) {
  const workspaceId = yield* freshWorkspace;
  const links = yield* ConnectLinks;

  const created = yield* links.create(manager(workspaceId), {
    ...mastodon,
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

const reasonOf = <A, E extends { readonly _tag: string }>(
  attempt: Effect.Effect<A, E>
) =>
  attempt.pipe(
    Effect.flip,
    Effect.map((failure) =>
      "reason" in failure ? String(failure.reason) : failure._tag
    )
  );

const CountSchema = Schema.Array(Schema.Struct({ rows: Schema.Number }));

layer(LinksTest)("connect links", (it) => {
  it.effect(
    "are created by those who connect accounts, kept by their token's digest alone",
    () =>
      Effect.gen(function* creates() {
        const links = yield* ConnectLinks;
        const sql = yield* SqlClient.SqlClient;
        const { link, token, url, workspaceId } = yield* linked();

        assert.isTrue(url.startsWith(pages));
        // 256 bits, in base64url.
        assert.lengthOf(Redacted.value(token), 43);
        assert.deepStrictEqual(link.status, { _tag: "pending" });
        assert.notInclude(link.id, Redacted.value(token));

        const kept =
          yield* sql`SELECT count(*)::int AS rows FROM channels.connect_links WHERE token_digest = ${Redacted.value(token)} OR id::text = ${Redacted.value(token)}`;

        assert.deepStrictEqual(
          yield* Schema.decodeUnknownEffect(CountSchema)(kept),
          [{ rows: 0 }]
        );

        const reader = actorIn(workspaceId, ["channel:read"]);

        assert.deepStrictEqual(
          (yield* links.list(reader)).map(({ id }) => id),
          [link.id]
        );
        assert.strictEqual(
          yield* reasonOf(links.create(reader, mastodon)),
          "MissingPermission"
        );
        // Another workspace reads none of it.
        const stranger = manager(yield* freshWorkspace);

        assert.strictEqual(
          yield* reasonOf(links.get(stranger, link.id)),
          "ConnectLinkNotFound"
        );
        assert.strictEqual(
          yield* reasonOf(links.revoke(stranger, link.id)),
          "ConnectLinkNotFound"
        );
      })
  );

  it.effect(
    "return only to an origin their workspace's partner registered",
    () =>
      Effect.gen(function* returns() {
        const links = yield* ConnectLinks;
        const actor = manager(yield* freshWorkspace);

        const refusals = yield* Effect.all(
          [
            "https://evil.example.test/settings",
            "https://app.example.test.evil.example/",
            "http://app.example.test/settings",
            "//app.example.test/settings",
            "/settings",
          ].map((returnUrl) =>
            reasonOf(
              links.create(actor, {
                ...mastodon,
                returnUrl: Option.some(returnUrl),
              })
            )
          )
        );

        assert.deepStrictEqual(
          refusals,
          refusals.map(() => "ReturnUrlNotAllowed")
        );
      })
  );

  it.effect(
    "connect an account once, from the browser that started, and say where to go back",
    () =>
      Effect.gen(function* connects() {
        const instance = yield* mastodonInstance();
        const links = yield* ConnectLinks;
        const { link, token, workspaceId } = yield* linked();

        const opened = yield* links.open(token);

        assert.strictEqual(opened.state, "pending");
        assert.strictEqual(opened.input, "instance");
        assert.strictEqual(opened.host.name, "Partner Suite");
        // Opening uses nothing: a preview, or a scanner, leaves it whole.
        assert.strictEqual((yield* links.open(token)).state, "pending");

        const started = yield* links.start(token, {
          handle: Option.none(),
          instance: Option.some(instance.url),
        });

        const callback = callbackOf(instance.approve(started.authorizationUrl));

        // Another browser, or none, holds nothing: the callback's address
        // alone completes nothing, and stays whole for the one that does.
        assert.strictEqual(
          yield* reasonOf(links.complete(token, Option.none(), callback)),
          "invalidState"
        );
        assert.strictEqual(
          yield* reasonOf(
            links.complete(
              token,
              Option.some(Redacted.make("another-browser-nonce")),
              callback
            )
          ),
          "invalidState"
        );

        const outcome = yield* links.complete(
          token,
          Option.some(started.browser),
          callback
        );

        assert(outcome._tag === "connected");

        const [channel] = outcome.channels;

        assert(channel !== undefined);
        assert.strictEqual(channel.workspaceId, workspaceId);
        assert.strictEqual(
          Option.getOrNull(outcome.returnTo),
          `https://app.example.test/settings/social?tab=1&peal_link=${link.id}&peal_status=connected`
        );

        // Used: what its creator reads, and nothing more to start.
        const read = yield* links.get(manager(workspaceId), link.id);

        assert(read.status._tag === "completed");
        assert.deepStrictEqual(read.status.channelIds, [channel.id]);
        assert.isTrue(Option.isNone(read.browser));
        assert.strictEqual((yield* links.open(token)).state, "completed");
        assert.strictEqual(
          yield* reasonOf(
            links.start(token, {
              handle: Option.none(),
              instance: Option.some(instance.url),
            })
          ),
          "linkCompleted"
        );
        assert.strictEqual(
          yield* reasonOf(
            links.complete(token, Option.some(started.browser), callback)
          ),
          "linkCompleted"
        );
        assert.lengthOf(
          yield* ChannelRepository.use((channels) =>
            channels.list(workspaceId)
          ),
          1
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "keep their sign-ins apart from a member's, and from another link's",
    () =>
      Effect.gen(function* apart() {
        const instance = yield* mastodonInstance();
        const links = yield* ConnectLinks;
        const connect = yield* ConnectChannel;
        const first = yield* linked();
        const second = yield* linked();

        const begin = (token: Redacted.Redacted) =>
          links.start(token, {
            handle: Option.none(),
            instance: Option.some(instance.url),
          });

        const ofFirst = yield* begin(first.token);
        const ofSecond = yield* begin(second.token);

        const callback = callbackOf(instance.approve(ofFirst.authorizationUrl));

        // A member of the same workspace, signed in, completes nothing a
        // link started.
        assert.strictEqual(
          yield* reasonOf(
            connect.complete(manager(first.workspaceId), "mastodon", callback)
          ),
          "InvalidConnectState"
        );
        // Nor does another link, with its own browser.
        assert.strictEqual(
          yield* reasonOf(
            links.complete(
              second.token,
              Option.some(ofSecond.browser),
              callback
            )
          ),
          "invalidState"
        );

        // Nor does a link complete what a member started.
        const memberUrl = yield* connect.start(
          manager(first.workspaceId),
          "mastodon",
          {
            connection: Option.none(),
            handle: Option.none(),
            instance: Option.some(instance.url),
          }
        );

        assert.strictEqual(
          yield* reasonOf(
            links.complete(
              first.token,
              Option.some(ofFirst.browser),
              callbackOf(instance.approve(memberUrl))
            )
          ),
          "invalidState"
        );

        // Its own, still whole, goes through.
        const outcome = yield* links.complete(
          first.token,
          Option.some(ofFirst.browser),
          callback
        );

        assert.strictEqual(outcome._tag, "connected");
      }).pipe(Effect.scoped)
  );

  it.effect(
    "let only the browser that started last complete, and keep how a sign-in failed",
    () =>
      Effect.gen(function* lastBrowser() {
        const instance = yield* mastodonInstance();
        const links = yield* ConnectLinks;
        const { link, token, workspaceId } = yield* linked();

        const begin = links.start(token, {
          handle: Option.none(),
          instance: Option.some(instance.url),
        });

        const earlier = yield* begin;
        const later = yield* begin;

        assert.strictEqual(
          yield* reasonOf(
            links.complete(
              token,
              Option.some(earlier.browser),
              callbackOf(instance.approve(earlier.authorizationUrl))
            )
          ),
          "invalidState"
        );

        // The owner refuses at the platform: the link says so, and stays.
        assert.strictEqual(
          yield* reasonOf(
            links.complete(
              token,
              Option.some(later.browser),
              callbackOf(instance.deny(later.authorizationUrl))
            )
          ),
          "denied"
        );

        const read = yield* links.get(manager(workspaceId), link.id);

        assert.deepStrictEqual(read.status, { _tag: "pending" });
        assert.strictEqual(
          Option.getOrNull(
            read.failure.pipe(Option.map(({ reason }) => reason))
          ),
          "denied"
        );

        const again = yield* begin;

        const outcome = yield* links.complete(
          token,
          Option.some(again.browser),
          callbackOf(instance.approve(again.authorizationUrl))
        );

        assert.strictEqual(outcome._tag, "connected");
      }).pipe(Effect.scoped)
  );

  it.effect("stop working once revoked, expired, or started too often", () =>
    Effect.gen(function* ends() {
      const instance = yield* mastodonInstance();
      const links = yield* ConnectLinks;

      const begin = (token: Redacted.Redacted) =>
        links.start(token, {
          handle: Option.none(),
          instance: Option.some(instance.url),
        });

      // Revoked while a sign-in is on its way: it does not complete.
      const revoked = yield* linked();
      const pending = yield* begin(revoked.token);

      const taken = yield* links.revoke(
        manager(revoked.workspaceId),
        revoked.link.id
      );

      assert.strictEqual(taken.status._tag, "revoked");
      assert.strictEqual((yield* links.open(revoked.token)).state, "revoked");
      assert.strictEqual(yield* reasonOf(begin(revoked.token)), "linkRevoked");
      assert.strictEqual(
        yield* reasonOf(
          links.complete(
            revoked.token,
            Option.some(pending.browser),
            callbackOf(instance.approve(pending.authorizationUrl))
          )
        ),
        "linkRevoked"
      );

      // Started as often as a link may be.
      const worn = yield* linked();

      for (let started = 0; started < maxLinkStarts; started += 1) {
        yield* begin(worn.token);
      }

      assert.strictEqual(yield* reasonOf(begin(worn.token)), "tooManyAttempts");

      // Past its time: an hour, as its creator asked.
      const short = yield* linked({ expiresInHours: Option.some(1) });

      yield* TestClock.adjust("59 minutes");
      assert.strictEqual((yield* links.open(short.token)).state, "pending");
      yield* TestClock.adjust("1 minute");
      assert.strictEqual((yield* links.open(short.token)).state, "expired");
      assert.strictEqual(yield* reasonOf(begin(short.token)), "linkExpired");

      // A token that opens nothing.
      assert.strictEqual(
        yield* reasonOf(links.open(Redacted.make("not-a-token"))),
        "ConnectLinkNotFound"
      );
      assert.strictEqual(
        yield* reasonOf(begin(Redacted.make("not-a-token"))),
        "ConnectLinkNotFound"
      );
    }).pipe(Effect.scoped)
  );

  it.effect("reconnect one channel, which says where its account lives", () =>
    Effect.gen(function* reconnects() {
      const instance = yield* mastodonInstance();
      const links = yield* ConnectLinks;
      const first = yield* linked();

      const started = yield* links.start(first.token, {
        handle: Option.none(),
        instance: Option.some(instance.url),
      });

      const connected = yield* links.complete(
        first.token,
        Option.some(started.browser),
        callbackOf(instance.approve(started.authorizationUrl))
      );

      assert(connected._tag === "connected");

      const [channel] = connected.channels;

      assert(channel !== undefined);

      // A channel of another workspace is not this one's to reconnect.
      assert.strictEqual(
        yield* reasonOf(
          links.create(manager(yield* freshWorkspace), {
            ...mastodon,
            channelId: Option.some(channel.id),
          })
        ),
        "ChannelNotFound"
      );

      const created = yield* links.create(manager(first.workspaceId), {
        ...mastodon,
        channelId: Option.some(channel.id),
      });

      const token = Redacted.make(
        Redacted.value(created.url).slice(pages.length)
      );

      const opened = yield* links.open(token);

      // It asks nothing: the channel says where its account lives.
      assert.strictEqual(opened.input, "none");
      assert.strictEqual(Option.getOrNull(opened.reconnecting), channel.handle);

      // Its sign-in is the channel's own: it goes to the server the
      // account lives on, which here is not the fake, and is told so. The
      // link keeps the failure, and stays usable.
      assert.strictEqual(
        yield* reasonOf(
          links.start(token, { handle: Option.none(), instance: Option.none() })
        ),
        "platformUnreachable"
      );

      const read = yield* links.get(
        manager(first.workspaceId),
        created.link.id
      );

      assert.deepStrictEqual(read.status, { _tag: "pending" });
      assert.strictEqual(
        Option.getOrNull(read.failure.pipe(Option.map(({ reason }) => reason))),
        "platformUnreachable"
      );
    }).pipe(Effect.scoped)
  );
});
