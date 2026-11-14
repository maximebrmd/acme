// Connect links: whoever holds one connects an account on a hosted page,
// without a Peal account, once, from the browser that started the sign-in.
import { assert, layer } from "@effect/vitest";
import { Effect, Option, Redacted, Ref, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import { ConnectLinks } from "#channels/application/connect-links.ts";
import type { AuthorizationCallback } from "#channels/application/platform-authorizer.ts";
import {
  maxLinkStarts,
  maxPendingLinks,
} from "#channels/domain/connect-link.ts";
import { mastodonInstance } from "#test/channels/connect-support.ts";
import {
  fakeSignIn,
  LinkConnections,
  linked,
  partnerOrigins,
  LinksTest,
  manager,
  mastodonLink as mastodon,
  pages,
} from "#test/channels/link-support.ts";
import { actorIn, freshWorkspace } from "#test/channels/support.ts";

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

const reasonOf = <A, E extends { readonly _tag: string }>(
  attempt: Effect.Effect<A, E>
) =>
  attempt.pipe(
    Effect.flip,
    Effect.map((failure) =>
      "reason" in failure ? failure.reason : failure._tag
    )
  );

const CountSchema = Schema.Array(Schema.Struct({ rows: Schema.Number }));

// What a fake platform's sign-in sends back for the account `code`.
const fakeCallback = (authorizationUrl: string, code: string) =>
  callbackOf({
    code,
    state: new URL(authorizationUrl).searchParams.get("state") ?? "",
  });

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

        // The workspace's log is told once, by the link: the refused
        // attempts connected nothing, and nobody is named.
        assert.deepStrictEqual(
          (yield* Ref.get(yield* LinkConnections)).filter(
            ({ linkId }) => linkId === link.id
          ),
          [
            {
              channelIds: [channel.id],
              linkId: link.id,
              step: "complete",
              workspaceId,
            },
          ]
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

  it.effect(
    "connect once, whatever arrives together: two sign-ins started from one browser complete one",
    () =>
      Effect.gen(function* once() {
        const instance = yield* mastodonInstance();
        const links = yield* ConnectLinks;
        const { link, token, workspaceId } = yield* linked();

        const from = {
          handle: Option.none(),
          instance: Option.some(instance.url),
        };

        // Two tabs of one browser: the cookie they share holds the nonce
        // of the second start, and each has its own sign-in to complete.
        const first = yield* links.start(token, from);
        const second = yield* links.start(token, from);

        const outcomes = yield* Effect.all(
          [first, second].map((started) =>
            links
              .complete(
                token,
                Option.some(second.browser),
                callbackOf(instance.approve(started.authorizationUrl))
              )
              .pipe(
                Effect.match({
                  onFailure: (failure) =>
                    "reason" in failure ? failure.reason : failure._tag,
                  onSuccess: ({ _tag }) => _tag,
                })
              )
          ),
          { concurrency: "unbounded" }
        );

        assert.deepStrictEqual(outcomes.toSorted(), [
          "connected",
          "linkCompleted",
        ]);

        const read = yield* links.get(manager(workspaceId), link.id);

        assert(read.status._tag === "completed");
        assert.lengthOf(read.status.channelIds, 1);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "send nobody back to an origin the partner has removed since the link was made",
    () =>
      Effect.gen(function* removed() {
        const links = yield* ConnectLinks;
        const instance = yield* mastodonInstance();
        const { token } = yield* linked();

        const started = yield* links.start(token, {
          handle: Option.none(),
          instance: Option.some(instance.url),
        });

        const removedOrigins = partnerOrigins.splice(0);

        const answers = Effect.gen(function* answers() {
          const opened = yield* links.open(token);

          const refused = yield* links
            .complete(
              token,
              Option.none(),
              callbackOf(instance.approve(started.authorizationUrl))
            )
            .pipe(Effect.flip);

          const outcome = yield* links.complete(
            token,
            Option.some(started.browser),
            callbackOf(instance.approve(started.authorizationUrl))
          );

          return {
            connected:
              outcome._tag === "connected"
                ? outcome.returnTo
                : Option.some("not connected"),
            opened: opened.returnTo,
            refused: "returnTo" in refused ? refused.returnTo : Option.none(),
          };
        }).pipe(
          Effect.ensuring(
            Effect.sync(() => {
              partnerOrigins.push(...removedOrigins);
            })
          )
        );

        assert.deepStrictEqual(yield* answers, {
          connected: Option.none(),
          opened: Option.none(),
          refused: Option.none(),
        });
      })
  );

  it.effect(
    "keep no more links waiting than a workspace may, however many are made together",
    () =>
      Effect.gen(function* waiting() {
        const links = yield* ConnectLinks;
        const workspaceId = yield* freshWorkspace;

        const made = yield* Effect.all(
          Array.from({ length: maxPendingLinks + 6 }, () =>
            links.create(manager(workspaceId), mastodon).pipe(Effect.isSuccess)
          ),
          { concurrency: 12 }
        );

        assert.lengthOf(made.filter(Boolean), maxPendingLinks);
      })
  );

  it.effect(
    "start no more sign-ins than a link may, however many arrive together",
    () =>
      Effect.gen(function* capped() {
        const instance = yield* mastodonInstance();
        const links = yield* ConnectLinks;
        const { token } = yield* linked();

        const started = yield* Effect.all(
          Array.from({ length: maxLinkStarts + 5 }, () =>
            links
              .start(token, {
                handle: Option.none(),
                instance: Option.some(instance.url),
              })
              .pipe(Effect.isSuccess)
          ),
          { concurrency: "unbounded" }
        );

        assert.lengthOf(started.filter(Boolean), maxLinkStarts);
      }).pipe(Effect.scoped)
  );

  it.effect("take a platform's own way in, and no other platform's", () =>
    Effect.gen(function* waysIn() {
      const links = yield* ConnectLinks;
      const workspaceId = yield* freshWorkspace;

      // A company page is LinkedIn's way in: Mastodon has one, and
      // Instagram has its own two.
      for (const platform of ["mastodon", "instagram"] as const) {
        const refused = yield* links
          .create(manager(workspaceId), {
            ...mastodon,
            connection: Option.some("linkedinPage"),
            platforms: [platform],
          })
          .pipe(Effect.flip);

        assert.deepInclude(refused, {
          _tag: "PlatformNotConnectable",
          platform,
          reason: "notSupported",
        });
      }

      // LinkedIn's pages are asked of LinkedIn: a server without its app
      // says so, rather than that it knows no such way in.
      const unset = yield* links
        .create(manager(workspaceId), {
          ...mastodon,
          connection: Option.some("linkedinPage"),
          platforms: ["linkedin"],
        })
        .pipe(Effect.flip);

      assert.deepInclude(unset, {
        _tag: "PlatformNotConnectable",
        platform: "linkedin",
        reason: "notConfigured",
      });
    })
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

  it.effect("for several platforms, connect each once, then are used", () =>
    Effect.gen(function* several() {
      const instance = yield* mastodonInstance();
      const links = yield* ConnectLinks;

      const { link, token, workspaceId } = yield* linked({
        platforms: ["mastodon", "threads"],
      });

      assert.deepStrictEqual(link.platforms, ["mastodon", "threads"]);

      const opened = yield* links.open(token);

      assert.strictEqual(opened.platform, "mastodon");
      assert.deepStrictEqual(opened.platforms, [
        { connected: false, input: "instance", platform: "mastodon" },
        { connected: false, input: "none", platform: "threads" },
      ]);

      // Threads first, though Mastodon comes first.
      const atThreads = yield* links.start(token, {
        handle: Option.none(),
        instance: Option.none(),
        platform: Option.some("threads"),
      });

      assert.isTrue(
        atThreads.authorizationUrl.startsWith(fakeSignIn("threads"))
      );

      const first = yield* links.complete(
        token,
        Option.some(atThreads.browser),
        fakeCallback(atThreads.authorizationUrl, "first")
      );

      assert(first._tag === "connected");
      assert.deepStrictEqual(first.remaining, ["mastodon"]);
      assert.strictEqual(
        Option.getOrNull(first.returnTo),
        `https://app.example.test/settings/social?tab=1&peal_link=${link.id}&peal_status=connected`
      );

      const [threads] = first.channels;

      assert(threads !== undefined);
      assert.strictEqual(threads.platform, "threads");

      // Still waiting, on Mastodon alone, and saying what it connected.
      const halfway = yield* links.get(manager(workspaceId), link.id);

      assert.deepStrictEqual(halfway.status, { _tag: "pending" });
      assert.deepStrictEqual(halfway.connectedPlatforms, ["threads"]);
      assert.deepStrictEqual(halfway.connectedChannels, [threads.id]);
      assert.isTrue(Option.isNone(halfway.browser));

      const reopened = yield* links.open(token);

      assert.strictEqual(reopened.state, "pending");
      assert.strictEqual(reopened.platform, "mastodon");
      assert.strictEqual(reopened.input, "instance");
      assert.deepStrictEqual(
        reopened.platforms.map(({ connected }) => connected),
        [false, true]
      );

      // Threads is done: a second Threads account is not this link's.
      assert.strictEqual(
        yield* reasonOf(
          links.start(token, {
            handle: Option.none(),
            instance: Option.none(),
            platform: Option.some("threads"),
          })
        ),
        "platformNotOffered"
      );

      // Left out, the platform is the first it still waits on.
      const atMastodon = yield* links.start(token, {
        handle: Option.none(),
        instance: Option.some(instance.url),
      });

      const second = yield* links.complete(
        token,
        Option.some(atMastodon.browser),
        callbackOf(instance.approve(atMastodon.authorizationUrl))
      );

      assert(second._tag === "connected");
      assert.deepStrictEqual(second.remaining, []);

      const [mastodonChannel] = second.channels;

      assert(mastodonChannel !== undefined);

      const used = yield* links.get(manager(workspaceId), link.id);

      assert(used.status._tag === "completed");
      assert.deepStrictEqual(used.status.channelIds, [
        threads.id,
        mastodonChannel.id,
      ]);
      assert.strictEqual((yield* links.open(token)).state, "completed");

      // Told to the log once a sign-in, each with what it connected.
      assert.deepStrictEqual(
        (yield* Ref.get(yield* LinkConnections))
          .filter(({ linkId }) => linkId === link.id)
          .map(({ channelIds }) => channelIds),
        [[threads.id], [mastodonChannel.id]]
      );
    }).pipe(Effect.scoped)
  );

  it.effect("start nothing at a platform they do not name", () =>
    Effect.gen(function* notNamed() {
      const links = yield* ConnectLinks;

      const { link, token, workspaceId } = yield* linked({
        platforms: ["mastodon", "threads"],
      });

      assert.strictEqual(
        yield* reasonOf(
          links.start(token, {
            handle: Option.none(),
            instance: Option.none(),
            platform: Option.some("bluesky"),
          })
        ),
        "platformNotOffered"
      );

      // Not a failure of a sign-in: nothing is kept, nothing counted.
      const read = yield* links.get(manager(workspaceId), link.id);

      assert.isTrue(Option.isNone(read.failure));
      assert.strictEqual(read.starts, 0);
    })
  );

  it.effect(
    "take the way in asked for the platform it belongs to, and the server's first otherwise",
    () =>
      Effect.gen(function* waysIn() {
        const links = yield* ConnectLinks;
        const actor = manager(yield* freshWorkspace);

        // Instagram Login is the only way in here: a link that asks none
        // takes it, and keeps asking none.
        const { link, token, workspaceId } = yield* linked({
          platforms: ["mastodon", "instagram"],
        });

        const read = yield* links.get(manager(workspaceId), link.id);

        assert.isTrue(Option.isNone(read.connection));

        const started = yield* links.start(token, {
          handle: Option.none(),
          instance: Option.none(),
          platform: Option.some("instagram"),
        });

        assert.isTrue(
          started.authorizationUrl.startsWith(fakeSignIn("instagram"))
        );

        // Through a Page, which this server does not offer; and a way in
        // that is no platform's of the link.
        const refusals = yield* Effect.all(
          (["facebookLogin", "linkedinPage"] as const).map((connection) =>
            links
              .create(actor, {
                ...mastodon,
                connection: Option.some(connection),
                platforms: ["mastodon", "instagram"],
              })
              .pipe(Effect.flip)
          )
        );

        assert.deepStrictEqual(
          refusals.map((refusal) =>
            refusal._tag === "PlatformNotConnectable"
              ? [refusal.platform, refusal.reason]
              : [refusal._tag]
          ),
          [
            ["instagram", "notConfigured"],
            ["mastodon", "notSupported"],
          ]
        );
      })
  );

  it.effect("reconnect one channel, on its platform alone", () =>
    Effect.gen(function* reconnectOne() {
      const links = yield* ConnectLinks;
      const instance = yield* mastodonInstance();
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
      assert.strictEqual(
        yield* reasonOf(
          links.create(manager(first.workspaceId), {
            ...mastodon,
            channelId: Option.some(channel.id),
            platforms: ["mastodon", "threads"],
          })
        ),
        "ChannelNotFound"
      );
    }).pipe(Effect.scoped)
  );
});
