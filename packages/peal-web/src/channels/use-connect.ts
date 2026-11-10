"use client";

import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import type { ChannelConnection, Platform } from "peal-contract";
import { useState, useTransition } from "react";

import { connectChannel, failureOf } from "#channels/channels-api.ts";
import type { ChannelErrorKey } from "#channels/channels-api.ts";
import { rememberConnection } from "#channels/pending-connection.ts";
import { useOfferUpgrade } from "#components/billing/use-offer-upgrade.ts";
import { forgetLink } from "#connect-link/pending-link.ts";

/**
 * Starts a connection, then leaves for the platform's sign-in page: from
 * the channels page, or from an account picker whose choice is spent.
 */
export const useConnect = (workspaceId: string, platform: Platform) => {
  const connect = useAtomSet(connectChannel, { mode: "promiseExit" });
  const [error, setError] = useState<ChannelErrorKey | null>(null);
  const offerUpgrade = useOfferUpgrade();
  const [isPending, startTransition] = useTransition();

  const start = (payload: {
    readonly connection?: ChannelConnection;
    readonly handle?: string;
    readonly instance?: string;
  }) => {
    startTransition(async () => {
      const exit = await connect({
        params: { platform, workspaceId },
        payload,
      });

      if (exit._tag === "Success") {
        setError(null);
        // This tab is on a member's own connection now, whatever link it
        // opened before.
        forgetLink();
        rememberConnection({ platform, workspaceId });
        globalThis.location.assign(exit.value.authorizationUrl);

        return;
      }

      setError(Option.getOrElse(failureOf(exit), () => "unknown" as const));
      offerUpgrade(exit, workspaceId);
    });
  };

  return { error, isPending, start };
};
