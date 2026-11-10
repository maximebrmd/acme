"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { UpgradeReason } from "#billing/upgrade.ts";
import { UpgradeDialog } from "#components/billing/upgrade-dialog.tsx";
import type { UpgradeWorkspace } from "#components/billing/upgrade-dialog.tsx";

/**
 * Offers the upgrade for a limit reached, in the workspace given, the
 * page's own otherwise; a second free workspace names the one to pay for.
 */
export type UpgradePrompt = (
  reason: UpgradeReason,
  workspaceId?: string
) => void;

const ignore: UpgradePrompt = () => {
  // Outside the signed-in pages, nothing offers an upgrade.
};

const PromptContext = createContext<UpgradePrompt>(ignore);

/**
 * Offers the upgrade for a limit a request ended on (`limitIn`): every
 * place that sends something a plan can refuse calls it, and the one
 * dialog opens.
 */
export const useUpgradePrompt = (): UpgradePrompt => useContext(PromptContext);

interface UpgradePromptProviderProps {
  readonly children: ReactNode;
  /** Where to write for more than the largest plan, if the operator says. */
  readonly contactUrl: string | null;
  /** The workspace the pages inside are about, if they are about one. */
  readonly current: string | null;
  /** The terms of service, where the operator publishes them. */
  readonly termsUrl: string | null;
  /** The member's workspaces, with whether they may order for each. */
  readonly workspaces: readonly UpgradeWorkspace[];
}

interface Asked {
  readonly reason: UpgradeReason;
  readonly workspaceId: string | null;
}

/**
 * Around the signed-in pages where a plan can refuse something: holds the
 * limit reached, if any, and shows the upgrade dialog for its workspace.
 * A workspace the member does not belong to shows nothing: the page's own
 * message stands.
 */
export const UpgradePromptProvider = ({
  children,
  contactUrl,
  current,
  termsUrl,
  workspaces,
}: UpgradePromptProviderProps) => {
  const [asked, setAsked] = useState<Asked | null>(null);

  const prompt = useMemo<UpgradePrompt>(
    () => (reason, workspaceId) => {
      setAsked({
        reason,
        workspaceId:
          reason.limit === "freeWorkspace"
            ? reason.workspaceId
            : (workspaceId ?? current),
      });
    },
    [current]
  );

  const workspace =
    asked === null
      ? undefined
      : workspaces.find(({ id }) => id === asked.workspaceId);

  return (
    <PromptContext.Provider value={prompt}>
      {children}
      {asked === null || workspace === undefined ? null : (
        <UpgradeDialog
          contactUrl={contactUrl}
          reason={asked.reason}
          termsUrl={termsUrl}
          workspace={workspace}
          onClose={() => {
            setAsked(null);
          }}
        />
      )}
    </PromptContext.Provider>
  );
};
