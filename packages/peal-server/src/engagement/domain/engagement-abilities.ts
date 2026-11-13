import { Option, Schema } from "effect";

import { connectionOf } from "#shared/domain/channel-connection.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import {
  facebookCommentScopes,
  instagramLoginCommentScope,
  instagramPageCommentScope,
  linkedinCommentScopes,
  OptionalInboxPlatformSchema,
  youtubeCommentScope,
} from "#shared/domain/inbox-platform.ts";
import type {
  InboxPlatforms,
  OptionalInboxPlatform,
} from "#shared/domain/inbox-platform.ts";
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

// What the sign-ins of Mastodon and Bluesky ask for. A like and a hidden
// reply take scopes they do not ask for yet (Mastodon's `write:favourites`;
// Bluesky's `repo:app.bsky.feed.like` and `repo:app.bsky.feed.threadgate`):
// a channel has them only when its grant happens to hold them, and is
// `unsupported` otherwise, since reconnecting would change nothing.
const postingAbilities: readonly EngagementAbility[] = [
  "read",
  "reply",
  "withdraw",
];

// What the sign-ins of Facebook Pages, Instagram and YouTube ask for, as
// optional scopes, where the server reads them.
const optionalAbilities: readonly EngagementAbility[] = [
  ...postingAbilities,
  "hide",
];

/**
 * The platforms Peal reads comments on. A platform joins the list with its
 * reader, in the same change. Facebook Pages, Instagram and YouTube are
 * read only where the server's operator turned them on
 * (`PEAL_INBOX_PLATFORMS`, `InboxPlatforms`).
 */
export const engagedPlatforms = [
  "mastodon",
  "bluesky",
  "facebook",
  "instagram",
  "youtube",
  "linkedin",
] as const satisfies readonly Platform[];

export type EngagedPlatform = (typeof engagedPlatforms)[number];

export const isEngaged = (platform: Platform): platform is EngagedPlatform =>
  engagedPlatforms.some((engaged) => engaged === platform);

const isOptional = (platform: Platform): platform is OptionalInboxPlatform =>
  OptionalInboxPlatformSchema.literals.some(
    (optional) => optional === platform
  );

/**
 * Whether this server reads comments on `platform`: Mastodon and Bluesky
 * always, Facebook Pages, Instagram and YouTube where `inbox` names them.
 */
export const readsCommentsOn = (
  platform: Platform,
  inbox: InboxPlatforms
): platform is EngagedPlatform =>
  isEngaged(platform) && (!isOptional(platform) || inbox.has(platform));

// Whether a channel is a LinkedIn company page: a profile's comments are
// not read (LinkedIn closes the permission that reads a member's own
// posts), and no sign-in of a profile asks for them.
const isLinkedInPage = (connection: Option.Option<ChannelConnection>) =>
  Option.contains(connectionOf("linkedin", connection), "linkedinPage");

/**
 * The abilities whose scopes this server's sign-in for `platform` (by
 * `connection`, LinkedIn's page or profile) asks for: a channel without
 * them was connected before, and gets them by connecting again. None on a
 * platform the server reads no comments on, nor on a LinkedIn profile.
 * An ability joins a platform's list in the change that adds its scope to
 * the platform's authorizer.
 */
export const askedAtSignIn = (
  platform: Platform,
  inbox: InboxPlatforms,
  connection: Option.Option<ChannelConnection> = Option.none()
): readonly EngagementAbility[] => {
  if (!readsCommentsOn(platform, inbox)) {
    return [];
  }

  if (platform === "linkedin") {
    return isLinkedInPage(connection) ? postingAbilities : [];
  }

  return isOptional(platform) ? optionalAbilities : postingAbilities;
};

// Whether the grant holds one of the scopes that allow an ability.
const grantedOn =
  (asked: readonly EngagementAbility[]) =>
  (
    ability: EngagementAbility,
    scopes: readonly string[],
    allowing: (scope: string) => boolean
  ): AbilityStanding => {
    if (scopes.some(allowing)) {
      return "available";
    }

    return asked.includes(ability) ? "reconnect" : "unsupported";
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
 * What a channel can do, from its platform, the scopes its account
 * granted, and the optional platforms the server reads (`inbox`):
 *
 * - Mastodon: replies to a public status are read without a token; a
 *   reply is a status (`write:statuses`), which its author can delete; a
 *   favourite needs `write:favourites`. Mastodon lets nobody hide or
 *   delete another account's reply.
 * - Bluesky: replies are read from the public AppView; a reply is a post
 *   record the account creates and deletes; a like is a record of its
 *   own, and hiding a reply writes the post's thread gate, each with its
 *   own permission. Nobody deletes another account's record.
 * - Facebook Pages: comments are read with `pages_read_user_content`;
 *   answering, withdrawing an answer and hiding a comment take
 *   `pages_manage_engagement`. Likes and deleting someone's comment are
 *   not done yet.
 * - Instagram: reading, answering, withdrawing and hiding take the
 *   comments permission of the account's way in
 *   (`instagram_manage_comments` through a Page,
 *   `instagram_business_manage_comments` through Instagram Login). The API
 *   has no like; deleting someone's comment is not done yet.
 * - YouTube: reading, answering, withdrawing an answer and hiding a
 *   comment (rejecting it) take `youtube.force-ssl`, the one scope the
 *   discovery document lists for every comment method. The API has no
 *   like, and only a comment's author deletes it.
 * - LinkedIn: a company page's comments are read with
 *   `r_organization_social_feed`, answered and withdrawn with
 *   `w_organization_social_feed`; the pages read give no hide, a like is
 *   not done yet, and nobody deletes another member's comment. A profile
 *   (`connection`) has none of them, and reconnecting would not change it.
 */
export const abilitiesOf = (
  platform: Platform,
  scopes: readonly string[],
  inbox: InboxPlatforms,
  connection: Option.Option<ChannelConnection> = Option.none()
): EngagementAbilities => {
  if (!readsCommentsOn(platform, inbox)) {
    return none;
  }

  const granted = grantedOn(askedAtSignIn(platform, inbox, connection));

  if (platform === "linkedin") {
    if (!isLinkedInPage(connection)) {
      return none;
    }

    const writing = oneOf(linkedinCommentScopes.write);

    return {
      delete: "unsupported",
      hide: "unsupported",
      like: "unsupported",
      read: granted("read", scopes, oneOf(linkedinCommentScopes.read)),
      reply: granted("reply", scopes, writing),
      withdraw: granted("withdraw", scopes, writing),
    };
  }

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

  if (platform === "facebook") {
    const managing = oneOf(facebookCommentScopes.manage);

    return {
      delete: "unsupported",
      hide: granted("hide", scopes, managing),
      like: "unsupported",
      read: granted("read", scopes, oneOf(facebookCommentScopes.read)),
      reply: granted("reply", scopes, managing),
      withdraw: granted("withdraw", scopes, managing),
    };
  }

  if (platform === "youtube") {
    const commenting = oneOf(youtubeCommentScope);

    return {
      delete: "unsupported",
      hide: granted("hide", scopes, commenting),
      like: "unsupported",
      read: granted("read", scopes, commenting),
      reply: granted("reply", scopes, commenting),
      withdraw: granted("withdraw", scopes, commenting),
    };
  }

  const commenting = oneOf(
    instagramPageCommentScope,
    instagramLoginCommentScope
  );

  return {
    delete: "unsupported",
    hide: granted("hide", scopes, commenting),
    like: "unsupported",
    read: granted("read", scopes, commenting),
    reply: granted("reply", scopes, commenting),
    withdraw: granted("withdraw", scopes, commenting),
  };
};
