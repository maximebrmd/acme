import { Layer } from "effect";
import { Digest, Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import { ChannelOversight } from "#channels/application/channel-oversight.ts";
import { ChannelOverview } from "#channels/application/channel-overview.ts";
import { ChannelSettings } from "#channels/application/channel-settings.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import { ConnectLinks } from "#channels/application/connect-links.ts";
import { DeauthorizePlatformUser } from "#channels/application/deauthorize-platform-user.ts";
import { DeletePlatformUserData } from "#channels/application/delete-platform-user-data.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { ForgetTokenOwners } from "#channels/application/forget-token-owners.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { PurgeConnectLinks } from "#channels/application/purge-connect-links.ts";
import { RefreshChannelTokens } from "#channels/application/refresh-channel-tokens.ts";
import { WarnChannelsNeedingReconnect } from "#channels/application/warn-channels-needing-reconnect.ts";
import { analyticsChannelEvents } from "#channels/infrastructure/analytics-channel-events.ts";
import { DrizzleChannelDirectory } from "#channels/infrastructure/drizzle-channel-directory.ts";
import { DrizzleChannelOverviewReads } from "#channels/infrastructure/drizzle-channel-overview-reads.ts";
import { DrizzleChannelRecords } from "#channels/infrastructure/drizzle-channel-records.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzleConnectAttempts } from "#channels/infrastructure/drizzle-connect-attempts.ts";
import { DrizzleConnectChoices } from "#channels/infrastructure/drizzle-connect-choices.ts";
import { DrizzleConnectLinkStore } from "#channels/infrastructure/drizzle-connect-link-store.ts";
import { DrizzleDataDeletions } from "#channels/infrastructure/drizzle-data-deletions.ts";
import { engagementChannelEvents } from "#channels/infrastructure/engagement-channel-events.ts";
import { NotifiedChannelNotices } from "#channels/infrastructure/notified-channel-notices.ts";
import { PartnerLinkHosts } from "#channels/infrastructure/partner-link-hosts.ts";
import { SharedChannelAllowanceLive } from "#channels/infrastructure/plan-channel-allowance.ts";
import { ChannelPlatformsLive } from "#channels/infrastructure/platforms/channel-platform-settings.ts";
import { MetaSignedRequestsLive } from "#channels/infrastructure/platforms/meta/meta-signed-requests.ts";
import { OAuthClientDocumentsLive } from "#channels/infrastructure/platforms/oauth-client-documents-live.ts";
import { PlatformAuthorizersLive } from "#channels/infrastructure/platforms/platform-authorizers.ts";
import { PublicConnectLinkAddresses } from "#channels/infrastructure/public-connect-link-addresses.ts";
import { PublicDataDeletionLinks } from "#channels/infrastructure/public-data-deletion-links.ts";
import { RandomConnectLinkTokens } from "#channels/infrastructure/random-connect-link-tokens.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import { TokenCipherLive } from "#channels/infrastructure/web-crypto-token-cipher.ts";
import {
  WebhookChannelEvents,
  webhookChannelNotices,
} from "#channels/infrastructure/webhook-channel-events.ts";
import { InboxPlatformsLive } from "#shared/infrastructure/inbox-platforms.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";

// Who hears of a channel connected or gone: the workspace's webhook
// endpoints, then the analytics context, which keeps or deletes the
// channel's numbers, then the engagement context, which forgets the
// comments a bounding platform gave under its posts. Needs WebhookEvents,
// AnalyticsRecords and EngagementRecords.
const ChannelEventsLive = engagementChannelEvents(
  analyticsChannelEvents(WebhookChannelEvents)
);

// The platforms' sign-in flows, the documents that identify Peal's
// clients, and the check of Meta's signed requests, from the settings read
// at startup (PEAL_INBOX_PLATFORMS among them, for the comment permissions
// Meta's sign-ins ask). Requests to servers a user chose go through the
// outbound guard, which needs Dns.
const PlatformsLive = Layer.mergeAll(
  PlatformAuthorizersLive,
  OAuthClientDocumentsLive,
  MetaSignedRequestsLive
).pipe(
  Layer.provide(ChannelPlatformsLive),
  Layer.provide(InboxPlatformsLive),
  Layer.provide(OutboundGuard.layer),
  Layer.provide(
    Layer.mergeAll(
      FetchHttpClient.layer,
      Mac.layerWebCrypto,
      Digest.layerWebCrypto
    ).pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))
  )
);

// The adapters behind the context's ports. The cipher reads PEAL_TOKEN_KEYS
// when the server starts: it may be unset, as on a server that connects no
// channel, but a malformed keyring stops the server there, as do malformed
// Bluesky client keys or Meta app settings.
const AdaptersLive = Layer.mergeAll(
  DrizzleChannelRecords,
  DrizzleChannelRepository,
  DrizzleChannelDirectory,
  DrizzleConnectAttempts,
  DrizzleConnectChoices,
  DrizzleConnectLinkStore,
  RandomConnectLinkTokens,
  PublicConnectLinkAddresses,
  PartnerLinkHosts,
  DrizzleDataDeletions.pipe(Layer.provide(ChannelEventsLive)),
  PublicDataDeletionLinks,
  SqlChannelLocks,
  webhookChannelNotices(NotifiedChannelNotices),
  ChannelEventsLive,
  SharedChannelAllowanceLive,
  PlatformsLive
).pipe(Layer.provideMerge(TokenCipherLive));

const UseCasesLive = Layer.mergeAll(
  ChannelAccess.layer,
  ChannelOversight.layer,
  ListChannels.layer,
  ChannelSettings.layer,
  DisconnectChannel.layer,
  // The links' sign-ins are ConnectChannel's, and their retention the
  // links' own.
  PurgeConnectLinks.layer.pipe(
    Layer.provideMerge(ConnectLinks.layer),
    Layer.provideMerge(ConnectChannel.layer)
  ),
  ChannelUsage.layer,
  DeletePlatformUserData.layer,
  DeauthorizePlatformUser.layer,
  RefreshChannelTokens.layer,
  WarnChannelsNeedingReconnect.layer,
  // Where the inbox no longer reads LinkedIn, PEAL_INBOX_PLATFORMS says.
  ForgetTokenOwners.layer.pipe(Layer.provide(InboxPlatformsLive))
);

/**
 * The channels context's use cases, and the adapters behind its ports
 * (ChannelRepository, TokenCipher, ...), which its other use cases and
 * workers share, ChannelRecords for the workspace context, and
 * ChannelOversight for the staff console. Needs the
 * database (Drizzle and SqlClient), migrated, Ids, Dns, the notifications
 * context's Notify, the webhooks context's WebhookEvents, the billing
 * context's WorkspaceEntitlements, the workspace context's
 * PartnerOwnership and a ConnectLinkJournal.
 */
export const ChannelsLive = UseCasesLive.pipe(Layer.provideMerge(AdaptersLive));

/**
 * The channels of several workspaces at once, by status, and their
 * platforms, for the view across a person's workspaces (ChannelOverview).
 * Needs the database (Drizzle).
 */
export const ChannelOverviewLive = ChannelOverview.layer.pipe(
  Layer.provide(DrizzleChannelOverviewReads)
);

// The channels endpoints. They need the use cases ChannelsLive provides, and
// the Authentication and WorkspaceAccess middleware of the workspace context,
// which the composition root brings.
export {
  ChannelOAuthHandlers as ChannelOAuthApiLive,
  ChannelsHandlers as ChannelsApiLive,
} from "#channels/api/channels.ts";

/**
 * The connect links' endpoints: a workspace's own, behind the workspace
 * context's middleware, and the hosted pages', which anyone holding a
 * link's token calls, behind the intake the composition root brings.
 */
export {
  ConnectLinksHandlers as ConnectLinksApiLive,
  HostedConnectHandlers as HostedConnectApiLive,
} from "#channels/api/connect-links.ts";

/**
 * Meta's data deletion and deauthorization callbacks, which Meta calls
 * without signing in.
 */
export { DataDeletionHandlers as DataDeletionApiLive } from "#channels/api/data-deletion.ts";

/**
 * The cipher that encrypts channel tokens with the server's keyring, for
 * the webhooks context's signing secrets too.
 */
export { TokenCipherLive } from "#channels/infrastructure/web-crypto-token-cipher.ts";

/**
 * The token refresh sweep, the daily reconnect warnings, connect links'
 * retention and the daily forgetting of LinkedIn pages' token owners.
 */
export { ChannelsCronsLive } from "#channels/infrastructure/crons.ts";

/**
 * ConnectLinkJournal in the workspaces' activity logs. Needs the activity
 * context's ActivityLog.
 */
export { LoggedConnectLinkJournal as ConnectLinkJournalLive } from "#channels/infrastructure/logged-connect-link-journal.ts";
