import { Schema } from "effect";

/**
 * The platforms whose comments the inbox reads only where the server's
 * operator turned them on (`PEAL_INBOX_PLATFORMS`): their platforms grant
 * the permissions they take to an app only after a review (Meta's App
 * Review; Google's verification of a sensitive scope for YouTube;
 * LinkedIn's Community Management review for company pages; Google's
 * access to the Business Profile APIs, whose quota is zero until Google
 * grants it, for a location's reviews), so a server offers them once its
 * app holds them. Mastodon and Bluesky need no such grant, and are always
 * read.
 */
export const OptionalInboxPlatformSchema = Schema.Literals([
  "facebook",
  "instagram",
  "youtube",
  "linkedin",
  "googleBusiness",
]);

export type OptionalInboxPlatform = typeof OptionalInboxPlatformSchema.Type;

/** The optional platforms a server reads comments on. */
export type InboxPlatforms = ReadonlySet<OptionalInboxPlatform>;

/**
 * The permissions a Facebook Page's comments take (Meta's Permissions
 * reference, developers.facebook.com/docs/permissions, read 2026-11-12):
 * `pages_read_user_content` reads "user generated content on the Page,
 * such as posts, comments, and ratings", and `pages_manage_engagement`
 * "create, edit and delete comments posted on the Page". Both are asked as
 * optional at sign-in where the inbox reads Facebook.
 */
export const facebookCommentScopes = {
  manage: "pages_manage_engagement",
  read: "pages_read_user_content",
} as const;

/**
 * The permission an Instagram account's comments take through a Page
 * (Facebook Login; the IG Comment reference, read 2026-11-12): read,
 * answer, hide and delete.
 */
export const instagramPageCommentScope = "instagram_manage_comments";

/**
 * The permission an Instagram account's comments take through Instagram
 * Login (the same reference): read, answer, hide and delete.
 */
export const instagramLoginCommentScope = "instagram_business_manage_comments";

/**
 * The scope a YouTube channel's comments take. Google's discovery document
 * of the YouTube Data API v3
 * (youtube.googleapis.com/$discovery/rest?version=v3, read 2026-11-12)
 * lists it, and it alone, for `commentThreads.list`, `comments.list`,
 * `comments.insert`, `comments.delete` and
 * `comments.setModerationStatus`; the references of those methods
 * (developers.google.com/youtube/v3/docs/comments, read the same day)
 * name it too. Neither `youtube.upload` nor `youtube.readonly`, which the
 * sign-in asks for publishing, reads comments. Asked as optional at
 * sign-in where the inbox reads YouTube; Google verifies an app that asks
 * for it.
 */
export const youtubeCommentScope =
  "https://www.googleapis.com/auth/youtube.force-ssl";

/**
 * The permissions a LinkedIn company page's comments take, from the
 * Comments API reference (learn.microsoft.com/en-us/linkedin/marketing/
 * community-management/shares/comments-api, dated 2026-04-28, version
 * 2026-10, read 2026-11-12): `r_organization_social_feed` to "Retrieve
 * organizations' posts, comments, and reactions" and
 * `w_organization_social_feed` to "Post, comment, and react on posts on
 * behalf of an organization". Granted with the Community Management API
 * (…/marketing/increasing-access, dated 2026-10-14). Asked at the pages'
 * sign-in where the inbox reads LinkedIn; a member's own posts cannot be
 * read (`r_member_social` is closed), so LinkedIn is pages only.
 */
export const linkedinCommentScopes = {
  read: "r_organization_social_feed",
  write: "w_organization_social_feed",
} as const;

/**
 * The scope a Google Business Profile location's reviews take: the
 * reference of `accounts.locations.reviews` (My Business API v4,
 * developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews,
 * each method read 2026-11-14) names `business.manage` (or its deprecated
 * `plus.business.manage`) for `list`, `get`, `updateReply` and
 * `deleteReply`. Peal's Business Profile sign-in already asks it, for
 * posting, so reading reviews asks nothing more.
 */
export const googleBusinessReviewScope =
  "https://www.googleapis.com/auth/business.manage";
