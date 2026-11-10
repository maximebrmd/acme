import { Option } from "effect";

/** The scope that lets an application schedule and publish posts. */
export const publishScope = "workspace:publish";

/**
 * What an application still does once publishing is left out: write drafts
 * (it asked to write too), or read only.
 */
export type WithoutPublishing = "drafts" | "reading";

/**
 * Whether the person may allow the application without publishing, and
 * what it keeps then. None when it did not ask to publish, or asked for
 * nothing else in the workspace: leaving publishing out would then leave
 * it nothing to do there.
 */
export const withoutPublishing = (
  scopes: readonly string[]
): Option.Option<WithoutPublishing> => {
  if (!scopes.includes(publishScope)) {
    return Option.none();
  }

  if (scopes.includes("workspace:write")) {
    return Option.some("drafts");
  }

  return scopes.includes("workspace:read")
    ? Option.some("reading")
    : Option.none();
};

/**
 * The scope that lets an application connect ad accounts and, when it may
 * publish too, spend on ads within the ceiling an owner set.
 */
export const adsScope = "workspace:ads";

const workspaceScopes: ReadonlySet<string> = new Set([
  "workspace:read",
  "workspace:write",
  publishScope,
]);

/**
 * Whether the person may allow the application without ads: it asked for
 * them, and for something else in the workspace, which it keeps.
 */
export const mayLeaveAdsOut = (scopes: readonly string[]): boolean =>
  scopes.includes(adsScope) &&
  scopes.some((scope) => workspaceScopes.has(scope));

/** What the person lets the application do, of what they may leave out. */
export interface ConsentChoices {
  readonly ads: boolean;
  readonly publishing: boolean;
}

/** What Better Auth's consent endpoint is sent when the person allows. */
export interface ConsentAnswer {
  readonly accept: true;
  /** The scopes allowed, when fewer than the application asked for. */
  readonly scope?: string;
}

/**
 * The answer that allows an application: everything it asked for, or, when
 * the person left publishing or ads out, the scopes it asked for without
 * them.
 */
export const consentAnswer = (
  scopes: readonly string[],
  allow: ConsentChoices
): ConsentAnswer => {
  const left = new Set<string>();

  if (!allow.publishing && Option.isSome(withoutPublishing(scopes))) {
    left.add(publishScope);
  }

  if (!allow.ads && mayLeaveAdsOut(scopes)) {
    left.add(adsScope);
  }

  return left.size === 0
    ? { accept: true }
    : {
        accept: true,
        scope: scopes.filter((scope) => !left.has(scope)).join(" "),
      };
};
