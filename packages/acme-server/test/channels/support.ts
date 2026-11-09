import type { Member } from "acme-contract";
import {
  ConfigProvider,
  Context,
  DateTime,
  Effect,
  Layer,
  Option,
  Ref,
} from "effect";
import { Base64 } from "effect/encoding";

import { ChannelCredentials } from "#channels/application/channel-credentials.ts";
import { ChannelNotices } from "#channels/application/channel-notices.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { EncryptedTokenSchema } from "#channels/application/token-cipher.ts";
import { AvatarUrlSchema } from "#channels/domain/avatar-url.ts";
import { connectChannel } from "#channels/domain/channel.ts";
import type { Channel, TokenLifetime } from "#channels/domain/channel.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { TokenCipherLive } from "#channels/infrastructure/web-crypto-token-cipher.ts";
import { Ids, newId } from "#shared/application/ids.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import {
  ChannelIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";

/**
 * Postgres from DATABASE_URL, brought up to date, and random ids, so runs
 * and parallel suites never collide.
 */
export const DatabaseTest = Layer.mergeAll(MigrationsLive, IdsLive).pipe(
  Layer.provideMerge(DatabaseLive)
);

/** A synthetic keyring of one key, never used outside tests. */
export const syntheticKeyring = `test-key:${Base64.encode(new Uint8Array(32).fill(7))}`;

export const connectedAt = DateTime.makeUnsafe("2026-06-15T07:00:00.123Z");

export const later = DateTime.makeUnsafe("2026-06-15T08:30:00.456Z");

export const nonRefreshable: TokenLifetime = {
  _tag: "nonRefreshable",
  expiresAt: DateTime.makeUnsafe("2026-08-14T07:00:00.123Z"),
  issuedAt: connectedAt,
};

export const refreshable: TokenLifetime = {
  _tag: "refreshable",
  expiresAt: DateTime.makeUnsafe("2026-06-15T09:00:00.123Z"),
};

/** A workspace of its own for each test. */
export const freshWorkspace: Effect.Effect<WorkspaceId, never, Ids> = Ids.use(
  (ids) => ids.next.pipe(Effect.map((id) => WorkspaceIdSchema.make(id)))
);

/** A synthetic account newly connected to the workspace. */
export const freshChannel = Effect.fn("freshChannel")(function* freshChannel(
  workspaceId: WorkspaceId,
  options: {
    readonly accountId?: string;
    readonly platform?: Platform;
    readonly token?: TokenLifetime;
  } = {}
) {
  const id = yield* newId(ChannelIdSchema);

  return connectChannel(
    {
      accountId: options.accountId ?? `account-${id}`,
      avatarUrl: Option.some(
        AvatarUrlSchema.make(`https://social.example/avatars/${id}.png`)
      ),
      displayName: Option.some("Acme Example"),
      handle: "@acme_example",
      id,
      platform: options.platform ?? "mastodon",
      scopes: ["read", "write"],
      token: options.token ?? nonRefreshable,
      workspaceId,
    },
    connectedAt
  );
});

/**
 * Stand-ins for tokens the cipher encrypted with the key `keyId`: the stored
 * form, without anything a key would open.
 */
export const syntheticCredentials = (
  channel: Channel,
  { keyId = "k1", refresh = true } = {}
): ChannelCredentials =>
  new ChannelCredentials({
    accessToken: EncryptedTokenSchema.make(
      `${keyId}.synthetic-iv.access-${channel.id}`
    ),
    refreshToken: refresh
      ? Option.some(
          EncryptedTokenSchema.make(
            `${keyId}.synthetic-iv.refresh-${channel.id}`
          )
        )
      : Option.none(),
  });

const syntheticUser = UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

/** Someone signed in, acting in the workspace with these permissions. */
export const actorIn = (
  workspaceId: WorkspaceId,
  permissions: readonly Permission[]
): Actor =>
  new Actor({
    permissions,
    subject: {
      _tag: "user",
      impersonatedBy: Option.none(),
      userId: syntheticUser,
    },
    workspaceId,
  });

/** The same, as the WorkspaceAccess middleware hands it to handlers. */
export const memberOf = (
  workspaceId: WorkspaceId,
  permissions: readonly Permission[]
): Member => ({
  permissions,
  principal: { _tag: "user", impersonatedBy: null, userId: syntheticUser },
  workspaceId,
});

/** The cipher, with the synthetic keyring as ACME_TOKEN_KEYS. */
export const TokenCipherTest = TokenCipherLive.pipe(
  Layer.provide(
    ConfigProvider.layer(
      ConfigProvider.fromUnknown({ ACME_TOKEN_KEYS: syntheticKeyring })
    )
  )
);

/**
 * A guard that lets every request through, for clients talking to fake
 * platforms on loopback. The guard itself is tested on its own.
 */
export const OpenOutboundGuard = Layer.succeed(
  OutboundGuard,
  OutboundGuard.of({ check: () => Effect.void })
);

/** A notice a use case asked for. */
export interface RecordedNotice {
  readonly channelId: ChannelId;
  readonly expiresAt: Option.Option<DateTime.Utc>;
  readonly kind: "reconnectRequired" | "reconnectSoon";
}

/** The notices asked for, to assert on; and ChannelNotices recording them. */
export class RecordedNotices extends Context.Service<
  RecordedNotices,
  {
    readonly of: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly RecordedNotice[]>;
  }
>()("acme-server/test/channels/RecordedNotices") {
  static readonly layer = Layer.effectContext(
    Effect.gen(function* RecordedNoticesLive() {
      const sent = yield* Ref.make<
        readonly (RecordedNotice & { readonly workspaceId: WorkspaceId })[]
      >([]);

      const record = (
        channel: Channel,
        kind: RecordedNotice["kind"],
        expiresAt: Option.Option<DateTime.Utc>
      ) =>
        Ref.update(sent, (notices) => [
          ...notices,
          {
            channelId: channel.id,
            expiresAt,
            kind,
            workspaceId: channel.workspaceId,
          },
        ]);

      return Context.make(
        ChannelNotices,
        ChannelNotices.of({
          reconnectRequired: (channel) =>
            record(channel, "reconnectRequired", Option.none()),
          reconnectSoon: (channel, expiresAt) =>
            record(channel, "reconnectSoon", Option.some(expiresAt)),
        })
      ).pipe(
        Context.add(
          RecordedNotices,
          RecordedNotices.of({
            of: (workspaceId) =>
              Ref.get(sent).pipe(
                Effect.map((notices) =>
                  notices
                    .filter((notice) => notice.workspaceId === workspaceId)
                    .map(({ channelId, expiresAt, kind }) => ({
                      channelId,
                      expiresAt,
                      kind,
                    }))
                )
              ),
          })
        )
      );
    })
  );
}

/**
 * The Drizzle repository, seeing only one workspace's channels in the job
 * queries, which scan every workspace: suites running at once, and channels
 * left by earlier runs, stay out of a test's way.
 */
export const repositoryScopedTo = (workspaceId: WorkspaceId) => {
  const own = (found: readonly Channel[]) =>
    found.filter((channel) => channel.workspaceId === workspaceId);

  return Layer.effect(
    ChannelRepository,
    Effect.gen(function* scopedRepository() {
      const channels = yield* ChannelRepository;

      return ChannelRepository.of({
        ...channels,
        dueForRefresh: (request) =>
          channels
            .dueForRefresh({ ...request, limit: 100_000 })
            .pipe(Effect.map(own)),
        needingReconnect: (request) =>
          channels
            .needingReconnect({ ...request, limit: 100_000 })
            .pipe(Effect.map(own)),
      });
    })
  ).pipe(Layer.provide(DrizzleChannelRepository));
};
