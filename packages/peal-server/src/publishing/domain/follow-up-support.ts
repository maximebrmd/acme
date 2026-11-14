import { Schema } from "effect";

import { platforms } from "#shared/domain/platform.ts";
import type { Platform } from "#shared/domain/platform.ts";

import type { FollowUpKind } from "./follow-up.ts";

/**
 * Why Peal does not carry out a kind of follow-up on a platform: the
 * platform has no way for an app to do it (`noApi`), its permission waits
 * on the platform's review of Peal (`review`), Peal has not built it yet
 * (`notBuilt`), or the platform's rules forbid an app to do it by itself
 * (`notAllowed`). Answered by the API: add a member, never rename or
 * remove one.
 */
export const FollowUpBlockerSchema = Schema.Literals([
  "noApi",
  "review",
  "notBuilt",
  "notAllowed",
]);

export type FollowUpBlocker = typeof FollowUpBlockerSchema.Type;

/** Whether Peal carries out a kind of follow-up on a platform. */
export type FollowUpSupport = "available" | FollowUpBlocker;

/**
 * What Peal carries out on each platform, read from each platform's own
 * pages (2026-11-14), for the account's own posts only, never anyone
 * else's:
 *
 * - The comment is the account's own reply under its post, as a thread's
 *   next part goes out (`OutgoingPost.replyTo`), on the platforms whose
 *   adapters send threads: Bluesky (`app.bsky.feed.post` with a reply),
 *   Mastodon (`in_reply_to_id`) and X (`reply.in_reply_to_tweet_id`, a
 *   post X bills, and sent only where the operator sends X threads).
 *   Threads' replies need `threads_manage_replies`, not granted to Peal
 *   yet.
 *   Facebook Pages, Instagram and YouTube take a first comment under the
 *   inbox's permission, not built as a follow-up yet.
 * - The repost is Bluesky's `app.bsky.feed.repost` record
 *   (`repo:app.bsky.feed.repost?action=create`, asked at sign-in) and
 *   Mastodon's reblog of the account's own status (`write:statuses`,
 *   held, which reblogs an already reblogged status once:
 *   `ReblogService`). X's repost is a call X bills of its own, which no meter of
 *   Peal's counts yet: not built. The other platforms have no repost an
 *   app can make of its own post.
 * - LinkedIn forbids both: its API Terms (3.1) refuse using the APIs "to
 *   automate posting on the LinkedIn Services", and its User Agreement
 *   (8.2) bots that "comment on, like, share, or re-share posts".
 */
export const followUpSupport = {
  bluesky: { comment: "available", repost: "available" },
  facebook: { comment: "notBuilt", repost: "noApi" },
  googleBusiness: { comment: "noApi", repost: "noApi" },
  instagram: { comment: "notBuilt", repost: "noApi" },
  linkedin: { comment: "notAllowed", repost: "notAllowed" },
  mastodon: { comment: "available", repost: "available" },
  pinterest: { comment: "noApi", repost: "noApi" },
  threads: { comment: "review", repost: "notBuilt" },
  tiktok: { comment: "noApi", repost: "noApi" },
  x: { comment: "available", repost: "notBuilt" },
  youtube: { comment: "notBuilt", repost: "noApi" },
} as const satisfies {
  readonly [P in Platform]: { readonly [K in FollowUpKind]: FollowUpSupport };
};

/** The platforms where Peal carries out a kind of follow-up. */
export const followUpPlatforms = (kind: FollowUpKind): readonly Platform[] =>
  platforms.filter(
    (platform) => followUpSupport[platform][kind] === "available"
  );
