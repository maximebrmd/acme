import type { PaidPlan } from "#shared/domain/plan.ts";

import type { TwoStepChange } from "./auth-email.ts";
import type {
  FeedStopReason,
  PostFailureReason,
  RecyclingEndReason,
} from "./notice-event.ts";

/**
 * The words of each email in one language. `{name}` stands for a value the
 * email fills in, HTML-escaped where it appears in HTML.
 */
export interface EmailCatalog {
  /** An account was deleted with its data, as its owner asked. */
  readonly accountDeleted: EmailMessages;
  /**
   * Added to a deletion's body when it cancelled subscriptions: what that
   * means for payments and invoices.
   */
  readonly billingEnded: {
    readonly account: string;
    readonly workspace: string;
  };
  /**
   * The acknowledgement of a request to cancel a contract or withdraw from
   * one, to the address its sender gave. Its body is, in order: `received`
   * for its kind (`{receivedAt}`), `content` (`{name}`, `{contract}`,
   * `{email}`), `desired` when a day was asked for (`{desiredAt}`), then
   * what became of it, from `outcomes` (`{receivedAt}`, `{effectiveAt}`,
   * `{refunded}`), and `renewalRefunded` when a renewal went back
   * (`{refunded}`).
   */
  readonly contractRequest: {
    readonly actions: { readonly confirm: string; readonly open: string };
    readonly content: string;
    /** `{contract}` when the request named none. */
    readonly contractNotGiven: string;
    readonly desired: string;
    readonly ignore: string;
    /**
     * `cancelledLater` for a contract that ends on a later day its sender
     * asked for, and renews until then; `withdrawnUnpaid` for a withdrawal
     * from a contract that had charged nothing.
     */
    readonly outcomes: {
      readonly business: string;
      readonly cancelled: string;
      readonly cancelledLater: string;
      readonly confirm: string;
      readonly expired: string;
      readonly notSubscribed: string;
      readonly nothingToCancel: string;
      readonly review: string;
      readonly withdrawn: string;
      readonly withdrawnUnpaid: string;
    };
    readonly received: {
      readonly cancellation: string;
      readonly withdrawal: string;
    };
    readonly renewalRefunded: string;
    readonly subjects: {
      readonly cancellation: string;
      readonly withdrawal: string;
    };
  };
  /**
   * Added to an account deletion's body on a server that keeps what French
   * law has a host keep: `identification`, what stays and for how long
   * (`{identity}`, `{account}`: each a number of `years`); `connections`,
   * on a server that stopped keeping these, for the connections it already
   * holds, each `{connections}` from when it was made.
   */
  readonly legalHold: {
    readonly connections: string;
    readonly identification: string;
    /** A number of years, `{count}`: one, or more. */
    readonly years: { readonly one: string; readonly other: string };
  };
  /**
   * A copy of the account's data was downloaded `{via}`, one of
   * `exportChannels`.
   */
  readonly dataExported: EmailMessages;
  readonly exportChannels: {
    readonly commandLine: string;
    readonly web: string;
  };
  /**
   * The channel a post notice names, as `{channel}`: `{platform}` and
   * `{handle}`.
   */
  readonly channel: string;
  /**
   * A channel's token stopped working. `{platform}`, `{handle}` and
   * `{workspaceName}` name the account.
   */
  readonly channelReconnectRequired: EmailMessages;
  /**
   * `{count}` new comments under a post of `{workspaceName}`; each entry
   * writes its own plural with `{count}`.
   */
  readonly commentsReceived: EmailMessages;
  /** A channel's token expires at `{expiresAt}` and cannot be renewed. */
  readonly channelReconnectSoon: EmailMessages;
  /** Why a post did not go out, as `{reason}` in `postFailed`'s body. */
  readonly failureReasons: Readonly<Record<PostFailureReason, string>>;
  readonly invitation: EmailMessages;
  readonly layout: {
    /** Under the button, for clients that do not show it. */
    readonly linkFallback: string;
    readonly signature: string;
    /** The button in the text part: `{action}` and `{url}`. */
    readonly textLink: string;
  };
  /** The platforms' names, as `{platform}`; a platform not listed shows its id. */
  readonly platforms: Readonly<Record<string, string>>;
  /** A post of `{workspaceName}` waits for an approval, for `{scheduledAt}`. */
  readonly postApprovalRequested: EmailMessages;
  /** A post of `{workspaceName}` was approved by `{by}`, and is scheduled. */
  readonly postApproved: EmailMessages;
  /** The same, approved after its time: it is a draft again. */
  readonly postApprovedLate: EmailMessages;
  /** `{by}` asked for changes to a post of `{workspaceName}`. */
  readonly postChangesRequested: EmailMessages;
  /** `{by}` commented on a post of `{workspaceName}`. */
  readonly postCommented: EmailMessages;
  /**
   * Who did something in a review, as `{by}`, at the start of a sentence.
   */
  readonly reviewParties: {
    readonly application: string;
    readonly member: string;
    readonly visitor: string;
  };
  /**
   * A post did not go out on `{channel}`, for `{reason}`, in
   * `{workspaceName}`.
   */
  readonly postFailed: EmailMessages;
  /**
   * A post of `{workspaceName}` is live on `{channel}`, and its first
   * comment did not go out, for `{reason}`.
   */
  readonly firstCommentFailed: EmailMessages;
  /**
   * A post of `{workspaceName}` is live on `{channel}`, and the parts after
   * its first did not go out, for `{reason}`.
   */
  readonly laterPartsFailed: EmailMessages;
  /** A post of `{workspaceName}` went live on `{channel}`. */
  readonly postPublished: EmailMessages;
  /** Whether a post of `{workspaceName}` went live on `{channel}` is unknown. */
  readonly postUnconfirmed: EmailMessages;
  readonly resetPassword: EmailMessages;
  /**
   * The paid plans' names, as `{plan}` in billing's emails.
   */
  readonly plans: Readonly<Record<PaidPlan, string>>;
  /**
   * A `{plan}` subscription started at `{startedAt}`, at `{price}` excluding
   * VAT a `{interval}`: the confirmation of the contract.
   */
  readonly subscriptionStarted: EmailMessages;
  /** The same, for a trial ending at `{endsAt}`. */
  readonly trialStarted: EmailMessages;
  /**
   * Per-account pricing started at `{startedAt}`, at `{rates}`: the
   * confirmation of the contract, which charges nothing at the start.
   */
  readonly perAccountStarted: EmailMessages;
  /** Per-account pricing's ladder, a part each, as `{rates}` lists it. */
  readonly rates: {
    /** The first `{count}` accounts, free. */
    readonly free: string;
    /** `{price}` a month for each account from `{from}` to `{to}`. */
    readonly band: string;
    /** `{price}` a month for each account from `{from}`. */
    readonly lastBand: string;
  };
  /**
   * `{workspaceName}`, on the free tier, holds `{accounts}` connected
   * accounts, more than its `{allowed}`: until `{graceUntil}` it still
   * schedules and publishes.
   */
  readonly paymentMethodNeeded: EmailMessages;
  /** "month" or "year", as `{interval}`. */
  readonly intervals: { readonly month: string; readonly year: string };
  /**
   * A trial of `{plan}` in `{workspaceName}` ends at `{endsAt}`, and
   * `{standing}` says what the workspace then holds beyond the free plan
   * (`overFreePlan`, with its `{over}` list) or that it holds nothing
   * beyond it (`withinFreePlan`).
   */
  readonly trialEnding: EmailMessages;
  /** What is held beyond the free plan: `{over}` lists it. */
  readonly overFreePlan: string;
  readonly withinFreePlan: string;
  /**
   * One thing held beyond a plan, `{used}` against `{allowed}`; media in
   * the units plans are sold in.
   */
  readonly excess: {
    readonly channels: string;
    readonly mediaStorage: string;
    readonly members: string;
  };
  /**
   * A yearly `{plan}` renews at `{renewsAt}` for `{price}`, what Stripe
   * will charge, VAT included.
   */
  readonly subscriptionRenewing: EmailMessages;
  /**
   * The last day to refuse a yearly plan's renewal, `{renewsAt}`, which
   * the reminder sets apart in a box, as French law asks.
   */
  readonly renewalDeadline: string;
  /**
   * Added to a confirmation's and a reminder's body once the contract has
   * a number, `{reference}`: what it is for.
   */
  readonly contractNumber: string;
  /** The `{plan}` subscription was cancelled, and ends at `{endsAt}`. */
  readonly subscriptionCancelled: EmailMessages;
  /**
   * A consumer withdrew from `{plan}` at `{withdrawnAt}`; `{refunded}` goes
   * back.
   */
  readonly subscriptionWithdrawn: EmailMessages;
  /**
   * The role an invitation offers, as `{role}` in its body: "as an editor".
   * The phrase includes its preposition, which in French depends on the role.
   */
  readonly roles: {
    readonly admin: string;
    readonly contributor: string;
    readonly editor: string;
    readonly owner: string;
    readonly viewer: string;
  };
  /** `{channel}` for a post whose channel was disconnected since. */
  readonly unknownChannel: string;
  /**
   * A feed of `{workspaceName}` stopped making posts, for `{reason}`, one
   * of `feedStopReasons`.
   */
  readonly feedStopped: EmailMessages;
  readonly feedStopReasons: Readonly<Record<FeedStopReason, string>>;
  /**
   * A recycling rule of `{workspaceName}` stopped repeating its post, for
   * `{reason}`, one of `recyclingEndReasons`.
   */
  readonly recyclingEnded: EmailMessages;
  readonly recyclingEndReasons: Readonly<Record<RecyclingEndReason, string>>;
  /**
   * Peal turned off the webhook endpoint at `{host}` in `{workspaceName}`,
   * for `{reason}`, one of `webhookTurnOffReasons`.
   */
  readonly webhookEndpointDisabled: EmailMessages;
  /**
   * A delivery to the webhook endpoint at `{host}` in `{workspaceName}`,
   * still on, failed for good.
   */
  readonly webhookDeliveriesFailing: EmailMessages;
  /**
   * A boost of `{budget}` in `{workspaceName}`, which runs until
   * `{endsAt}`: started, ended, used its budget, failed for `{reason}`
   * (one of `adBoostFailureReasons`, or `adBoostFailureOther`), or could
   * not be confirmed.
   */
  readonly adBoostStarted: EmailMessages;
  readonly adBoostEnded: EmailMessages;
  readonly adBoostBudgetReached: EmailMessages;
  readonly adBoostFailed: EmailMessages;
  readonly adBoostUnconfirmed: EmailMessages;
  readonly adBoostFailureReasons: Readonly<Record<string, string>>;
  readonly adBoostFailureOther: string;
  /** An ad network refused a sign-in of `{workspaceName}`. */
  readonly adConnectionReconnect: EmailMessages;
  readonly webhookTurnOffReasons: {
    readonly failing: string;
    readonly gone: string;
  };
  readonly verifyEmail: EmailMessages;
  /**
   * What changed in the account's two-step verification, by kind;
   * `recoveryCodeUsed`'s body ends with `{left}`, one of
   * `recoveryCodesLeft` (`{count}`).
   */
  readonly twoStepChanged: Readonly<Record<TwoStepChange, EmailMessages>>;
  readonly recoveryCodesLeft: {
    readonly none: string;
    readonly one: string;
    readonly other: string;
  };
  /** The workspace `{workspaceName}` was deleted by its owner. */
  readonly workspaceDeleted: EmailMessages;
  /**
   * The weekly digest. `subject` and `intro` name the week, `{from}` to
   * `{to}`, and the week after, to `{until}`, each a day in UTC; each
   * workspace has its counts (`counts`, joined), engagement where the
   * reader may read analytics (`engagement`, `{engagement}`;
   * `impressions`, `{impressions}`), the first posts under
   * `wentOutHeading` and `plannedHeading` (`noText` for one without
   * text), how many more (`more`), and a link to its calendar
   * (`calendar`, `{workspaceName}`). `ignore` says why it comes and how
   * to stop it, `{preferences}` standing for `preferences`, linked.
   */
  readonly weeklyDigest: {
    readonly action: string;
    readonly calendar: string;
    readonly counts: {
      readonly awaitingApproval: PluralWords;
      readonly failed: PluralWords;
      readonly scheduled: PluralWords;
      readonly unconfirmed: PluralWords;
      readonly wentOut: PluralWords;
    };
    readonly engagement: string;
    readonly ignore: string;
    readonly impressions: string;
    readonly intro: string;
    readonly more: PluralWords;
    readonly noText: string;
    readonly plannedHeading: string;
    readonly preferences: string;
    readonly subject: string;
    readonly wentOutHeading: string;
  };
}

/** Words that change with a count, `{count}`: one, or more. */
export interface PluralWords {
  readonly one: string;
  readonly other: string;
}

export interface EmailMessages {
  readonly action: string;
  readonly body: string;
  /** Why the reader may ignore the email. */
  readonly ignore: string;
  readonly subject: string;
}
