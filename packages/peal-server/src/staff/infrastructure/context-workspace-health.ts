import { Effect, Layer, Option } from "effect";

import { AdOversight } from "#ads/application/ad-oversight.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { ChannelOversight } from "#channels/application/channel-oversight.ts";
import { PostOversight } from "#publishing/application/post-oversight.ts";
import { WorkspaceHealth } from "#staff/application/ports/workspace-health.ts";
import { WebhookOversight } from "#webhooks/application/webhook-oversight.ts";

import { healthOf } from "./channel-health.ts";
import { webhookHealthOf } from "./webhook-health.ts";

/**
 * A workspace's health from the contexts that hold it: billing's plan,
 * the channels, publishing's counts and troubles, and the webhook
 * endpoints, by their host.
 */
export const ContextWorkspaceHealth = Layer.effect(
  WorkspaceHealth,
  Effect.gen(function* ContextWorkspaceHealth() {
    const entitlements = yield* WorkspaceEntitlements;
    const channels = yield* ChannelOversight;
    const posts = yield* PostOversight;
    const webhooks = yield* WebhookOversight;
    const ads = yield* AdOversight;

    return WorkspaceHealth.of({
      ads: (workspaceId) =>
        ads.ofWorkspace(workspaceId).pipe(
          Effect.map(({ accounts, boosts }) => ({
            accounts: accounts.map(({ account, authorization }) => ({
              access: account.access,
              currency: account.currency,
              id: account.id,
              monthlyCeiling:
                authorization._tag === "on"
                  ? Option.some(authorization.monthlyCeiling)
                  : Option.none(),
              network: account.network,
              status: account.status,
            })),
            boosts,
          }))
        ),
      billing: (workspaceId) =>
        entitlements.of(workspaceId).pipe(
          Effect.map(({ plan, subscription }) => ({
            plan,
            subscription: subscription.pipe(
              Option.map((bought) => ({
                cancelAtPeriodEnd: bought.cancelAtPeriodEnd,
                currentPeriodEnd: bought.currentPeriodEnd,
                endsAt: bought.endsAt,
                interval: bought.interval,
                plan: bought.plan,
                startedAt: bought.startedAt,
                status: bought.status,
                trialEnd: bought.trialEnd,
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
      webhooks: (workspaceId) =>
        webhooks
          .ofWorkspace(workspaceId)
          .pipe(Effect.map((found) => found.map(webhookHealthOf))),
    });
  })
);
