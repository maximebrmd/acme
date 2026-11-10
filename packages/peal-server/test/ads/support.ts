import { Context, Effect, Layer, Option, Ref } from "effect";

import { AdNetworks } from "#ads/application/ports/ad-network.ts";
import type { AdNetworkClient } from "#ads/application/ports/ad-network.ts";
import { AdNotices } from "#ads/application/ports/ad-notices.ts";
import { adsWith } from "#ads/container.ts";
import type { AdsMode } from "#ads/domain/ads-mode.ts";
import type { BoostId } from "#ads/domain/ids.ts";
import { CipherGrantSecrets } from "#ads/infrastructure/cipher-grant-secrets.ts";
import { DrizzleAccountStore } from "#ads/infrastructure/drizzle-account-store.ts";
import { DrizzleBoostStore } from "#ads/infrastructure/drizzle-boost-store.ts";
import { DrizzleGrantStore } from "#ads/infrastructure/drizzle-grant-store.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import {
  DatabaseTest,
  freshWorkspace,
  TokenCipherTest,
} from "#test/channels/support.ts";
import { TransactionsTest } from "#test/notifications/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

import type { FakeMarketingOptions } from "./fakes/fake-marketing-api.ts";
import { metaAgainstFake } from "./meta-client.ts";

/** What a use case told the workspace, as recorded. */
export interface ToldAd {
  readonly boostId: Option.Option<BoostId>;
  readonly news: string;
  readonly workspaceId: WorkspaceId;
}

/**
 * The ad network a test talks to: none until the test starts a fake, then
 * the adapter against that fake, in the mode the test asks for.
 */
export class TestNetworks extends Context.Service<
  TestNetworks,
  {
    readonly use: (
      client: AdNetworkClient,
      mode: AdsMode
    ) => Effect.Effect<void>;
    readonly told: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly ToldAd[]>;
  }
>()("peal-server/test/ads/TestNetworks") {
  static readonly layer = Layer.effectContext(
    Effect.gen(function* TestNetworksLive() {
      const current = yield* Ref.make<{
        readonly client: Option.Option<AdNetworkClient>;
        readonly mode: AdsMode;
      }>({ client: Option.none(), mode: "off" });

      const told = yield* Ref.make<readonly ToldAd[]>([]);
      const now = () => Effect.runSync(Ref.get(current));

      const tell = (entry: ToldAd) =>
        Ref.update(told, (all) => [...all, entry]);

      return Context.make(TestNetworks, {
        told: (workspaceId) =>
          Ref.get(told).pipe(
            Effect.map((all) =>
              all.filter((entry) => entry.workspaceId === workspaceId)
            )
          ),
        use: (client, mode) =>
          Ref.set(current, { client: Option.some(client), mode }),
      }).pipe(
        Context.add(AdNetworks, {
          get available() {
            return now().mode === "off" ? [] : (["meta"] as const);
          },
          for: () => (now().mode === "off" ? Option.none() : now().client),
          get mode() {
            return now().mode;
          },
        }),
        Context.add(
          AdNotices,
          AdNotices.of({
            boost: (boost, _account, news) =>
              tell({
                boostId: Option.some(boost.id),
                news,
                workspaceId: boost.workspaceId,
              }),
            boostChanged: (boost, _account, change) =>
              tell({
                boostId: Option.some(boost.id),
                news: change,
                workspaceId: boost.workspaceId,
              }),
            reconnectNeeded: (grant) =>
              tell({
                boostId: Option.none(),
                news: "reconnectNeeded",
                workspaceId: grant.workspaceId,
              }),
          })
        )
      );
    })
  );
}

/**
 * The ads use cases on Postgres, with grants' tokens really encrypted
 * (the synthetic keyring), the network a test starts (`onMeta`), and what
 * the workspace is told recorded (`TestNetworks.told`).
 */
export const AdsTest = adsWith(
  Layer.mergeAll(
    DrizzleGrantStore,
    DrizzleAccountStore,
    DrizzleBoostStore,
    CipherGrantSecrets.pipe(Layer.provide(TokenCipherTest)),
    TestNetworks.layer
  )
).pipe(Layer.provideMerge(TransactionsTest), Layer.provideMerge(DatabaseTest));

/**
 * Starts a fake of Meta's Marketing API for the test, and has the use
 * cases reach it as a server in `mode` would.
 */
export const onMeta = Effect.fn("test.onMeta")(function* onMeta(
  options: FakeMarketingOptions = {},
  mode: AdsMode = "spend"
) {
  const { api, client } = yield* metaAgainstFake(options, mode);

  yield* TestNetworks.use((networks) => networks.use(client, mode));

  return api;
});

/** A member with a role, as themselves in their own session. */
export const member = (
  workspaceId: WorkspaceId,
  role: "admin" | "contributor" | "editor" | "owner" | "viewer",
  userId: UserId = UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7")
): Actor =>
  new Actor({
    permissions: permissionsFor(role),
    subject: { _tag: "user", impersonatedBy: Option.none(), userId },
    workspaceId,
  });

/** The same member, through an application or a key. */
export const through = (
  actor: Actor,
  how:
    | { readonly _tag: "apiKey"; readonly permissions: readonly Permission[] }
    | {
        readonly _tag: "application";
        readonly permissions: readonly Permission[];
      }
    | { readonly _tag: "staff" }
): Actor => {
  const { subject } = actor;

  if (how._tag === "apiKey" || subject._tag !== "user") {
    return new Actor({
      permissions: how._tag === "staff" ? [] : how.permissions,
      subject: { _tag: "apiKey", apiKeyId: "synthetic-key" },
      workspaceId: actor.workspaceId,
    });
  }

  return how._tag === "application"
    ? new Actor({
        permissions: how.permissions,
        subject: { ...subject, clientId: "synthetic-client" },
        workspaceId: actor.workspaceId,
      })
    : new Actor({
        permissions: actor.permissions,
        subject: {
          ...subject,
          impersonatedBy: Option.some(
            UserIdSchema.make("0d3f6b1a-2c4e-4f5a-8b6c-7d8e9f0a1b2c")
          ),
        },
        workspaceId: actor.workspaceId,
      });
};

/** An owner in a workspace of their own. */
export const freshOwner = freshWorkspace.pipe(
  Effect.map((workspaceId) => member(workspaceId, "owner"))
);

/** What a failing effect failed with, by tag; "succeeded" otherwise. */
export const tagOf = <E extends { readonly _tag: string }, R>(
  effect: Effect.Effect<unknown, E, R>
): Effect.Effect<string, never, R> =>
  effect.pipe(
    Effect.match({
      onFailure: (failure) => failure._tag,
      onSuccess: () => "succeeded",
    })
  );
