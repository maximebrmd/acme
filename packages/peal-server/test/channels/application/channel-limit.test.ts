// A workspace's plan limits the channels it connects. Reconnecting adds no
// channel, so it needs no room.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import type { AuthorizationCallback } from "#channels/application/platform-authorizer.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import { everyWorkspaceOn } from "#test/billing/support.ts";
import {
  connectChannelWith,
  connectedChannel,
  MastodonAuthorizersTest,
} from "#test/channels/connect-support.ts";
import { fakeMastodon } from "#test/channels/fakes/fake-mastodon.ts";
import {
  actorIn,
  freshChannel,
  freshWorkspace,
  OpenOutboundGuard,
  syntheticCredentials,
} from "#test/channels/support.ts";

// The free plan, which allows 3 channels.
const FreePlanTest = connectChannelWith(
  MastodonAuthorizersTest.pipe(Layer.provide(OpenOutboundGuard)),
  everyWorkspaceOn("free")
);

const freeChannels = 3;

const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read", "channel:connect"]);

const callbackOf = (back: {
  readonly code?: string;
  readonly state: string;
}): AuthorizationCallback => ({
  code: Option.fromUndefinedOr(back.code),
  error: Option.none(),
  issuer: Option.none(),
  state: back.state,
});

// Synthetic channels, connected without the platform.
const fill = Effect.fn("fill")(function* fill(
  workspaceId: WorkspaceId,
  count: number
) {
  const repository = yield* ChannelRepository;

  for (let added = 0; added < count; added += 1) {
    const channel = yield* freshChannel(workspaceId);

    yield* repository.insert(channel, syntheticCredentials(channel));
  }
});

const limitReached = new PlanLimitReached({
  allowed: freeChannels,
  limit: "channels",
});

layer(FreePlanTest)("connecting channels on the free plan", (it) => {
  it.effect("refuses a new account once the plan's channels are taken", () =>
    Effect.gen(function* full() {
      const instance = yield* fakeMastodon();
      const workspaceId = yield* freshWorkspace;
      const connect = yield* ConnectChannel;

      yield* fill(workspaceId, freeChannels);

      const refused = yield* connect
        .start(manager(workspaceId), "mastodon", {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.some(instance.url),
        })
        .pipe(Effect.flip);

      assert.deepStrictEqual(refused, limitReached);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "refuses the account when the last channel was taken while connecting",
    () =>
      Effect.gen(function* raced() {
        const instance = yield* fakeMastodon();
        const workspaceId = yield* freshWorkspace;
        const connect = yield* ConnectChannel;

        yield* fill(workspaceId, freeChannels - 1);

        const authorizationUrl = yield* connect.start(
          manager(workspaceId),
          "mastodon",
          {
            connection: Option.none(),
            handle: Option.none(),
            instance: Option.some(instance.url),
          }
        );

        yield* fill(workspaceId, 1);

        const refused = yield* connect
          .complete(
            manager(workspaceId),
            "mastodon",
            callbackOf(instance.approve(authorizationUrl))
          )
          .pipe(Effect.flip);

        assert.deepStrictEqual(refused, limitReached);

        const channels = yield* ChannelRepository.use((repository) =>
          repository.list(workspaceId)
        );

        assert.lengthOf(channels, freeChannels);
      }).pipe(Effect.scoped)
  );

  it.effect("takes back an account the workspace has, at its limit", () =>
    Effect.gen(function* reconnects() {
      const instance = yield* fakeMastodon();
      const workspaceId = yield* freshWorkspace;
      const connect = yield* ConnectChannel;

      const begin = connect.start(manager(workspaceId), "mastodon", {
        connection: Option.none(),
        handle: Option.none(),
        instance: Option.some(instance.url),
      });

      const channel = yield* connect
        .complete(
          manager(workspaceId),
          "mastodon",
          callbackOf(instance.approve(yield* begin))
        )
        .pipe(Effect.flatMap(connectedChannel));

      yield* fill(workspaceId, freeChannels - 2);

      const again = yield* begin;

      yield* fill(workspaceId, 1);

      // The same account: its channel takes the new tokens, and no channel
      // is added.
      const reconnected = yield* connect
        .complete(
          manager(workspaceId),
          "mastodon",
          callbackOf(instance.approve(again))
        )
        .pipe(Effect.flatMap(connectedChannel));

      assert.strictEqual(reconnected.id, channel.id);
    }).pipe(Effect.scoped)
  );
});
