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

/** What Better Auth's consent endpoint is sent when the person allows. */
export interface ConsentAnswer {
  readonly accept: true;
  /** The scopes allowed, when fewer than the application asked for. */
  readonly scope?: string;
}

/**
 * The answer that allows an application: everything it asked for, or, when
 * the person left publishing out, the scopes it asked for without it.
 */
export const consentAnswer = (
  scopes: readonly string[],
  allowPublishing: boolean
): ConsentAnswer =>
  allowPublishing || Option.isNone(withoutPublishing(scopes))
    ? { accept: true }
    : {
        accept: true,
        scope: scopes.filter((scope) => scope !== publishScope).join(" "),
      };
