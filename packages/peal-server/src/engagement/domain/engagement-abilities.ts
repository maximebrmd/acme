import { Schema } from "effect";

import type { Platform } from "#shared/domain/platform.ts";

/**
 * What a channel's account can do about the comments under its posts:
 *
 * - `read`: Peal collects them.
 * - `reply`: answer one, publicly, as the account.
 * - `withdraw`: delete a reply sent from Peal.
 * - `like`: like a comment as the account, and take the like back.
 * - `hide`: hide someone's comment under the account's post, and show it
 *   again.
 * - `delete`: delete someone else's comment under the account's post.
 */
export const EngagementAbilitySchema = Schema.Literals([
  "read",
  "reply",
  "withdraw",
  "like",
  "hide",
  "delete",
]);

export type EngagementAbility = typeof EngagementAbilitySchema.Type;

/**
 * Whether a channel has an ability:
 *
 * - `available`: yes.
 * - `reconnect`: its platform has it, and the account must be connected
 *   again to allow it: it was connected before Peal asked for it.
 * - `unsupported`: its platform does not offer it to the account, or Peal
 *   does not do it there yet.
 */
export const AbilityStandingSchema = Schema.Literals([
  "available",
  "reconnect",
  "unsupported",
]);

export type AbilityStanding = typeof AbilityStandingSchema.Type;

export type EngagementAbilities = Readonly<
  Record<EngagementAbility, AbilityStanding>
>;

/** The abilities, in the order clients list them. */
export const engagementAbilities: readonly EngagementAbility[] =
  EngagementAbilitySchema.literals;

const none: EngagementAbilities = {
  delete: "unsupported",
  hide: "unsupported",
  like: "unsupported",
  read: "unsupported",
  reply: "unsupported",
  withdraw: "unsupported",
};

/**
 * The abilities whose scopes Peal's sign-in asks for today, on every
 * platform it reads comments on: a channel without them was connected
 * before, and gets them by connecting again. A like and a hidden reply
 * take scopes the sign-ins do not ask for yet (Mastodon's
 * `write:favourites`; Bluesky's `repo:app.bsky.feed.like` and
 * `repo:app.bsky.feed.threadgate`): a channel has them only when its
 * grant happens to hold them, and is `unsupported` otherwise, since
 * reconnecting would change nothing. An ability joins this list in the
 * change that adds its scope to the platform's authorizer.
 */
export const askedAtSignIn: readonly EngagementAbility[] = [
  "read",
  "reply",
  "withdraw",
];

// Whether the grant holds one of the scopes that allow an ability.
const granted = (
  ability: EngagementAbility,
  scopes: readonly string[],
  allowing: (scope: string) => boolean
): AbilityStanding => {
  if (scopes.some(allowing)) {
    return "available";
  }

  return askedAtSignIn.includes(ability) ? "reconnect" : "unsupported";
};

const oneOf =
  (...names: readonly string[]) =>
  (scope: string) =>
    names.includes(scope);

// An AT Protocol permission to write records of a collection:
// `repo:<collection>`, with or without the actions it is limited to.
const repo = (collection: string) => (scope: string) =>
  scope === "transition:generic" ||
  scope === `repo:${collection}` ||
  scope.startsWith(`repo:${collection}?`);

/**
 * The platforms Peal reads comments on. A platform joins the list with its
 * reader, in the same change.
 */
export const engagedPlatforms = [
  "mastodon",
  "bluesky",
] as const satisfies readonly Platform[];

export type EngagedPlatform = (typeof engagedPlatforms)[number];

export const isEngaged = (platform: Platform): platform is EngagedPlatform =>
  engagedPlatforms.some((engaged) => engaged === platform);

/**
 * What a channel can do, from its platform and the scopes its account
 * granted:
 *
 * - Mastodon: replies to a public status are read without a token; a
 *   reply is a status (`write:statuses`), which its author can delete; a
 *   favourite needs `write:favourites`. Mastodon lets nobody hide or
 *   delete another account's reply.
 * - Bluesky: replies are read from the public AppView; a reply is a post
 *   record the account creates and deletes; a like is a record of its
 *   own, and hiding a reply writes the post's thread gate, each with its
 *   own permission. Nobody deletes another account's record.
 */
export const abilitiesOf = (
  platform: Platform,
  scopes: readonly string[]
): EngagementAbilities => {
  if (platform === "mastodon") {
    const posting = oneOf("write", "write:statuses");

    return {
      delete: "unsupported",
      hide: "unsupported",
      like: granted("like", scopes, oneOf("write", "write:favourites")),
      read: "available",
      reply: granted("reply", scopes, posting),
      withdraw: granted("withdraw", scopes, posting),
    };
  }

  if (platform === "bluesky") {
    const posting = repo("app.bsky.feed.post");

    return {
      delete: "unsupported",
      hide: granted("hide", scopes, repo("app.bsky.feed.threadgate")),
      like: granted("like", scopes, repo("app.bsky.feed.like")),
      read: "available",
      reply: granted("reply", scopes, posting),
      withdraw: granted("withdraw", scopes, posting),
    };
  }

  return none;
};
