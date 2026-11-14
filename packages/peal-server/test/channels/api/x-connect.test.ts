// On a server that bills, connecting X without per-account pricing that
// pays is refused through the API with 402 UsageAllowanceReached.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api, UsageAllowanceReached } from "peal-contract";

import { ChannelsHandlers } from "#channels/api/channels.ts";
import { ChannelSettings } from "#channels/application/channel-settings.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type { PlatformAuthorizer } from "#channels/application/platform-authorizer.ts";
import { tokenPolicies } from "#channels/domain/token-policy.ts";
import { everyWorkspaceOn } from "#test/billing/support.ts";
import {
  authorizersOf,
  connectChannelWith,
  WordPressSitesTest,
} from "#test/channels/connect-support.ts";
import { freshWorkspace, memberOf } from "#test/channels/support.ts";
import { TransactionsTest } from "#test/notifications/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// X's sign-in, never reached: the refusal comes before it.
const untouchedX: PlatformAuthorizer = {
  begin: () => Effect.die("X is never asked"),
  complete: () => Effect.die("X is never asked"),
  platform: "x",
  policy: tokenPolicies.x,
  refresh: () => Effect.die("X is never asked"),
};

const FreeTierTest = Layer.mergeAll(
  ListChannels.layer,
  ChannelSettings.layer,
  DisconnectChannel.layer,
  WordPressSitesTest
).pipe(
  Layer.provideMerge(TransactionsTest),
  Layer.provideMerge(
    connectChannelWith(
      Layer.succeed(PlatformAuthorizers, authorizersOf(untouchedX)),
      everyWorkspaceOn("free")
    )
  )
);

layer(FreeTierTest)("connecting X on the free tier", (it) => {
  it.effect("answers 402 UsageAllowanceReached for X's meter", () =>
    Effect.gen(function* refused() {
      const workspaceId = yield* freshWorkspace;

      const client = yield* HttpApiTest.groups(Api, ["channels"]).pipe(
        Effect.provide(
          Layer.mergeAll(
            ChannelsHandlers.pipe(
              Layer.provideMerge(
                securityTest(memberOf(workspaceId, permissionsFor("owner")))
              )
            ),
            HttpServer.layerServices
          )
        )
      );

      const refusal = yield* client.channels
        .connect({ params: { platform: "x", workspaceId }, payload: {} })
        .pipe(Effect.flip);

      assert.instanceOf(refusal, UsageAllowanceReached);
      assert.deepInclude(refusal, {
        allowed: 0,
        meter: "xApi",
        reason: "paymentMethodRequired",
      });
    })
  );
});
