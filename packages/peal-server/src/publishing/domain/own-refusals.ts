/**
 * The codes of the refusals Peal makes itself, before any platform is
 * called: the post's channel or one of its media can no longer be used, or
 * the workspace's plan has no room for it.
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
  // A BadRequest: the workspace's plan has no room for the post when it is
  // due, as after a trial or on a smaller plan.
  planLimit: "planLimit",
  // A BadRequest: a part after the first has no post to reply to, as Peal
  // knows no id for the part before it, or for the first.
  replyTargetUnknown: "replyTargetUnknown",
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
 * The codes of a PlatformUnavailable that the server's operator must fix:
 * the platform refuses every call of the server's app until its account
 * with the platform is paid for. The policy keeps the post waiting, tried
 * again at a gentle pace until a day after its time, as the operator can
 * pay at any moment; a target that gave up fails as appBillingLimit, never
 * as the post's fault. Stored in the journal too, so never change one.
 */
export const operatorRefusalCodes = {
  // X: the app's pay-per-use credits are used up (HTTP 402).
  creditsDepleted: "creditsDepleted",
  // X: the app reached the spending cap set on its account (`usage-capped`).
  usageCapped: "usageCapped",
} as const;

const operatorRefusals: ReadonlySet<string> = new Set(
  Object.values(operatorRefusalCodes)
);

/** Whether an unavailable platform's code is the operator's to fix. */
export const isOperatorRefusal = (code: string | undefined): code is string =>
  code !== undefined && operatorRefusals.has(code);

/**
 * The codes of a RateLimited that waits for a daily allowance to reset,
 * kept in the journal too: the platform's quota for this server's API
 * project, as Peal counts it or the platform answers (`quotaExceeded`), or
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
