/**
 * The words of each email in one language. `{name}` stands for a value the
 * email fills in, HTML-escaped where it appears in HTML.
 */
export interface EmailCatalog {
  /**
   * A channel's token stopped working. `{platform}`, `{handle}` and
   * `{workspaceName}` name the account.
   */
  readonly channelReconnectRequired: EmailMessages;
  /** A channel's token expires at `{expiresAt}` and cannot be renewed. */
  readonly channelReconnectSoon: EmailMessages;
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
  readonly verifyEmail: EmailMessages;
}

export interface EmailMessages {
  readonly action: string;
  readonly body: string;
  /** Why the reader may ignore the email. */
  readonly ignore: string;
  readonly subject: string;
}
