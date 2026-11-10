"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Cause, Exit, Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { ReductionRefused } from "peal-contract";
import type { Standing } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { useState, useTransition } from "react";

import {
  managesBilling,
  membersOf,
  reduceWorkspace,
} from "#billing/members.ts";
import type { UpgradeReason } from "#billing/upgrade.ts";
import { channelsOf } from "#channels/channels-api.ts";
import { OverPlanView } from "#components/billing/over-plan-view.tsx";
import type { OverPlanError } from "#components/billing/over-plan-view.tsx";
import { UpgradeOffer } from "#components/billing/upgrade-dialog.tsx";
import type { UpgradeWorkspace } from "#components/billing/upgrade-dialog.tsx";
import { Link } from "#i18n/navigation.ts";

interface OverPlanScreenProps {
  /** Where to write for more than the largest plan, if the operator says. */
  readonly contactUrl: string | null;
  /** The member reading. */
  readonly self: string;
  readonly standing: Standing;
  /** The terms of service, where the operator publishes them. */
  readonly termsUrl: string | null;
  readonly workspace: UpgradeWorkspace;
}

const isRefused = Schema.is(ReductionRefused);

// Why choosing what stays failed.
const errorOf = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): OverPlanError | null => {
  if (Exit.isSuccess(exit)) {
    return null;
  }

  return Cause.findErrorOption(exit.cause).pipe(
    Option.map((failure): OverPlanError => {
      if (isRefused(failure)) {
        return failure.reason;
      }

      return failure._tag === "Forbidden" ? "forbidden" : "generic";
    }),
    Option.getOrElse((): OverPlanError => "generic")
  );
};

// The limit the offer names: the first the workspace must come back within.
const reasonOf = (standing: Standing): UpgradeReason | null => {
  const [first] = standing.over;

  return first === undefined || standing.plan === null
    ? null
    : {
        allowed: first.allowed,
        limit: first.limit,
        plan: standing.plan,
        planWithRoom: standing.planWithRoom,
        used: first.used,
      };
};

/**
 * The screen a workspace over its plan shows instead of its pages, but
 * billing's: the upgrade, by card, or the choice of what stays, for those
 * who manage billing, and who can fix it for the others. Once the choice
 * is applied, the pages load again.
 */
export const OverPlanScreen = ({
  contactUrl,
  self,
  standing,
  termsUrl,
  workspace,
}: OverPlanScreenProps) => {
  const t = useTranslations("OverPlan");
  const channels = useAtomValue(channelsOf(workspace.id));
  const members = useAtomValue(membersOf(workspace.id));
  const reduce = useAtomSet(reduceWorkspace, { mode: "promiseExit" });
  const [keptChannels, setKeptChannels] = useState<readonly string[]>([]);
  const [keptMembers, setKeptMembers] = useState<readonly string[]>([self]);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<OverPlanError | null>(null);
  const [applying, startApplying] = useTransition();
  const reason = reasonOf(standing);

  const toggle =
    (set: (update: (kept: readonly string[]) => readonly string[]) => void) =>
    (id: string, kept: boolean) => {
      setConfirmed(false);
      set((before) =>
        kept ? [...before, id] : before.filter((other) => other !== id)
      );
    };

  const apply = () => {
    setError(null);

    startApplying(async () => {
      const done = await reduce({
        params: { workspaceId: workspace.id },
        payload: { keepChannelIds: keptChannels, keepMemberIds: keptMembers },
      });

      if (Exit.isSuccess(done) && !done.value.standing.mustReduce) {
        globalThis.location.reload();

        return;
      }

      setConfirmed(false);
      setError(errorOf(done));
    });
  };

  if (AsyncResult.isFailure(channels) && workspace.canManage) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("loadFailed")}</AlertDescription>
      </Alert>
    );
  }

  const people = AsyncResult.isSuccess(members) ? members.value : [];

  return (
    <OverPlanView
      applying={applying}
      billingLink={
        <Button
          variant="link"
          size="sm"
          render={<Link href={`/app/${workspace.id}/billing`} />}
          nativeButton={false}
        >
          {t("billing")}
        </Button>
      }
      canManage={workspace.canManage}
      channels={
        AsyncResult.isSuccess(channels)
          ? channels.value.map(({ handle, id, platform }) => ({
              id,
              name: handle,
              platform,
            }))
          : []
      }
      confirmed={confirmed}
      error={error}
      keptChannels={keptChannels}
      keptMembers={keptMembers}
      managers={people
        .filter(({ role }) => managesBilling(role))
        .map(({ name }) => name)}
      members={people}
      self={self}
      standing={standing}
      upgrade={
        reason === null ? null : (
          <UpgradeOffer
            contactUrl={contactUrl}
            reason={reason}
            termsUrl={termsUrl}
            workspace={workspace}
          />
        )
      }
      workspaceName={workspace.name}
      onApply={apply}
      onConfirm={setConfirmed}
      onKeepChannel={toggle(setKeptChannels)}
      onKeepMember={toggle(setKeptMembers)}
    />
  );
};
