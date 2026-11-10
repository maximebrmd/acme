import { PlatformSchema } from "peal-contract";

import { pendingLink } from "./pending-link.ts";

const linkPage = /^\/connect\/link$/u;

const callbackPage = /^\/connect\/(?<platform>[^/]+)\/callback$/u;

/**
 * The frame a page gets: the app's, with Peal's header and footer; the
 * hosted one, for people who come through a connect link and have no Peal
 * account; or none yet, while only the browser can tell which.
 */
export type Frame = "app" | "hosted" | "unknown";

/** Whether the path is the platforms' callback page. */
export const isCallbackPage = (pathname: string): boolean =>
  callbackPage.test(pathname);

/**
 * Which frame a page gets: the hosted one for a connect link's page, and
 * for the platform's callback when the tab came through a link; the app's
 * for every other page.
 */
export const frameOf = (pathname: string, cameThroughLink: boolean): Frame => {
  if (linkPage.test(pathname)) {
    return "hosted";
  }

  return isCallbackPage(pathname) && cameThroughLink ? "hosted" : "app";
};

/**
 * Whether this tab is on a connect link's sign-in for the platform the
 * callback page is for, as its storage says.
 */
export const cameThroughLink = (pathname: string): boolean =>
  PlatformSchema.literals.some(
    (platform) =>
      callbackPage.exec(pathname)?.groups?.["platform"] === platform &&
      pendingLink(platform) !== null
  );
