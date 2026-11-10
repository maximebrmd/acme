import type { PaidPlan } from "#shared/domain/plan.ts";

import type { PostFailureReason } from "./notice-event.ts";

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
  /**
   * A post did not go out on `{channel}`, for `{reason}`, in
   * `{workspaceName}`.
   */
  readonly postFailed: EmailMessages;
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
  /** "month" or "year", as `{interval}`. */
  readonly intervals: { readonly month: string; readonly year: string };
  /** A trial of `{plan}` in `{workspaceName}` ends at `{endsAt}`. */
  readonly trialEnding: EmailMessages;
  /**
   * A yearly `{plan}` renews at `{renewsAt}` for `{price}`, what Stripe
   * will charge, VAT included.
   */
  readonly subscriptionRenewing: EmailMessages;
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
  readonly verifyEmail: EmailMessages;
  /** The workspace `{workspaceName}` was deleted by its owner. */
  readonly workspaceDeleted: EmailMessages;
}

export interface EmailMessages {
  readonly action: string;
  readonly body: string;
  /** Why the reader may ignore the email. */
  readonly ignore: string;
  readonly subject: string;
}
