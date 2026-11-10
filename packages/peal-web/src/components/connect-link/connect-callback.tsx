"use client";

import { constVoid } from "effect/Function";
import type { ConnectCallback, Platform } from "peal-contract";
import { useSyncExternalStore } from "react";

import { UpgradePrompts } from "#components/billing/upgrade-prompts.tsx";
import { CompleteConnection } from "#components/channels/complete-connection.tsx";
import { pendingLink } from "#connect-link/pending-link.ts";

import { CompleteHostedConnection } from "./complete-hosted-connection.tsx";

// The tab's storage only changes from this page's own actions.
const ignoreChanges = () => constVoid;

// The server cannot read the tab's storage: it renders what a member's own
// connection renders while it waits, under a value no token takes.
const notYetKnown = "";

const unknownOnServer = () => notYetKnown;

/**
 * What the platform's callback completes: the sign-in of the connect link
 * this tab came from, when it came from one, or the connection a member
 * started in the app.
 */
export const ConnectCallbackView = ({
  callback,
  platform,
}: {
  readonly callback: ConnectCallback | null;
  readonly platform: Platform;
}) => {
  const token = useSyncExternalStore(
    ignoreChanges,
    () => pendingLink(platform),
    unknownOnServer
  );

  if (token !== null && token !== notYetKnown) {
    return (
      <CompleteHostedConnection
        callback={callback}
        platform={platform}
        token={token}
      />
    );
  }

  return (
    <UpgradePrompts current={null}>
      <CompleteConnection platform={platform} callback={callback} />
    </UpgradePrompts>
  );
};
