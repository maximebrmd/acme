import { Match } from "effect";
import { anthropicApiAddress } from "peal-contract";
import type {
  AssistantFailed,
  AssistantSecretsNotConfigured,
  Forbidden,
  OwnTextLimitReached,
  TextProvider,
  TextProviderAddressRefused,
  TextProviderBusy,
  TextProviderChange,
  TextProviderKeyRequired,
  TextProviderKind,
  TextProviderNotFound,
  TextProviderRefused,
  TooManyRequests,
  Unauthenticated,
  WorkspaceNotFound,
} from "peal-contract";

import { keyNeeded as imageKeyNeeded } from "#assistant/image-provider.ts";

/** What the form holds: the API, the address, the model and a key, typed or not. */
export interface TextProviderDraft {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly kind: TextProviderKind;
  readonly model: string;
}

/**
 * The form for the provider the workspace has, or an empty one on
 * Anthropic, at its address.
 */
export const draftOf = (saved: TextProvider | null): TextProviderDraft => ({
  apiKey: "",
  baseUrl: saved?.baseUrl ?? anthropicApiAddress,
  kind: saved?.kind ?? "anthropic",
  model: saved?.model ?? "",
});

/**
 * The form once the member picks another API: Anthropic's address for
 * Anthropic, nothing for another endpoint, unless the address already
 * typed was not Anthropic's.
 */
export const kindChanged = (
  draft: TextProviderDraft,
  kind: TextProviderKind
): TextProviderDraft => {
  if (kind === "anthropic") {
    return { ...draft, baseUrl: anthropicApiAddress, kind };
  }

  return {
    ...draft,
    baseUrl: draft.baseUrl.trim() === anthropicApiAddress ? "" : draft.baseUrl,
    kind,
  };
};

/**
 * Why the key must be typed now, or null when the saved one is kept: as
 * for the image provider, a key goes only to the exact address it was
 * given for.
 */
export const keyNeeded = (
  draft: TextProviderDraft,
  saved: TextProvider | null
): "keyAgain" | "keyUnreadable" | "noKey" | null =>
  imageKeyNeeded(draft, saved);

/** The request a save sends: the key only when it was typed. */
export const changeOf = (draft: TextProviderDraft): TextProviderChange => {
  const change = {
    baseUrl: draft.baseUrl.trim(),
    kind: draft.kind,
    model: draft.model.trim(),
  };

  // A pasted key comes with spaces, which no key holds.
  const apiKey = draft.apiKey.trim();

  return apiKey === "" ? change : { ...change, apiKey };
};

/** Whether the form can be saved: an address, a model, and a key if needed. */
export const isSavable = (
  draft: TextProviderDraft,
  saved: TextProvider | null
): boolean =>
  draft.baseUrl.trim() !== "" &&
  draft.model.trim() !== "" &&
  (draft.apiKey.trim() !== "" || keyNeeded(draft, saved) === null);

/** Why a save or a removal failed, as the API declares it. */
export type TextProviderFailure =
  | AssistantSecretsNotConfigured
  | Forbidden
  | TextProviderAddressRefused
  | TextProviderKeyRequired
  | TooManyRequests
  | Unauthenticated
  | WorkspaceNotFound
  | { readonly _tag: "Unexpected" };

/** The message of `Assistant.textProvider.errors` that says why. */
export type TextProviderErrorKey =
  | TextProviderAddressRefused["reason"]
  | "forbidden"
  | "generic"
  | "keyRequired"
  | "notConfigured";

export const providerErrorKey = (
  failure: TextProviderFailure
): TextProviderErrorKey =>
  Match.valueTags(failure, {
    AssistantSecretsNotConfigured: (): TextProviderErrorKey => "notConfigured",
    Forbidden: (): TextProviderErrorKey => "forbidden",
    TextProviderAddressRefused: ({ reason }): TextProviderErrorKey => reason,
    TextProviderKeyRequired: (): TextProviderErrorKey => "keyRequired",
    TooManyRequests: (): TextProviderErrorKey => "generic",
    Unauthenticated: (): TextProviderErrorKey => "generic",
    Unexpected: (): TextProviderErrorKey => "generic",
    WorkspaceNotFound: (): TextProviderErrorKey => "generic",
  });

/** Why the test of the provider failed, as the API declares it. */
export type TextProviderTestFailure =
  | AssistantFailed
  | Forbidden
  | OwnTextLimitReached
  | TextProviderBusy
  | TextProviderNotFound
  | TextProviderRefused
  | TooManyRequests
  | Unauthenticated
  | WorkspaceNotFound
  | { readonly _tag: "Unexpected" };

// The workspace's own provider's refusals: its settings are to fix.
const refusalKeys = {
  addressRefused: "providerAddress",
  keyUnreadable: "providerKey",
  redirected: "providerRedirected",
  settingsRefused: "providerRefused",
} as const;

/** The message of `Assistant.textProvider.testErrors` that says why. */
export type TextProviderTestKey =
  | AssistantFailed["reason"]
  | (typeof refusalKeys)[keyof typeof refusalKeys]
  | "forbidden"
  | "generic"
  | "ownBusy"
  | "ownLimit";

export const testFailureKey = (
  failure: TextProviderTestFailure
): TextProviderTestKey =>
  Match.valueTags(failure, {
    AssistantFailed: ({ reason }): TextProviderTestKey => reason,
    Forbidden: (): TextProviderTestKey => "forbidden",
    OwnTextLimitReached: (): TextProviderTestKey => "ownLimit",
    TextProviderBusy: (): TextProviderTestKey => "ownBusy",
    // Removed meanwhile, in another tab: the page reads it again.
    TextProviderNotFound: (): TextProviderTestKey => "generic",
    TextProviderRefused: ({ reason }): TextProviderTestKey =>
      refusalKeys[reason],
    TooManyRequests: (): TextProviderTestKey => "generic",
    Unauthenticated: (): TextProviderTestKey => "generic",
    Unexpected: (): TextProviderTestKey => "generic",
    WorkspaceNotFound: (): TextProviderTestKey => "generic",
  });
