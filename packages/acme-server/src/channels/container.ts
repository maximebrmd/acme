import { Layer } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { RefreshChannelTokens } from "#channels/application/refresh-channel-tokens.ts";
import { WarnChannelsNeedingReconnect } from "#channels/application/warn-channels-needing-reconnect.ts";
import { DrizzleChannelRecords } from "#channels/infrastructure/drizzle-channel-records.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzleConnectAttempts } from "#channels/infrastructure/drizzle-connect-attempts.ts";
import { NotifiedChannelNotices } from "#channels/infrastructure/notified-channel-notices.ts";
import { ChannelPlatformsLive } from "#channels/infrastructure/platforms/channel-platform-settings.ts";
import { OAuthClientDocumentsLive } from "#channels/infrastructure/platforms/oauth-client-documents-live.ts";
import { PlatformAuthorizersLive } from "#channels/infrastructure/platforms/platform-authorizers.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import { TokenCipherLive } from "#channels/infrastructure/web-crypto-token-cipher.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";

// The platforms' sign-in flows, and the documents that identify Acme's
// clients, from the settings read at startup. Requests to servers a user
// chose go through the outbound guard, which needs Dns.
const PlatformsLive = Layer.mergeAll(
  PlatformAuthorizersLive,
  OAuthClientDocumentsLive
).pipe(
  Layer.provide(ChannelPlatformsLive),
  Layer.provide(OutboundGuard.layer),
  Layer.provide(
    Layer.mergeAll(
      FetchHttpClient.layer,
      SecureRandom.layerWebCrypto,
      Digest.layerWebCrypto
    )
  )
);

// The adapters behind the context's ports. The cipher reads ACME_TOKEN_KEYS
// when the server starts: it may be unset, as on a server that connects no
// channel, but a malformed keyring stops the server there, as do malformed
// Bluesky client keys.
const AdaptersLive = Layer.mergeAll(
  DrizzleChannelRecords,
  DrizzleChannelRepository,
  DrizzleConnectAttempts,
  SqlChannelLocks,
  NotifiedChannelNotices,
  PlatformsLive
).pipe(Layer.provideMerge(TokenCipherLive));

const UseCasesLive = Layer.mergeAll(
  ChannelAccess.layer,
  ListChannels.layer,
  DisconnectChannel.layer,
  ConnectChannel.layer,
  RefreshChannelTokens.layer,
  WarnChannelsNeedingReconnect.layer
);

/**
 * The channels context's use cases, and the adapters behind its ports
 * (ChannelRepository, TokenCipher, ...), which its other use cases and
 * workers share, and ChannelRecords for the workspace context. Needs the
 * database (Drizzle and SqlClient), migrated, Ids, Dns, and the
 * notifications context's Notify.
 */
export const ChannelsLive = UseCasesLive.pipe(Layer.provideMerge(AdaptersLive));

// The channels endpoints. They need the use cases ChannelsLive provides, and
// the Authentication and WorkspaceAccess middleware of the workspace context,
// which the composition root brings.
export {
  ChannelOAuthHandlers as ChannelOAuthApiLive,
  ChannelsHandlers as ChannelsApiLive,
} from "#channels/api/channels.ts";

/** The token refresh sweep and the daily reconnect warnings. */
export { ChannelsCronsLive } from "#channels/infrastructure/crons.ts";
