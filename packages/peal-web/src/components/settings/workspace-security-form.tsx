"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Cause, Exit, Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { Forbidden } from "peal-contract";
import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { membersOf } from "#billing/members.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { apiErrorKey } from "#settings/errors.ts";
import { secureWorkspace, workspaceSecurity } from "#two-step/atoms.ts";

import { SettingsLoadFailed, SettingsLoading } from "./settings-status.tsx";
import { WorkspaceSecurityView } from "./workspace-security-view.tsx";

const isForbidden = Schema.is(Forbidden);

interface Reader {
  /** A link to the reader's account page. */
  readonly accountLink: ReactNode;
  /** Whether they manage members, and so see who has it on. */
  readonly managesMembers: boolean;
  /** Whether they may require it: an owner, in person. */
  readonly mayChange: boolean;
  /** Whether their own account has two-step verification on. */
  readonly ownEnabled: boolean;
  readonly workspaceId: string;
}

// Who does not have it on, by name, as the members list tells those who
// manage members.
const useWithout = (workspaceId: string, managesMembers: boolean) => {
  const members = useAtomValue(membersOf(workspaceId));

  if (!managesMembers) {
    return null;
  }

  return AsyncResult.match(members, {
    onFailure: () => null,
    onInitial: () => null,
    onSuccess: ({ value }) =>
      value
        .filter(({ twoStepEnabled }) => twoStepEnabled === false)
        .map(({ name }) => name),
  });
};

const LoadedSecurity = ({
  accountLink,
  managesMembers,
  mayChange,
  ownEnabled,
  workspaceId,
}: Reader) => {
  const t = useTranslations("TwoStep");
  const errors = useTranslations("Settings.errors");
  const atom = workspaceSecurity(workspaceId);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);
  const without = useWithout(workspaceId, managesMembers);
  const secure = useAtomSet(secureWorkspace, { mode: "promiseExit" });
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const change = (twoStepRequired: boolean) => {
    startTransition(async () => {
      const exit = await secure({
        params: { workspaceId },
        payload: { twoStepRequired },
        reactivityKeys: [`security:${workspaceId}`],
      });

      setConfirming(false);

      if (Exit.isSuccess(exit)) {
        setError(null);
        toast.success(twoStepRequired ? t("requireOn") : t("requireOff"));
        reload();

        return;
      }

      // The owner's own account must have it on first.
      const ownFirst = Cause.findErrorOption(exit.cause).pipe(
        Option.exists(
          (failure) =>
            isForbidden(failure) && failure.reason === "twoStepRequired"
        )
      );

      setError(
        ownFirst
          ? t("requireOwnFirst")
          : errors(Option.getOrElse(apiErrorKey(exit), () => "unknown"))
      );
    });
  };

  const handleRequire = () => {
    setConfirming(true);
  };

  const handleCancel = () => {
    setConfirming(false);
  };

  const handleConfirm = () => {
    change(true);
  };

  const handleStop = () => {
    change(false);
  };

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) => (
      <WorkspaceSecurityView
        accountLink={accountLink}
        confirming={confirming}
        error={error}
        mayChange={mayChange}
        ownEnabled={ownEnabled}
        pending={isPending}
        required={value.twoStepRequired}
        without={without}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        onRequire={handleRequire}
        onStop={handleStop}
      />
    ),
  });
};

/**
 * The workspace's security settings, read with the visitor's session once
 * the page runs.
 */
export const WorkspaceSecurityForm = (reader: Reader) =>
  useHydrated() ? <LoadedSecurity {...reader} /> : <SettingsLoading />;
