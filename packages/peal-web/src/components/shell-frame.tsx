"use client";

import { constVoid } from "effect/Function";
import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import {
  cameThroughLink,
  frameOf,
  isCallbackPage,
} from "#connect-link/frame.ts";
import type { Frame } from "#connect-link/frame.ts";
import { usePathname } from "#i18n/navigation.ts";

// The tab's storage only changes from the pages' own actions.
const ignoreChanges = () => constVoid;

/**
 * The frame around a page. People who come through a connect link have no
 * Peal account and are not shown Peal's app: their pages get `hosted`, a
 * plain footer, in place of the app's header and footer. The callback page
 * is both a member's and theirs: it shows neither frame until the browser
 * says which it is.
 */
export const ShellFrame = ({
  children,
  footer,
  header,
  hosted,
}: {
  readonly children: ReactNode;
  readonly footer: ReactNode;
  readonly header: ReactNode;
  readonly hosted: ReactNode;
}): ReactNode => {
  const pathname = usePathname();

  const frame = useSyncExternalStore<Frame>(
    ignoreChanges,
    () => frameOf(pathname, cameThroughLink(pathname)),
    () => (isCallbackPage(pathname) ? "unknown" : frameOf(pathname, false))
  );

  // A workspace's layout draws its own frame around its pages.
  if (frame === "workspace") {
    return children;
  }

  return (
    <>
      {frame === "app" ? header : null}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        {children}
      </main>
      {frame === "app" ? footer : null}
      {frame === "hosted" ? hosted : null}
    </>
  );
};
