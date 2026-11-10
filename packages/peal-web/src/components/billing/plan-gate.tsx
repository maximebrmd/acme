"use client";

import type { Standing } from "peal-contract";
import type { ReactNode } from "react";

import { OverPlanScreen } from "#components/billing/over-plan-screen.tsx";
import type { UpgradeWorkspace } from "#components/billing/upgrade-dialog.tsx";
import { usePathname } from "#i18n/navigation.ts";

interface PlanGateProps {
  readonly children: ReactNode;
  /** Where to write for more than the largest plan, if the operator says. */
  readonly contactUrl: string | null;
  /** The member reading. */
  readonly self: string;
  /** Where the workspace stands; null when it could not be read. */
  readonly standing: Standing | null;
  /** The terms of service, where the operator publishes them. */
  readonly termsUrl: string | null;
  readonly workspace: UpgradeWorkspace;
}

/**
 * Around a workspace's pages: while the workspace must come back within
 * its plan, every page shows the over-plan screen instead, but billing's,
 * where the plans are ordered and Stripe sends the browser back.
 */
export const PlanGate = ({
  children,
  contactUrl,
  self,
  standing,
  termsUrl,
  workspace,
}: PlanGateProps): ReactNode => {
  const pathname = usePathname();

  if (
    standing === null ||
    !standing.mustReduce ||
    pathname.endsWith("/billing")
  ) {
    return children;
  }

  return (
    <OverPlanScreen
      contactUrl={contactUrl}
      self={self}
      standing={standing}
      termsUrl={termsUrl}
      workspace={workspace}
    />
  );
};
