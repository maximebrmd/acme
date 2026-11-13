import type { Types } from "effect";
import { PlatformSchema } from "peal-contract";
import type {
  AssistantAction,
  AssistantFailed,
  AssistantTone,
  AssistantInputRejected,
  AssistantQuotaExceeded,
  AssistantStatus,
  AssistantUnavailable,
  Forbidden,
  OwnTextLimitReached,
  Platform,
  Suggestion,
  TextProviderRefused,
  TooManyRequests,
  Unauthenticated,
  WorkspaceNotFound,
} from "peal-contract";
import { platformRules } from "peal-contract/post-text";

/** Why a suggestion failed, as the API declares it. */
export type AssistantFailure =
  | AssistantFailed
  | AssistantInputRejected
  | AssistantQuotaExceeded
  | AssistantUnavailable
  | Forbidden
  // The workspace's own text provider: its day's bound, and its refusals.
  | OwnTextLimitReached
  | TextProviderRefused
  // Answered to keys and applications only: the web app signs in with a
  // session, whose requests are not counted.
  | TooManyRequests
  | Unauthenticated
  | WorkspaceNotFound
  // The request failed in a way the API does not declare: the network, or
  // an answer that could not be read.
  | { readonly _tag: "Unexpected" };

/**
 * Why the person cannot ask now, if they cannot: no request of Peal's left
 * today (which the menu says; never while the workspace's own provider
 * writes, as it spends none), no text, or too much of it.
 */
export const assistantBlockedBy = (
  status: Pick<AssistantStatus, "maxTextLength" | "remaining" | "source">,
  text: string
): "needsText" | "noRequestsLeft" | "textTooLong" | null => {
  if (status.source !== "workspace" && status.remaining <= 0) {
    return "noRequestsLeft";
  }

  if (text.trim() === "") {
    return "needsText";
  }

  return text.length > status.maxTextLength ? "textTooLong" : null;
};

// The platforms whose text limits are known: the only ones a post can be
// shortened to fit.
const limited = PlatformSchema.literals.filter(
  (platform) => platformRules[platform].textLimits.length > 0
);

/**
 * The platforms the assistant offers to shorten a post for: those of the
 * channels it goes to, or every platform with a known limit while no
 * channel is picked.
 */
export const shortenablePlatforms = (
  platforms: readonly Platform[]
): readonly Platform[] => {
  const picked = limited.filter((platform) => platforms.includes(platform));

  return picked.length === 0 ? limited : picked;
};

/**
 * The longest text limit a platform may have for the assistant to offer to
 * write a post within it: X's, Bluesky's, Threads' and Mastodon's.
 */
const shortLimit = 500;

/**
 * The platforms of the post's channels whose text limit is short, for which
 * the person may ask that a post written from a subject fits.
 */
export const writablePlatforms = (
  platforms: readonly Platform[]
): readonly Platform[] =>
  limited.filter(
    (platform) =>
      platforms.includes(platform) &&
      platformRules[platform].textLimits.some(
        ({ maximum }) => maximum <= shortLimit
      )
  );

/** What the person chose in the dialog that writes a post from a subject. */
export interface WriteChoices {
  readonly platform: Platform | null;
  readonly tone: AssistantTone | null;
}

type WriteAction = Extract<AssistantAction, { readonly _tag: "write" }>;

/** The action that writes a post, naming only what the person chose. */
export const writeAction = ({ platform, tone }: WriteChoices): WriteAction => {
  const action: Types.Mutable<WriteAction> = { _tag: "write" };

  if (platform !== null) {
    action.platform = platform;
  }

  if (tone !== null) {
    action.tone = tone;
  }

  return action;
};

/**
 * The post's text once a suggestion is accepted: the suggested text, or the
 * text followed by the hashtags on a line of their own.
 */
export const acceptedText = (text: string, suggestion: Suggestion): string => {
  if (suggestion._tag === "text") {
    return suggestion.text;
  }

  const body = text.trimEnd();
  const hashtags = suggestion.hashtags.join(" ");

  return body === "" ? hashtags : `${body}\n\n${hashtags}`;
};

/**
 * A language's name as the reader's language writes it at the start of a
 * menu item: "Français" rather than "français".
 */
export const languageLabel = (
  names: Intl.DisplayNames,
  locale: string,
  language: string
): string => {
  const name = names.of(language) ?? language;

  return `${name.charAt(0).toLocaleUpperCase(locale)}${name.slice(1)}`;
};
