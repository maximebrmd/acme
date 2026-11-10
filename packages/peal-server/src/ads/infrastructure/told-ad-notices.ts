import { DateTime, Effect, Layer, Option } from "effect";

import { AdNotices } from "#ads/application/ports/ad-notices.ts";
import type { AdAccount } from "#ads/domain/ad-account.ts";
import type { Boost } from "#ads/domain/boost.ts";
import { minorUnitDigits } from "#ads/domain/money.ts";
import { Notify } from "#notifications/application/notify.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";

// What a boost event carries: ids, amounts and where the boost stands.
// Never its audience, nor who benefits from or pays for the ad.
const dataOf = (boost: Boost) => ({
  adAccountId: boost.adAccountId,
  boostId: boost.id,
  budget: { amount: boost.budget.amount, kind: boost.budget._tag },
  committed: boost.committed,
  currency: boost.currency,
  endsAt: boost.endsAt,
  postId: boost.postId,
  reason: boost.state._tag === "failed" ? boost.state.reason : null,
  state: boost.state._tag,
  workspaceId: boost.workspaceId,
});

const eventTypes = {
  budgetReached: "boost.budget_reached",
  ended: "boost.ended",
  failed: "boost.failed",
  paused: "boost.paused",
  resumed: "boost.resumed",
  started: "boost.started",
  stopped: "boost.stopped",
  unconfirmed: "boost.unconfirmed",
} as const;

const keyOf = (boost: Boost, what: string) =>
  `boost:${boost.id}:${what}:${DateTime.formatIso(boost.updatedAt)}`;

// Who is told failing to be listed fails the fact's transaction, as a
// failing database would.
const told = <A>(
  notifying: Effect.Effect<A, DatabaseError | { readonly _tag: string }>
) =>
  notifying.pipe(
    Effect.mapError((failure) =>
      failure instanceof DatabaseError
        ? failure
        : new DatabaseError({ cause: failure })
    ),
    Effect.asVoid
  );

/**
 * What happens to a workspace's ads, told through the notifications
 * context (in the app and by email, to the owners for a boost, to those
 * who manage ad accounts for a sign-in) and to the workspace's webhook
 * endpoints, once per fact, in the transaction that records it. The key
 * names the boost, what happened and when its state changed, so a boost
 * paused twice is told twice, and one fact told again is told once.
 */
export const ToldAdNotices = Layer.effect(
  AdNotices,
  Effect.gen(function* ToldAdNotices() {
    const notices = yield* Notify;
    const webhooks = yield* WebhookEvents;

    const publish = (boost: Boost, what: keyof typeof eventTypes) =>
      webhooks.publish({
        event: { data: dataOf(boost), type: eventTypes[what] },
        key: keyOf(boost, what),
      });

    return AdNotices.of({
      boost: (boost: Boost, account: AdAccount, news) =>
        told(
          notices.notify({
            event: {
              _tag: "AdBoostChanged",
              boostId: boost.id,
              budget: {
                amount: boost.budget.amount,
                currency: boost.currency,
              },
              budgetDigits: minorUnitDigits(account.network, account.currency),
              change: news,
              endsAt: boost.endsAt,
              postId: boost.postId,
              reason:
                boost.state._tag === "failed"
                  ? Option.some(boost.state.reason)
                  : Option.none(),
            },
            key: keyOf(boost, news),
            workspaceId: boost.workspaceId,
          })
        ).pipe(Effect.andThen(publish(boost, news))),
      boostChanged: (boost, _account, change) => publish(boost, change),
      reconnectNeeded: (grant) =>
        told(
          notices.notify({
            event: {
              _tag: "AdConnectionReconnectRequired",
              network: grant.network,
            },
            key: `ad-grant:${grant.id}:reconnect:${DateTime.formatIso(grant.updatedAt)}`,
            workspaceId: grant.workspaceId,
          })
        ),
    });
  })
);
