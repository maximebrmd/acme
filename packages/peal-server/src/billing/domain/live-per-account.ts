import { Option } from "effect";

import { billsAt } from "./subscription.ts";
import type { Subscription } from "./subscription.ts";

/**
 * The per-account pricing subscription a billing workspace holds that
 * Stripe may still bill (any status but cancelled or never completed,
 * past due and unpaid included), if any: an account has one at most, so
 * none other is ordered or kept.
 */
export const livePerAccount = (
  subscriptions: readonly Subscription[]
): Option.Option<Subscription> =>
  Option.fromUndefinedOr(
    subscriptions.find(
      ({ plan, status }) => plan === "payAsYouGo" && billsAt(status)
    )
  );
