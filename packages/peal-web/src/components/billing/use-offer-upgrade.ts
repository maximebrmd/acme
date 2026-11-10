"use client";

import { Option } from "effect";
import type { Exit } from "effect";

import type { AuthClientError } from "#auth/errors.ts";
import { limitIn, limitOfAuthError } from "#billing/upgrade.ts";
import { useUpgradePrompt } from "#components/billing/upgrade-prompt.tsx";

/**
 * Opens the upgrade dialog when a request ended on a plan's limit, and
 * does nothing otherwise: called with what any request that a plan can
 * refuse ended with, beside the page's own handling of it.
 */
export const useOfferUpgrade = () => {
  const prompt = useUpgradePrompt();

  return <A, E extends { readonly _tag: string }>(
    exit: Exit.Exit<A, E>,
    workspaceId?: string
  ): void => {
    const reached = limitIn(exit);

    if (Option.isSome(reached)) {
      prompt(reached.value, workspaceId);
    }
  };
};

/**
 * The same for the sign-in service's routes, whose errors name the limit
 * in their body: the members a plan allows, or the one free workspace an
 * account owns.
 */
export const useOfferAuthUpgrade = () => {
  const prompt = useUpgradePrompt();

  return (error: AuthClientError, workspaceId?: string): void => {
    const reached = limitOfAuthError(error);

    if (Option.isSome(reached)) {
      prompt(reached.value, workspaceId);
    }
  };
};
