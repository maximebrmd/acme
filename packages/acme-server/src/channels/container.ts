import { Layer } from "effect";

import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { TokenCipherLive } from "#channels/infrastructure/web-crypto-token-cipher.ts";

// The adapters behind the context's ports. The cipher reads ACME_TOKEN_KEYS
// when the server starts: it may be unset, as on a server that connects no
// channel, but a malformed keyring stops the server there.
const AdaptersLive = Layer.mergeAll(DrizzleChannelRepository, TokenCipherLive);

const UseCasesLive = Layer.mergeAll(
  ListChannels.layer,
  DisconnectChannel.layer
);

/**
 * The channels context's use cases, and the adapters behind its ports
 * (ChannelRepository, TokenCipher), which its other use cases and workers
 * share. Needs the database (Drizzle), migrated.
 */
export const ChannelsLive = UseCasesLive.pipe(Layer.provideMerge(AdaptersLive));

// The channels endpoints. They need the use cases ChannelsLive provides, and
// the Authentication and WorkspaceAccess middleware of the workspace context,
// which the composition root brings.
export { ChannelsHandlers as ChannelsApiLive } from "#channels/api/channels.ts";
