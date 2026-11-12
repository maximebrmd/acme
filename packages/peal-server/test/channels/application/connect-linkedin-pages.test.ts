import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option, Redacted } from "effect";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { decryptTokens } from "#channels/application/channel-tokens.ts";
import { ForgetTokenOwners } from "#channels/application/forget-token-owners.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type {
  AuthorizationCallback,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { RefreshChannelTokens } from "#channels/application/refresh-channel-tokens.ts";
import { renewToken } from "#channels/domain/channel.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { CurrentInboxPlatforms } from "#shared/application/current-inbox-platforms.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { InboxPlatforms } from "#shared/domain/inbox-platform.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { everyWorkspaceOn } from "#test/billing/support.ts";
import {
  authorizersOf,
  ConnectAdaptersTest,
  connectChannelOver,
  linkedinAuthorizerOn,
  linkedinPagesAuthorizerOn,
  connectAdaptersOn,
} from "#test/channels/connect-support.ts";
import {
  fakeLinkedIn,
  linkedinMember,
  linkedinPage,
  linkedinPagesClient,
  linkedinRetiredVersion,
  otherLinkedinPage,
} from "#test/channels/fakes/fake-linkedin.ts";
import {
  actorIn,
  freshWorkspace,
  RecordedNotices,
  repositoryScopedTo,
  freshChannel,
  syntheticCredentials,
} from "#test/channels/support.ts";

const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read", "channel:connect"]);

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

const pages = {
  connection: Option.some("linkedinPage" as const),
  handle: Option.none(),
  instance: Option.none(),
};

const urnOf = (page: { readonly id: number }) =>
  `urn:li:organization:${page.id}`;

const administrator = (page: { readonly id: number }) => ({
  organization: page.id,
  role: "ADMINISTRATOR",
  state: "APPROVED",
});

// LinkedIn with both of Peal's apps, and the use case over the two.
const onLinkedIn = Effect.fn("test.onLinkedIn")(function* onLinkedIn(
  version?: string,
  inbox: InboxPlatforms = new Set()
) {
  const linkedin = yield* fakeLinkedIn();
  const profiles = yield* linkedinAuthorizerOn(linkedin.endpoints);

  const authorizer = yield* linkedinPagesAuthorizerOn(
    linkedin.endpoints,
    version,
    inbox
  );

  const connect = yield* connectChannelOver(profiles, authorizer);

  return { authorizer, connect, linkedin, profiles };
});

type OnLinkedIn = Effect.Success<ReturnType<typeof onLinkedIn>>;

// The member signs in to the pages app, and LinkedIn sends them back.
const signIn = Effect.fn("test.signIn")(function* signIn(
  on: OnLinkedIn,
  workspaceId: WorkspaceId
) {
  const url = yield* on.connect.start(manager(workspaceId), "linkedin", pages);

  return yield* on.connect.complete(
    manager(workspaceId),
    "linkedin",
    callbackOf(on.linkedin.approve(url))
  );
});

// The one page the member administers, connected.
const connectedPage = Effect.fn("test.connectedPage")(function* connectedPage(
  on: OnLinkedIn,
  workspaceId: WorkspaceId
) {
  on.linkedin.grantRoles(linkedinMember.sub, [administrator(linkedinPage)]);

  const outcome = yield* signIn(on, workspaceId);

  assert(outcome._tag === "connected");

  return outcome.channel;
});

const tokenJobs = (workspaceId: WorkspaceId, authorizer: PlatformAuthorizer) =>
  Layer.mergeAll(RefreshChannelTokens.layer, ChannelAccess.layer).pipe(
    Layer.provide(repositoryScopedTo(workspaceId)),
    Layer.provide(Layer.succeed(PlatformAuthorizers, authorizersOf(authorizer)))
  );

const storedTokens = (channel: Channel) =>
  ChannelRepository.use((channels) => channels.credentials(channel.id)).pipe(
    Effect.map(Option.getOrThrow),
    Effect.flatMap((stored) => decryptTokens(stored, channel.id)),
    Effect.map(({ accessToken, refreshToken }) => ({
      access: Redacted.value(accessToken),
      refresh: refreshToken.pipe(Option.map(Redacted.value)),
    }))
  );

// The member the stored token is theirs, if kept.
const storedOwner = (channel: Channel) =>
  ChannelRepository.use((channels) => channels.credentials(channel.id)).pipe(
    Effect.map(Option.getOrThrow),
    Effect.map(({ tokenOwner }) => tokenOwner)
  );

// A server whose inbox reads LinkedIn pages' comments.
const readsLinkedIn: InboxPlatforms = new Set(["linkedin"]);

// The daily run that forgets owners, on a server whose inbox reads `inbox`.
const forgetOwners = (inbox: InboxPlatforms) =>
  ForgetTokenOwners.use((forget) => forget.run).pipe(
    Effect.provide(
      ForgetTokenOwners.layer.pipe(
        Layer.provide(Layer.succeed(CurrentInboxPlatforms, inbox))
      )
    )
  );

// Makes the channel's token due for the sweep: five minutes left.
const makeDue = (channel: Channel) =>
  Effect.gen(function* due() {
    const now = yield* DateTime.now;

    const aged = renewToken(
      channel,
      {
        scopes: channel.scopes,
        token: {
          _tag: "refreshable",
          expiresAt: DateTime.addDuration(now, Duration.minutes(5)),
        },
      },
      now
    );

    yield* ChannelRepository.use((channels) =>
      channels.update(aged, Option.none())
    );
  });

const AdaptersTest = Layer.mergeAll(ConnectAdaptersTest, RecordedNotices.layer);

layer(AdaptersTest)("connecting LinkedIn pages", (it) => {
  it.effect(
    "signs the member in to the pages app, with the scopes pages need",
    () =>
      Effect.gen(function* starts() {
        const on = yield* onLinkedIn();

        const url = new URL(
          yield* on.connect.start(
            manager(yield* freshWorkspace),
            "linkedin",
            pages
          )
        );

        assert.strictEqual(
          url.searchParams.get("client_id"),
          linkedinPagesClient.clientId
        );
        assert.strictEqual(
          url.searchParams.get("scope"),
          "r_organization_social rw_organization_admin w_organization_social"
        );
        assert.strictEqual(
          url.searchParams.get("redirect_uri"),
          "https://peal.test/connect/linkedin/callback"
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "keeps who the page's token belongs to where the inbox reads LinkedIn, and hands it with the token",
    () =>
      Effect.gen(function* owner() {
        const on = yield* onLinkedIn(undefined, readsLinkedIn);
        const workspaceId = yield* freshWorkspace;
        const channel = yield* connectedPage(on, workspaceId);

        assert.strictEqual(
          yield* storedOwner(channel),
          `urn:li:person:${linkedinMember.sub}`
        );

        const token = yield* ChannelAccess.use((access) =>
          access.withToken(channel.id, (given) => Effect.succeed(given))
        ).pipe(Effect.provide(tokenJobs(workspaceId, on.authorizer)));

        assert.strictEqual(
          token.tokenOwner,
          `urn:li:person:${linkedinMember.sub}`
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "keeps the owner through a renewal, by the sweep or on a refused token",
    () =>
      Effect.gen(function* renewal() {
        const on = yield* onLinkedIn(undefined, readsLinkedIn);
        const workspaceId = yield* freshWorkspace;

        on.linkedin.issueRefreshTokens();

        const channel = yield* connectedPage(on, workspaceId);
        const jobs = tokenJobs(workspaceId, on.authorizer);
        const owner = `urn:li:person:${linkedinMember.sub}`;

        yield* makeDue(channel);
        assert.strictEqual(
          yield* RefreshChannelTokens.use((tokens) =>
            tokens.refresh(channel.id)
          ).pipe(Effect.provide(jobs)),
          "refreshed"
        );
        assert.strictEqual(yield* storedOwner(channel), owner);

        // LinkedIn refuses the token once: renewed, it still names the
        // member, and so does the one stored.
        let refused = false;

        const token = yield* ChannelAccess.use((access) =>
          access.withToken(channel.id, (given) => {
            if (refused) {
              return Effect.succeed(given);
            }

            refused = true;

            return Effect.fail(new TokenRejected());
          })
        ).pipe(Effect.provide(jobs));

        assert.strictEqual(
          Redacted.value(token.accessToken),
          "linkedin-token-3"
        );
        assert.strictEqual(token.tokenOwner, owner);
        assert.strictEqual(yield* storedOwner(channel), owner);
      }).pipe(Effect.scoped)
  );

  it.effect("takes the member who reconnects a page for its owner", () =>
    Effect.gen(function* replaced() {
      const on = yield* onLinkedIn(undefined, readsLinkedIn);
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connectedPage(on, workspaceId);
      const other = { ...linkedinMember, sub: "zY9xW8vU7t" };

      on.linkedin.addMember(other);
      on.linkedin.grantRoles(other.sub, [administrator(linkedinPage)]);

      const url = yield* on.connect.reconnect(manager(workspaceId), channel.id);

      const again = yield* on.connect.complete(
        manager(workspaceId),
        "linkedin",
        callbackOf(on.linkedin.approve(url, other.sub))
      );

      assert(again._tag === "connected");
      assert.strictEqual(
        yield* storedOwner(channel),
        `urn:li:person:${other.sub}`
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "keeps no owner where the inbox does not read LinkedIn, and forgets one kept at the next sign-in or renewal",
    () =>
      Effect.gen(function* inboxOff() {
        const off = yield* onLinkedIn();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* connectedPage(off, workspaceId);

        assert.isUndefined(yield* storedOwner(channel));

        // Kept while the inbox read LinkedIn, then turned off: a
        // reconnection forgets it.
        const on = yield* onLinkedIn(undefined, readsLinkedIn);
        const kept = yield* connectedPage(on, yield* freshWorkspace);

        assert.isDefined(yield* storedOwner(kept));

        const turnedOff = yield* linkedinPagesAuthorizerOn(
          on.linkedin.endpoints
        );

        const connect = yield* connectChannelOver(on.profiles, turnedOff);

        const url = yield* connect.reconnect(
          manager(kept.workspaceId),
          kept.id
        );

        yield* connect.complete(
          manager(kept.workspaceId),
          "linkedin",
          callbackOf(on.linkedin.approve(url))
        );

        assert.isUndefined(yield* storedOwner(kept));

        // So does a renewal.
        on.linkedin.issueRefreshTokens();

        const renewed = yield* connectedPage(on, yield* freshWorkspace);

        assert.isDefined(yield* storedOwner(renewed));

        yield* makeDue(renewed);
        assert.strictEqual(
          yield* RefreshChannelTokens.use((tokens) =>
            tokens.refresh(renewed.id)
          ).pipe(Effect.provide(tokenJobs(renewed.workspaceId, turnedOff))),
          "refreshed"
        );
        assert.isUndefined(yield* storedOwner(renewed));
      }).pipe(Effect.scoped)
  );

  it.effect(
    "forgets every owner kept, daily, once the inbox no longer reads LinkedIn",
    () =>
      Effect.gen(function* forgets() {
        const on = yield* onLinkedIn(undefined, readsLinkedIn);
        const channel = yield* connectedPage(on, yield* freshWorkspace);

        assert.strictEqual(yield* forgetOwners(readsLinkedIn), 0);
        assert.isDefined(yield* storedOwner(channel));

        assert.isAtLeast(yield* forgetOwners(new Set()), 1);
        assert.isUndefined(yield* storedOwner(channel));
      }).pipe(Effect.scoped)
  );

  it.effect("connects the only page the member may post to, at once", () =>
    Effect.gen(function* connects() {
      const on = yield* onLinkedIn();
      const channel = yield* connectedPage(on, yield* freshWorkspace);

      assert.strictEqual(channel.platform, "linkedin");
      assert.deepStrictEqual(channel.connection, Option.some("linkedinPage"));
      assert.strictEqual(channel.accountId, urnOf(linkedinPage));
      assert.strictEqual(channel.handle, "example-bakery");
      assert.deepStrictEqual(
        channel.displayName,
        Option.some("Example Bakery")
      );
      assert.deepStrictEqual(channel.scopes, [
        "r_organization_social",
        "rw_organization_admin",
        "w_organization_social",
      ]);
      // Without a refresh token, 60 days, then the member signs in again.
      assert.strictEqual(channel.token._tag, "nonRefreshable");

      // Every call names the API version.
      const acls = on.linkedin
        .requests()
        .find(({ path }) => path === "/rest/organizationAcls");

      assert(acls !== undefined);
      assert.strictEqual(acls.headers["linkedin-version"], "202610");
      assert.strictEqual(acls.headers["x-restli-protocol-version"], "2.0.0");
      assert.strictEqual(acls.query.get("state"), "APPROVED");
    }).pipe(Effect.scoped)
  );

  it.effect(
    "offers the pages the member administers or writes for, and no other",
    () =>
      Effect.gen(function* offers() {
        const on = yield* onLinkedIn();
        const workspaceId = yield* freshWorkspace;

        on.linkedin.grantRoles(linkedinMember.sub, [
          administrator(linkedinPage),
          // A content administrator posts, and reads the page's name
          // through the lookup anyone may use.
          {
            organization: otherLinkedinPage.id,
            role: "CONTENT_ADMINISTRATOR",
            state: "APPROVED",
          },
          // An analyst reads, and a role LinkedIn has not approved is none.
          { organization: 31, role: "ANALYST", state: "APPROVED" },
          { organization: 32, role: "ADMINISTRATOR", state: "REQUESTED" },
          { organization: 33, role: "ADMINISTRATOR", state: "REVOKED" },
        ]);

        const outcome = yield* signIn(on, workspaceId);

        assert(outcome._tag === "choose");
        assert.deepStrictEqual(
          outcome.accounts.map(({ accountId, handle }) => [accountId, handle]),
          [
            [urnOf(linkedinPage), "example-bakery"],
            [urnOf(otherLinkedinPage), "example-bikes"],
          ]
        );

        const chosen = yield* on.connect.choose(
          manager(workspaceId),
          "linkedin",
          {
            accountIds: [urnOf(otherLinkedinPage), urnOf(linkedinPage)],
            selection: outcome.selection,
          }
        );

        assert.deepStrictEqual(
          chosen.map(({ connection }) => connection),
          [Option.some("linkedinPage"), Option.some("linkedinPage")]
        );

        const stored = yield* ChannelRepository.use((channels) =>
          channels.list(workspaceId)
        );

        assert.strictEqual(stored.length, 2);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "reads the member's roles past a page LinkedIn gives shorter than asked, to an empty one",
    () =>
      Effect.gen(function* cappedRoles() {
        const on = yield* onLinkedIn();
        const workspaceId = yield* freshWorkspace;

        on.linkedin.capRolePages(2);
        on.linkedin.grantRoles(linkedinMember.sub, [
          { organization: 31, role: "ANALYST", state: "APPROVED" },
          { organization: 32, role: "ANALYST", state: "APPROVED" },
          administrator(linkedinPage),
        ]);

        const outcome = yield* signIn(on, workspaceId);

        assert(outcome._tag === "connected");
        assert.strictEqual(outcome.channel.accountId, urnOf(linkedinPage));
        // Two roles, one, then the empty page that ends them.
        assert.deepStrictEqual(
          on.linkedin
            .requests()
            .filter(({ path }) => path === "/rest/organizationAcls")
            .map(({ query }) => query.get("start")),
          ["0", "2", "3"]
        );
      }).pipe(Effect.scoped)
  );

  it.effect("has nothing to connect for a member without a page", () =>
    Effect.gen(function* none() {
      const on = yield* onLinkedIn();

      const refused = yield* signIn(on, yield* freshWorkspace).pipe(
        Effect.flip
      );

      assert.strictEqual(refused._tag, "NoAccountsToConnect");
    }).pipe(Effect.scoped)
  );

  it.effect("connects a member's profile and their page as two channels", () =>
    Effect.gen(function* both() {
      const on = yield* onLinkedIn();
      const workspaceId = yield* freshWorkspace;
      const page = yield* connectedPage(on, workspaceId);

      // Without a way in, the server's first: the profile.
      const url = yield* on.connect.start(manager(workspaceId), "linkedin", {
        ...pages,
        connection: Option.none(),
      });

      const profile = yield* on.connect.complete(
        manager(workspaceId),
        "linkedin",
        callbackOf(on.linkedin.approve(url))
      );

      assert(profile._tag === "connected");
      assert.notStrictEqual(profile.channel.id, page.id);
      assert.deepStrictEqual(
        profile.channel.connection,
        Option.some("linkedinProfile")
      );
      assert.strictEqual(profile.channel.accountId, linkedinMember.sub);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "reconnects a page of a member who administers more pages than a sign-in offers",
    () =>
      Effect.gen(function* reconnectsAmongMany() {
        const on = yield* onLinkedIn();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* connectedPage(on, workspaceId);

        // Forty pages, the channel's own listed last by LinkedIn.
        on.linkedin.grantRoles(linkedinMember.sub, [
          ...Array.from({ length: 39 }, (_, index) =>
            administrator({ id: 9_100_000_000 + index })
          ),
          administrator(linkedinPage),
        ]);

        const url = yield* on.connect.reconnect(
          manager(workspaceId),
          channel.id
        );

        const again = yield* on.connect.complete(
          manager(workspaceId),
          "linkedin",
          callbackOf(on.linkedin.approve(url))
        );

        assert(again._tag === "connected");
        assert.strictEqual(again.channel.id, channel.id);
      }).pipe(Effect.scoped)
  );

  it.effect("reconnects a page through the pages app, for that page", () =>
    Effect.gen(function* reconnects() {
      const on = yield* onLinkedIn();
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connectedPage(on, workspaceId);

      on.linkedin.grantRoles(linkedinMember.sub, [
        administrator(linkedinPage),
        administrator(otherLinkedinPage),
      ]);

      const url = yield* on.connect.reconnect(manager(workspaceId), channel.id);

      assert.strictEqual(
        new URL(url).searchParams.get("client_id"),
        linkedinPagesClient.clientId
      );

      const again = yield* on.connect.complete(
        manager(workspaceId),
        "linkedin",
        callbackOf(on.linkedin.approve(url))
      );

      assert(again._tag === "connected");
      assert.strictEqual(again.channel.id, channel.id);
      assert.deepStrictEqual(yield* storedTokens(again.channel), {
        access: "linkedin-token-2",
        refresh: Option.none(),
      });
    }).pipe(Effect.scoped)
  );

  it.effect(
    "renews a page's token with the refresh token LinkedIn gave, and keeps it",
    () =>
      Effect.gen(function* refreshes() {
        const on = yield* onLinkedIn();
        const workspaceId = yield* freshWorkspace;

        on.linkedin.issueRefreshTokens();

        const channel = yield* connectedPage(on, workspaceId);
        const jobs = tokenJobs(workspaceId, on.authorizer);

        assert.strictEqual(channel.token._tag, "refreshable");

        const refresh = RefreshChannelTokens.use((tokens) =>
          tokens.refresh(channel.id)
        ).pipe(Effect.provide(jobs));

        // Not due: 60 days left.
        assert.strictEqual(yield* refresh, "skipped");

        yield* makeDue(channel);
        assert.strictEqual(yield* refresh, "refreshed");
        assert.deepStrictEqual(yield* storedTokens(channel), {
          access: "linkedin-token-2",
          refresh: Option.some("linkedin-refresh-1"),
        });
      }).pipe(Effect.scoped)
  );

  // The server's first LinkedIn app connects profiles, whose tokens nothing
  // renews: the sweep must still find the pages the second one renews.
  it.effect(
    "sweeps a page's token due for renewal on a server that connects profiles too",
    () =>
      Effect.gen(function* swept() {
        const on = yield* onLinkedIn();
        const workspaceId = yield* freshWorkspace;

        on.linkedin.issueRefreshTokens();

        const channel = yield* connectedPage(on, workspaceId);

        const sweep = RefreshChannelTokens.use((tokens) =>
          tokens.sweep({ budget: Duration.minutes(1) })
        ).pipe(
          Effect.provide(
            Layer.mergeAll(
              RefreshChannelTokens.layer,
              ChannelAccess.layer
            ).pipe(
              Layer.provide(repositoryScopedTo(workspaceId)),
              Layer.provide(
                Layer.succeed(
                  PlatformAuthorizers,
                  authorizersOf(on.profiles, on.authorizer)
                )
              )
            )
          )
        );

        // Not due: 60 days left.
        assert.strictEqual((yield* sweep).refreshed, 0);

        yield* makeDue(channel);
        assert.deepInclude(yield* sweep, { due: 1, refreshed: 1 });
        assert.deepStrictEqual(yield* storedTokens(channel), {
          access: "linkedin-token-2",
          refresh: Option.some("linkedin-refresh-1"),
        });
      }).pipe(Effect.scoped)
  );

  it.effect("asks to reconnect once LinkedIn refuses the refresh token", () =>
    Effect.gen(function* expired() {
      const on = yield* onLinkedIn();
      const workspaceId = yield* freshWorkspace;
      const notices = yield* RecordedNotices;

      on.linkedin.issueRefreshTokens();

      const channel = yield* connectedPage(on, workspaceId);

      yield* makeDue(channel);

      on.linkedin.failNext("POST /oauth/v2/accessToken", [
        {
          body: {
            error: "invalid_request",
            error_description: "The provided refresh token is expired",
          },
          status: 400,
        },
      ]);

      yield* RefreshChannelTokens.use((tokens) =>
        tokens.refresh(channel.id)
      ).pipe(Effect.provide(tokenJobs(workspaceId, on.authorizer)));

      const marked = yield* ChannelRepository.use((channels) =>
        channels.get(channel.id)
      );

      assert.deepStrictEqual(
        marked.pipe(Option.map(({ status }) => status._tag)),
        Option.some("refreshNeeded")
      );
      assert.deepStrictEqual(
        (yield* notices.of(workspaceId)).map(({ kind }) => kind),
        ["reconnectRequired"]
      );
    }).pipe(Effect.scoped)
  );

  it.effect("fails, connecting nothing, in a version LinkedIn retired", () =>
    Effect.gen(function* retired() {
      const on = yield* onLinkedIn(linkedinRetiredVersion);

      on.linkedin.grantRoles(linkedinMember.sub, [administrator(linkedinPage)]);

      const refused = yield* signIn(on, yield* freshWorkspace).pipe(
        Effect.flip
      );

      assert(refused._tag === "AuthorizationFailed");
      assert.include(refused.reason, "426");
    }).pipe(Effect.scoped)
  );

  it.effect("tells LinkedIn being down from a refusal", () =>
    Effect.gen(function* down() {
      const on = yield* onLinkedIn();

      on.linkedin.grantRoles(linkedinMember.sub, [administrator(linkedinPage)]);
      on.linkedin.failNext("GET /rest/organizationAcls", [
        { body: { message: "Service unavailable" }, status: 503 },
        { body: { message: "Too many requests" }, status: 429 },
      ]);

      const workspaceId = yield* freshWorkspace;

      assert.strictEqual(
        (yield* signIn(on, workspaceId).pipe(Effect.flip))._tag,
        "PlatformUnavailable"
      );
      assert.strictEqual(
        (yield* signIn(on, workspaceId).pipe(Effect.flip))._tag,
        "PlatformUnavailable"
      );
    }).pipe(Effect.scoped)
  );
});

// Synthetic channels, connected without the platform.
const fill = Effect.fn("test.fill")(function* fill(
  workspaceId: WorkspaceId,
  count: number
) {
  const repository = yield* ChannelRepository;

  for (let added = 0; added < count; added += 1) {
    const channel = yield* freshChannel(workspaceId, {
      accountId: `synthetic-${String(added)}`,
    });

    yield* repository.insert(channel, syntheticCredentials(channel));
  }
});

// The free plan, which allows 3 channels.
const FreePlanTest = Layer.mergeAll(
  connectAdaptersOn(everyWorkspaceOn("free")),
  RecordedNotices.layer
);

layer(FreePlanTest)("choosing LinkedIn pages on the free plan", (it) => {
  it.effect(
    "connects none of the pages chosen when the plan has no room for all, and lets the member choose fewer",
    () =>
      Effect.gen(function* tooMany() {
        const on = yield* onLinkedIn();
        const workspaceId = yield* freshWorkspace;

        yield* fill(workspaceId, 2);

        on.linkedin.grantRoles(linkedinMember.sub, [
          administrator(linkedinPage),
          administrator(otherLinkedinPage),
        ]);

        const outcome = yield* signIn(on, workspaceId);

        assert(outcome._tag === "choose");

        // Two channels and two pages would make four.
        assert.deepStrictEqual(
          yield* Effect.flip(
            on.connect.choose(manager(workspaceId), "linkedin", {
              accountIds: [urnOf(linkedinPage), urnOf(otherLinkedinPage)],
              selection: outcome.selection,
            })
          ),
          new PlanLimitReached({
            allowed: 3,
            limit: "channels",
            needed: 4,
            used: 2,
          })
        );

        const chosen = yield* on.connect.choose(
          manager(workspaceId),
          "linkedin",
          { accountIds: [urnOf(linkedinPage)], selection: outcome.selection }
        );

        assert.deepStrictEqual(
          chosen.map(({ connection }) => connection),
          [Option.some("linkedinPage")]
        );
      }).pipe(Effect.scoped)
  );
});
