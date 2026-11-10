"use client";

import { Option } from "effect";
import { useEffect } from "react";

import { limitOfFailure } from "#billing/upgrade.ts";
import type { LimitReached } from "#billing/upgrade.ts";
import { useUpgradePrompt } from "#components/billing/upgrade-prompt.tsx";

interface OfferUpgradeProps {
  /** What a request failed with, when the page holds it as it came. */
  readonly failure?: { readonly _tag: string } | null | undefined;
  /** The limit reached, when the page already read it from the failure. */
  readonly reached?: LimitReached | null | undefined;
}

/**
 * Opens the upgrade dialog when the failure a page holds is a plan's limit,
 * once for each failure: rendered beside the page's own message, where a
 * request's failure is kept in state rather than handled where it ended.
 * Renders nothing.
 */
export const OfferUpgrade = ({ failure, reached }: OfferUpgradeProps) => {
  const prompt = useUpgradePrompt();

  useEffect(() => {
    const limit =
      reached ??
      (failure === null || failure === undefined
        ? null
        : Option.getOrNull(limitOfFailure(failure)));

    if (limit !== null) {
      prompt(limit);
    }
  }, [failure, reached, prompt]);

  return null;
};
