import { PlatformSchema } from "peal-contract";
import type {
  AssistantFailed,
  AssistantInputRejected,
  AssistantQuotaExceeded,
  AssistantUnavailable,
  Forbidden,
  Platform,
  Suggestion,
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
  | Unauthenticated
  | WorkspaceNotFound
  // The request failed in a way the API does not declare: the network, or
  // an answer that could not be read.
  | { readonly _tag: "Unexpected" };

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
