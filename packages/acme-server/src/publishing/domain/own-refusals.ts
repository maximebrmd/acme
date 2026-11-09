/**
 * The codes of the refusals Acme makes itself, before any platform is
 * called: the post's channel or one of its media can no longer be used.
 * They are stored in the publication journal, so never change one. The
 * publication policy tells them apart from the platforms' own codes.
 */
export const ownRefusalCodes = {
  // A BadRequest: the channel is turned off.
  channelDisabled: "channelDisabled",
  // A BadRequest: the channel is no longer connected to the workspace.
  channelDisconnected: "channelDisconnected",
  // A MediaRejected: the media was deleted, or is no longer ready.
  mediaRemoved: "mediaUnavailable",
} as const;

/**
 * The codes adapters give a platform's refusal that has a failure reason of
 * its own, rather than `contentRejected`. They are stored in the
 * publication journal too, so never change one.
 */
export const platformRefusalCodes = {
  // A BadRequest: the platform takes only some posts from this server's
  // app until it approves it (TikTok: private posts from an app it has not
  // audited).
  appNotAudited: "appNotAudited",
} as const;

/**
 * The codes of a RateLimited that waits for a daily allowance to reset,
 * kept in the journal too: the platform's quota for this server's API
 * project, as Acme counts it or the platform answers (`quotaExceeded`), or
 * the account's own daily uploads (`uploadLimitExceeded`), both YouTube's.
 * A target that waited past them fails as quotaExceeded, not rateLimited.
 */
export const dailyLimitCodes = {
  accountUploads: "uploadLimitExceeded",
  projectQuota: "quotaExceeded",
} as const;

const dailyLimits: ReadonlySet<string> = new Set(
  Object.values(dailyLimitCodes)
);

/** Whether a rate limit's code names a daily allowance. */
export const isDailyLimit = (code: string | undefined): boolean =>
  code !== undefined && dailyLimits.has(code);
