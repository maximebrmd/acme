"use client";

import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import type { Platform } from "peal-contract";
import { useState, useTransition } from "react";

import { connectChannel, failureOf } from "#channels/channels-api.ts";
import type { ChannelErrorKey } from "#channels/channels-api.ts";
import { rememberConnection } from "#channels/pending-connection.ts";

/**
 * Starts a connection, then leaves for the platform's sign-in page: from
 * the channels page, or from an account picker whose choice is spent.
 */
export const useConnect = (workspaceId: string, platform: Platform) => {
  const connect = useAtomSet(connectChannel, { mode: "promiseExit" });
  const [error, setError] = useState<ChannelErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const start = (payload: {
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
        rememberConnection({ platform, workspaceId });
        globalThis.location.assign(exit.value.authorizationUrl);

        return;
      }

      setError(Option.getOrElse(failureOf(exit), () => "unknown" as const));
    });
  };

  return { error, isPending, start };
};
