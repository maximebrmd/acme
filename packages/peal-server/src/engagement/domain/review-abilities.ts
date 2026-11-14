import type { InboxPlatforms } from "#shared/domain/inbox-platform.ts";
import { googleBusinessReviewScope } from "#shared/domain/inbox-platform.ts";
import type { Platform } from "#shared/domain/platform.ts";

import type { AbilityStanding } from "./engagement-abilities.ts";

/** What a location's channel can do about its reviews. */
export const reviewAbilities = ["read", "reply", "withdraw"] as const;

export type ReviewAbility = (typeof reviewAbilities)[number];

export type ReviewAbilities = Readonly<Record<ReviewAbility, AbilityStanding>>;

const all = (standing: AbilityStanding): ReviewAbilities => ({
  read: standing,
  reply: standing,
  withdraw: standing,
});

/** Whether Peal reads reviews on `platform` here: where the operator turned it on. */
export const readsReviewsOn = (
  platform: Platform,
  inbox: InboxPlatforms
): boolean => platform === "googleBusiness" && inbox.has("googleBusiness");

/**
 * What a channel can do about its reviews: everything on a Google
 * Business Profile location where the inbox reads them and the account
 * granted `business.manage`; `reconnect` without that scope; nothing
 * elsewhere. One scope reads, answers and deletes a reply.
 */
export const reviewAbilitiesOf = (
  platform: Platform,
  scopes: readonly string[],
  inbox: InboxPlatforms
): ReviewAbilities => {
  if (!readsReviewsOn(platform, inbox)) {
    return all("unsupported");
  }

  return all(
    scopes.includes(googleBusinessReviewScope) ? "available" : "reconnect"
  );
};
