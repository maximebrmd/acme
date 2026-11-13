import { Effect, Layer } from "effect";

import { AccountChannels } from "#billing/application/ports/account-channels.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { SharedPlatformAccounts } from "#channels/application/shared-platform-accounts.ts";

/** AccountChannels, as the channels context counts and lists them. */
export const ContextAccountChannelsLive = Layer.effect(
  AccountChannels,
  Effect.gen(function* ContextAccountChannelsLive() {
    const usage = yield* ChannelUsage;
    const shared = yield* SharedPlatformAccounts;

    return AccountChannels.of({
      ownIn: (workspaceIds) => usage.connectedIn(workspaceIds),
      sharedPage: (after, limit) => shared.page(after, limit),
    });
  })
);
