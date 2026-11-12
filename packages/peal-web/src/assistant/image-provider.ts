import { Match } from "effect";
import type {
  AssistantSecretsNotConfigured,
  Forbidden,
  ImageProvider,
  ImageProviderAddressRefused,
  ImageProviderChange,
  ImageProviderKeyRequired,
  TooManyRequests,
  Unauthenticated,
  WorkspaceNotFound,
} from "peal-contract";

/** What the form holds: the address, the model and a key, typed or not. */
export interface ImageProviderDraft {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
}

/** The form for the provider the workspace has, or an empty one. */
export const draftOf = (saved: ImageProvider | null): ImageProviderDraft => ({
  apiKey: "",
  baseUrl: saved?.baseUrl ?? "",
  model: saved?.model ?? "",
});

// Where a key is sent, as a browser compares origins; none for what is not
// an address yet.
const originOf = (address: string): string | null =>
  URL.parse(address.trim())?.origin ?? null;

/**
 * Why the key must be typed now, or null when the saved one is kept: none
 * is saved, the saved one can no longer be read, or the address moved to
 * another origin, where Peal never sends a key given for the first.
 */
export const keyNeeded = (
  draft: ImageProviderDraft,
  saved: ImageProvider | null
): "keyAgain" | "keyUnreadable" | "noKey" | null => {
  if (saved === null) {
    return "noKey";
  }

  if (saved.keyUnreadable) {
    return "keyUnreadable";
  }

  return originOf(draft.baseUrl) === originOf(saved.baseUrl)
    ? null
    : "keyAgain";
};

/** The request a save sends: the key only when it was typed. */
export const changeOf = (draft: ImageProviderDraft): ImageProviderChange => {
  const change = { baseUrl: draft.baseUrl.trim(), model: draft.model.trim() };

  return draft.apiKey === "" ? change : { ...change, apiKey: draft.apiKey };
};

/** Whether the form can be saved: an address, a model, and a key if needed. */
export const isSavable = (
  draft: ImageProviderDraft,
  saved: ImageProvider | null
): boolean =>
  draft.baseUrl.trim() !== "" &&
  draft.model.trim() !== "" &&
  (draft.apiKey !== "" || keyNeeded(draft, saved) === null);

/** Why a save or a removal failed, as the API declares it. */
export type ImageProviderFailure =
  | AssistantSecretsNotConfigured
  | Forbidden
  | ImageProviderAddressRefused
  | ImageProviderKeyRequired
  | TooManyRequests
  | Unauthenticated
  | WorkspaceNotFound
  | { readonly _tag: "Unexpected" };

/** The message of `Assistant.provider.errors` that says why. */
export type ImageProviderErrorKey =
  | ImageProviderAddressRefused["reason"]
  | "forbidden"
  | "generic"
  | "keyRequired"
  | "notConfigured";

export const providerErrorKey = (
  failure: ImageProviderFailure
): ImageProviderErrorKey =>
  Match.valueTags(failure, {
    AssistantSecretsNotConfigured: (): ImageProviderErrorKey => "notConfigured",
    Forbidden: (): ImageProviderErrorKey => "forbidden",
    ImageProviderAddressRefused: ({ reason }): ImageProviderErrorKey => reason,
    ImageProviderKeyRequired: (): ImageProviderErrorKey => "keyRequired",
    TooManyRequests: (): ImageProviderErrorKey => "generic",
    Unauthenticated: (): ImageProviderErrorKey => "generic",
    Unexpected: (): ImageProviderErrorKey => "generic",
    WorkspaceNotFound: (): ImageProviderErrorKey => "generic",
  });
