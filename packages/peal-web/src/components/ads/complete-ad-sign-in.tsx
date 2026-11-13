"use client";

import { useAtomSet } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { constVoid } from "effect/Function";
import { useTranslations } from "next-intl";
import type { AdNetwork, ReachableAdAccount } from "peal-contract";
import { Button } from "peal-ui/components/button";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { toast } from "sonner";

import { adsChanged, completeAdSignIn, connectAdAccounts } from "#ads/api.ts";
import { adsErrorOf } from "#ads/errors.ts";
import type { AdsError } from "#ads/errors.ts";
import { forgetAdSignIn, pendingAdWorkspace } from "#ads/pending-sign-in.ts";
import type { AdSignInCallback } from "#ads/sign-in-callback.ts";
import { Link, useRouter } from "#i18n/navigation.ts";

import { AdSignInView, toggledAccounts } from "./ad-sign-in-view.tsx";
import type { AdSignInStep } from "./ad-sign-in-view.tsx";

// The tab's storage only changes from this page's own actions.
const ignoreChanges = () => constVoid;

// The server cannot read the tab's storage: it renders the waiting state,
// under a value no workspace id takes.
const notYetKnown = "";

const unknownOnServer = () => notYetKnown;

const unknown = (): AdsError => ({ key: "unknown" });

/** What the server answered a sign-in with, kept with its workspace. */
interface Reached {
  readonly accounts: readonly ReachableAdAccount[];
  readonly connectionId: string;
  readonly workspaceId: string;
}

interface CompleteAdSignInProps {
  /** What the network added to the page's address; null if unreadable. */
  readonly callback: AdSignInCallback | null;
  readonly network: AdNetwork;
}

// Hands what the ad network sent back to the server, for the workspace
// this tab started the sign-in in, then lets the member choose the ad
// accounts to connect, and returns to the workspace's ads.
export const CompleteAdSignIn = ({
  callback,
  network,
}: CompleteAdSignInProps) => {
  const t = useTranslations("Ads.callback");
  const router = useRouter();
  const complete = useAtomSet(completeAdSignIn, { mode: "promiseExit" });
  const connect = useAtomSet(connectAdAccounts, { mode: "promiseExit" });
  const [isPending, startTransition] = useTransition();

  // Kept with its workspace: the tab forgets the sign-in once it is back.
  const [failure, setFailure] = useState<{
    readonly error: AdsError;
    readonly workspaceId: string;
  } | null>(null);

  const [reached, setReached] = useState<Reached | null>(null);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [error, setError] = useState<AdsError | null>(null);

  // React runs effects twice in development; a sign-in completes once.
  const started = useRef(false);

  const workspaceId = useSyncExternalStore(
    ignoreChanges,
    () => pendingAdWorkspace(network),
    unknownOnServer
  );

  useEffect(() => {
    if (
      started.current ||
      workspaceId === notYetKnown ||
      workspaceId === null ||
      callback === null
    ) {
      return;
    }

    started.current = true;

    const finish = async (workspace: string, payload: AdSignInCallback) => {
      const exit = await complete({
        params: { network, workspaceId: workspace },
        payload,
      });

      forgetAdSignIn();

      if (Exit.isSuccess(exit)) {
        setReached({
          accounts: exit.value.accounts,
          connectionId: exit.value.connection.id,
          workspaceId: workspace,
        });

        return;
      }

      setFailure({
        error: Option.getOrElse(adsErrorOf(exit), unknown),
        workspaceId: workspace,
      });
    };

    void finish(workspaceId, callback);
  }, [callback, complete, network, workspaceId]);

  const handleSubmit = () => {
    if (reached === null || selected.length === 0) {
      return;
    }

    startTransition(async () => {
      const exit = await connect({
        params: {
          connectionId: reached.connectionId,
          workspaceId: reached.workspaceId,
        },
        payload: { externalIds: [...selected] },
        reactivityKeys: adsChanged(reached.workspaceId),
      });

      if (Exit.isSuccess(exit)) {
        toast.success(t("connected", { count: exit.value.length }));
        router.replace(`/app/${reached.workspaceId}/ads`);

        return;
      }

      setError(Option.getOrElse(adsErrorOf(exit), unknown));
    });
  };

  const step = ((): AdSignInStep => {
    if (reached !== null) {
      return {
        _tag: "choose",
        accounts: reached.accounts,
        error,
        pending: isPending,
        selected,
      };
    }

    if (failure !== null) {
      return { _tag: "failed", error: failure.error };
    }

    if (workspaceId === null) {
      return { _tag: "lost" };
    }

    return workspaceId !== notYetKnown && callback === null
      ? { _tag: "unreadable" }
      : { _tag: "completing" };
  })();

  // Where the member goes back to: the ads of the workspace once known.
  const known =
    reached?.workspaceId ??
    failure?.workspaceId ??
    (workspaceId === notYetKnown ? null : workspaceId);

  return (
    <AdSignInView
      step={step}
      back={
        known === null ? (
          <Button variant="outline" render={<Link href="/app" />}>
            {t("toWorkspaces")}
          </Button>
        ) : (
          <Button
            variant="outline"
            render={<Link href={`/app/${known}/ads`} />}
          >
            {t("toAds")}
          </Button>
        )
      }
      onSubmit={handleSubmit}
      onToggle={(externalId, checked) => {
        setSelected((before) =>
          reached === null
            ? before
            : toggledAccounts(reached.accounts, before, externalId, checked)
        );
      }}
    />
  );
};
