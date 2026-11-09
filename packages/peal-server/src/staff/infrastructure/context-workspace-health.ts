import { Effect, Layer, Option } from "effect";

import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ChannelOversight } from "#channels/application/channel-oversight.ts";
import { PostOversight } from "#publishing/application/post-oversight.ts";
import { WorkspaceHealth } from "#staff/application/ports/workspace-health.ts";

import { healthOf } from "./channel-health.ts";

/**
 * A workspace's health from the contexts that hold it: billing's plan,
 * the channels and publishing's counts and troubles.
 */
export const ContextWorkspaceHealth = Layer.effect(
  WorkspaceHealth,
  Effect.gen(function* ContextWorkspaceHealth() {
    const entitlements = yield* WorkspaceEntitlements;
    const channels = yield* ChannelOversight;
    const posts = yield* PostOversight;

    return WorkspaceHealth.of({
      billing: (workspaceId) =>
        entitlements.of(workspaceId).pipe(
          Effect.map(({ plan, subscription }) => ({
            plan,
            subscription: subscription.pipe(
              Option.map((bought) => ({
                cancelAtPeriodEnd: bought.cancelAtPeriodEnd,
                currentPeriodEnd: bought.currentPeriodEnd,
                plan: bought.plan,
                status: bought.status,
              }))
            ),
          }))
        ),
      channels: (workspaceId) =>
        channels
          .ofWorkspace(workspaceId)
          .pipe(Effect.map((found) => found.map(healthOf))),
      posts: (workspaceId) => posts.counts(workspaceId),
      troubles: (workspaceId, limit) =>
        posts.troubles(workspaceId, limit).pipe(
          Effect.map((found) =>
            found.map((trouble) => ({
              ...trouble,
              code: trouble.status === "failed" ? trouble.code : Option.none(),
            }))
          )
        ),
    });
  })
);
