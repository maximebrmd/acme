import { Option, Schema } from "effect";

import type { Platform } from "#shared/domain/platform.ts";

/**
 * Why Peal cannot change a post once it is live on a platform:
 *
 * - `noApi`: the platform's API has no call for it.
 * - `permission`: the call exists, but needs a permission Peal does not
 *   ask its members for, which the platform grants after a review.
 * - `unverified`: the call exists, but the platform's documentation does
 *   not say that the permissions Peal holds allow it: Peal does not try it
 *   on members' accounts until that is confirmed.
 *
 * Clients read it in the capabilities (`livePost`): add a member, never
 * rename or remove one.
 */
export const LivePostBlockerSchema = Schema.Literals([
  "noApi",
  "permission",
  "unverified",
]);

export type LivePostBlocker = typeof LivePostBlockerSchema.Type;

/** What Peal can do to a post live on a platform, or why not. */
export interface LivePostAbility {
  /** Why Peal cannot delete a post there; none when it can. */
  readonly unpublish: Option.Option<LivePostBlocker>;
  /** Why Peal cannot replace a post's text there; none when it can. */
  readonly edit: Option.Option<LivePostBlocker>;
}

const can: Option.Option<LivePostBlocker> = Option.none();

const blockedBy = (blocker: LivePostBlocker) => Option.some(blocker);

/**
 * Per platform, whether Peal deletes a published post there, and whether
 * it replaces its text, or what stops it: the one table the capabilities,
 * the use cases and the docs' tables read (`docs/guides/posts/published.mdx`, kept
 * equal by a test). A platform deletes, or edits, only when its adapter
 * is in `LivePostClientsLive`'s registry, which a test compares with this
 * table. Each line cites the page it was read from, on 2026-11-11 (the
 * edit calls re-read on 2026-11-12).
 */
export const livePostSupport = {
  // `com.atproto.repo.deleteRecord`, with the `action=delete` the post
  // scope asks for. https://atproto.com/specs/permission ; the PDS's
  // `api/com/atproto/repo/deleteRecord.ts` answers a record already gone
  // as done, without a commit. Posts have no edit call.
  bluesky: { edit: blockedBy("noApi"), unpublish: can },
  // Page posts: `DELETE /{page_post_id}` is documented in the Pages API,
  // and the Graph reference says "Only select developers can perform this
  // operation using the API": whether Peal's app may is not known.
  // https://developers.facebook.com/docs/pages-api/posts ,
  // https://developers.facebook.com/docs/graph-api/reference/page-post/
  // An edit is `POST /{page_post_id}` with `message` ("An app can only
  // update a Page post if the post was made using that app."), but the
  // Pages guide lists `pages_manage_engagement` and
  // `pages_read_user_engagement` among its requirements without saying
  // which call needs them, and Peal asks for neither.
  facebook: {
    edit: blockedBy("unverified"),
    unpublish: blockedBy("unverified"),
  },
  // `DELETE https://mybusiness.googleapis.com/v4/{localPost}`, with
  // `business.manage`; NOT_FOUND for a post that does not exist.
  // https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts/delete
  // An edit is `PATCH https://mybusiness.googleapis.com/v4/{localPost}`
  // with `business.manage`: "You must specify each field that is being
  // updated in the mask" (`updateMask=summary`).
  // https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts/patch
  googleBusiness: { edit: can, unpublish: can },
  // `DELETE /<IG_MEDIA_ID>` needs `instagram_manage_contents` and Facebook
  // Login, which Peal does not ask for; only `comment_enabled` changes.
  // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media
  instagram: {
    edit: blockedBy("noApi"),
    unpublish: blockedBy("permission"),
  },
  // `DELETE /rest/posts/{urn}` is documented, but the Posts API page does
  // not say which permission a deletion needs, nor which an update of
  // `commentary` needs (`X-RestLi-Method: PARTIAL_UPDATE`, documented on
  // the same page).
  // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
  linkedin: {
    edit: blockedBy("unverified"),
    unpublish: blockedBy("unverified"),
  },
  // `DELETE /api/v1/statuses/:id`, "User token + `write:statuses`", and
  // `PUT /api/v1/statuses/:id` to edit (since 3.5.0), with the same
  // scope. https://docs.joinmastodon.org/methods/statuses/
  mastodon: { edit: can, unpublish: can },
  // `DELETE /v5/pins/{pin_id}` (`pins/delete`), with the `pins:write` and
  // `boards:write` scopes Peal asks for: Pinterest's published API
  // description, https://github.com/pinterest/api-description (v5).
  // `PATCH /v5/pins/{pin_id}` is "currently in beta and not available to
  // all apps" there (v5.28.0): whether Peal's app has it is not known.
  pinterest: { edit: blockedBy("unverified"), unpublish: can },
  // `DELETE /{threads-media-id}` needs `threads_delete`, which Peal does
  // not ask for; Threads documents no edit call.
  // https://developers.facebook.com/docs/threads/posts/delete-posts
  threads: {
    edit: blockedBy("noApi"),
    unpublish: blockedBy("permission"),
  },
  // The Content Posting API has no call to delete or change a post.
  // https://developers.tiktok.com/doc/content-posting-api-get-started
  tiktok: { edit: blockedBy("noApi"), unpublish: blockedBy("noApi") },
  // `DELETE /2/tweets/{id}`, with `tweet.read`, `users.read` and
  // `tweet.write`. https://docs.x.com/x-api/posts/delete-post
  // An edit is `POST /2/tweets` with `edit_options.previous_post_id`
  // ("Edit an existing tweet rather than creating a new one."), and the
  // page says nothing of which posts may be edited, or on which access.
  // https://docs.x.com/x-api/posts/create-post
  x: { edit: blockedBy("unverified"), unpublish: can },
  // `videos.delete` and `videos.update` need `youtube` or
  // `youtube.force-ssl`, not the `youtube.upload` Peal asks for.
  // https://developers.google.com/youtube/v3/docs/videos/delete
  youtube: {
    edit: blockedBy("permission"),
    unpublish: blockedBy("permission"),
  },
} as const satisfies { readonly [P in Platform]: LivePostAbility };

/** Why Peal cannot delete a post live on `platform`; none when it can. */
export const unpublishBlocker = (
  platform: Platform
): Option.Option<LivePostBlocker> => livePostSupport[platform].unpublish;

/** Why Peal cannot replace a post's text on `platform`; none when it can. */
export const editBlocker = (
  platform: Platform
): Option.Option<LivePostBlocker> => livePostSupport[platform].edit;
