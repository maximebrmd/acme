// A website connects with no sign-in page: its address, a user and an
// application password, checked on the site, then kept encrypted like any
// channel's token. It is a channel like any other for the plan.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Redacted, Ref } from "effect";

import { ChannelAllowance } from "#channels/application/channel-allowance.ts";
import { ChannelEvents } from "#channels/application/channel-events.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { decryptTokens } from "#channels/application/channel-tokens.ts";
import { ConnectSite } from "#channels/application/connect-site.ts";
import { SiteRefused } from "#channels/application/site-refused.ts";
import type {
  SiteSignIn,
  VerifiedSite,
} from "#channels/application/site-verifier.ts";
import { SiteVerifier } from "#channels/application/site-verifier.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { MemorySiteConnectPace } from "#channels/infrastructure/memory-site-connect-pace.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import {
  actorIn,
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  syntheticCredentials,
  TokenCipherTest,
} from "#test/channels/support.ts";

const root = "https://garden.example/wp-json/";

// How many times a site was asked.
const verified = Ref.makeUnsafe(0);

const answerFor = (
  signIn: SiteSignIn
): Effect.Effect<VerifiedSite, PlatformUnavailable | SiteRefused> => {
  if (signIn.address.includes("down.example")) {
    return Effect.fail(new PlatformUnavailable());
  }

  return Redacted.value(signIn.applicationPassword) === "synthetic pass"
    ? Effect.succeed({
        accountId: signIn.address.endsWith("/plain")
          ? "https://garden.example/?rest_route=/"
          : root,
        avatarUrl: Option.none(),
        displayName: Option.some("Synthetic Garden Journal"),
        handle: "garden.example",
        scopes: ["publish_posts", "upload_files"],
      })
    : Effect.fail(new SiteRefused({ reason: "credentialsRefused" }));
};

// The site as the verifier finds it, for the password `synthetic`; any
// other is refused, and `down.example` does not answer. Typed with
// `/plain`, the same site answers at the API root it has without pretty
// permalinks.
const VerifierTest = Layer.succeed(
  SiteVerifier,
  SiteVerifier.of({
    verify: (signIn: SiteSignIn) =>
      Ref.update(verified, (count) => count + 1).pipe(
        Effect.andThen(answerFor(signIn))
      ),
  })
);

// What billing was told, and a plan of two channels.
interface Counted {
  readonly pooled: number;
  readonly workspaceId: WorkspaceId;
}

const counted = Ref.makeUnsafe<readonly Counted[]>([]);

const AllowanceTest = Layer.succeed(
  ChannelAllowance,
  ChannelAllowance.of({
    channels: () => Effect.succeed(Option.some(2)),
    counted: (workspaceId, pooled) =>
      pooled.pipe(
        Effect.flatMap((count) =>
          Ref.update(counted, (told) => [
            ...told,
            { pooled: count, workspaceId },
          ])
        )
      ),
    passedThrough: () => Effect.succeedNone,
    sharedWith: () => Effect.succeed([]),
    sharingIn: () => Effect.succeed(new Map()),
  })
);

const ConnectSiteTest = ConnectSite.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleChannelRepository,
      ChannelEvents.none,
      SqlChannelLocks,
      AllowanceTest,
      VerifierTest,
      MemorySiteConnectPace
    )
  ),
  Layer.provideMerge(TokenCipherTest),
  Layer.provideMerge(DatabaseTest)
);

const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read", "channel:connect"]);

const signIn = (password = "synthetic pass") => ({
  address: "garden.example",
  applicationPassword: Redacted.make(password),
  platform: "wordpress" as const,
  userName: "editor",
});

layer(ConnectSiteTest)("connecting a website", (it) => {
  it.effect("adds the site as a channel, its password sealed", () =>
    Effect.gen(function* added() {
      const workspaceId = yield* freshWorkspace;
      const sites = yield* ConnectSite;
      const repository = yield* ChannelRepository;

      const channel = yield* sites.connect(manager(workspaceId), signIn());

      assert.strictEqual(channel.platform, "wordpress");
      assert.strictEqual(channel.accountId, root);
      assert.strictEqual(channel.handle, "garden.example");
      assert.deepStrictEqual(
        channel.displayName,
        Option.some("Synthetic Garden Journal")
      );
      assert.deepStrictEqual(channel.token, { _tag: "nonExpiring" });

      const stored = yield* repository.credentials(channel.id);

      assert.isTrue(Option.isSome(stored));

      if (Option.isSome(stored)) {
        // Never the password as typed: only its sealed form is kept.
        assert.notInclude(stored.value.accessToken, "synthetic");

        const tokens = yield* decryptTokens(stored.value, channel.id);

        assert.strictEqual(
          Redacted.value(tokens.accessToken),
          "editor:synthetic pass"
        );
      }

      const told = yield* Ref.get(counted);

      assert.deepStrictEqual(told.at(-1), { pooled: 1, workspaceId });
    })
  );

  it.effect(
    "reconnects the site the workspace has, with the new password",
    () =>
      Effect.gen(function* again() {
        const workspaceId = yield* freshWorkspace;
        const sites = yield* ConnectSite;
        const repository = yield* ChannelRepository;

        const first = yield* sites.connect(manager(workspaceId), signIn());
        const before = (yield* Ref.get(counted)).length;
        const second = yield* sites.connect(manager(workspaceId), signIn());

        assert.strictEqual(second.id, first.id);
        assert.lengthOf(yield* repository.list(workspaceId), 1);
        // Reconnecting adds no channel: billing hears nothing.
        assert.lengthOf(yield* Ref.get(counted), before);
      })
  );

  it.effect("refuses a new site once the plan's channels are taken", () =>
    Effect.gen(function* full() {
      const workspaceId = yield* freshWorkspace;
      const sites = yield* ConnectSite;
      const repository = yield* ChannelRepository;

      for (const _ of [1, 2]) {
        const channel = yield* freshChannel(workspaceId);

        yield* repository.insert(channel, syntheticCredentials(channel));
      }

      const asked = yield* Ref.get(verified);

      const refused = yield* sites
        .connect(manager(workspaceId), signIn())
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "PlanLimitReached");
      assert.lengthOf(yield* repository.list(workspaceId), 2);
      // Refused before the site was called with the password.
      assert.strictEqual(yield* Ref.get(verified), asked);
    })
  );

  it.effect("reconnects the site whose API moved under its home page", () =>
    Effect.gen(function* moved() {
      const workspaceId = yield* freshWorkspace;
      const sites = yield* ConnectSite;
      const repository = yield* ChannelRepository;

      const first = yield* sites.connect(manager(workspaceId), signIn());

      const again = yield* sites.connect(manager(workspaceId), {
        ...signIn(),
        address: "garden.example/plain",
      });

      assert.strictEqual(again.id, first.id);
      assert.strictEqual(
        again.accountId,
        "https://garden.example/?rest_route=/"
      );
      assert.lengthOf(yield* repository.list(workspaceId), 1);
    })
  );

  it.effect("takes 30 tries an hour from a workspace", () =>
    Effect.gen(function* paced() {
      const workspaceId = yield* freshWorkspace;
      const sites = yield* ConnectSite;

      for (let tries = 0; tries < 30; tries += 1) {
        yield* sites
          .connect(manager(workspaceId), signIn("synthetic wrong"))
          .pipe(Effect.flip);
      }

      const refused = yield* sites
        .connect(manager(workspaceId), signIn())
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "SiteConnectLimited");
    })
  );

  it.effect("saves nothing when the site refuses the password", () =>
    Effect.gen(function* refusedPassword() {
      const workspaceId = yield* freshWorkspace;
      const sites = yield* ConnectSite;
      const repository = yield* ChannelRepository;

      const refused = yield* sites
        .connect(manager(workspaceId), signIn("wrong"))
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        refused,
        new SiteRefused({ reason: "credentialsRefused" })
      );
      assert.lengthOf(yield* repository.list(workspaceId), 0);
    })
  );

  it.effect("needs channel:connect", () =>
    Effect.gen(function* permission() {
      const workspaceId = yield* freshWorkspace;
      const sites = yield* ConnectSite;

      const refused = yield* sites
        .connect(actorIn(workspaceId, ["channel:read"]), signIn())
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "MissingPermission");
    })
  );

  it.effect("saves nothing when the site does not answer", () =>
    Effect.gen(function* down() {
      const workspaceId = yield* freshWorkspace;
      const sites = yield* ConnectSite;
      const repository = yield* ChannelRepository;

      const refused = yield* sites
        .connect(manager(workspaceId), {
          ...signIn(),
          address: "https://down.example",
        })
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "PlatformUnavailable");
      assert.lengthOf(yield* repository.list(workspaceId), 0);
    })
  );
});
