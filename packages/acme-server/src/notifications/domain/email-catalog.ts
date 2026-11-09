import type { PostFailureReason } from "./notice-event.ts";

/**
 * The words of each email in one language. `{name}` stands for a value the
 * email fills in, HTML-escaped where it appears in HTML.
 */
export interface EmailCatalog {
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
}

export interface EmailMessages {
  readonly action: string;
  readonly body: string;
  /** Why the reader may ignore the email. */
  readonly ignore: string;
  readonly subject: string;
}
