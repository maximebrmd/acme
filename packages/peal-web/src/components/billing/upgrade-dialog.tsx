"use client";

import { useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { BillingInterval, Excess, PaidPlan } from "peal-contract";
import { Button } from "peal-ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "peal-ui/components/dialog";
import { useState, useTransition } from "react";

import { billingOf } from "#billing/api.ts";
import { managesBilling, membersOf } from "#billing/members.ts";
import type { UpgradeReason } from "#billing/upgrade.ts";
import { useCheckout } from "#billing/use-checkout.ts";
import type { BillingError } from "#components/billing/billing-view.tsx";
import { UpgradeView } from "#components/billing/upgrade-view.tsx";

/** The workspace a plan is ordered for, and what its member may do. */
export interface UpgradeWorkspace {
  /** Whether the member may order its plan (billing:manage). */
  readonly canManage: boolean;
  readonly id: string;
  readonly name: string;
}

export interface UpgradeDialogProps {
  /** Where to write for more than the largest plan, if the operator says. */
  readonly contactUrl: string | null;
  readonly onClose: () => void;
  readonly reason: UpgradeReason;
  /** The terms of service, where the operator publishes them. */
  readonly termsUrl: string | null;
  readonly workspace: UpgradeWorkspace;
}

// Whether the workspace is in its trial, for a member who reads billing.
const useTrialing = (workspaceId: string): boolean => {
  const billing = useAtomValue(billingOf(workspaceId));

  return (
    AsyncResult.isSuccess(billing) &&
    billing.value.subscription?.status === "trialing"
  );
};

const ManagedOffer = ({
  contactUrl,
  reason,
  termsUrl,
  workspace,
}: Omit<UpgradeDialogProps, "onClose">) => {
  const checkout = useCheckout(workspace.id);
  const trialing = useTrialing(workspace.id);

  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("month");

  const [consented, setConsented] = useState(false);
  const [error, setError] = useState<BillingError | null>(null);
  const [tooSmall, setTooSmall] = useState<readonly Excess[] | null>(null);
  const [ordering, startOrder] = useTransition();

  // Back to this page after the checkout, paid or not: what the person
  // was doing is still here.
  const order = (plan: PaidPlan) => {
    const here = `${globalThis.location.pathname}${globalThis.location.search}`;

    setError(null);
    setTooSmall(null);

    startOrder(async () => {
      const failed = await checkout({
        interval: billingInterval,
        plan,
        returnDone: here,
        returnTo: here,
        trial: false,
      });

      setError(
        failed.pipe(
          Option.map(({ error: reason_ }) => reason_),
          Option.getOrNull
        )
      );
      setTooSmall(
        failed.pipe(
          Option.map(({ tooSmall: over }) => over),
          Option.getOrNull
        )
      );
    });
  };

  return (
    <UpgradeView
      canManage
      consented={consented}
      contactUrl={contactUrl}
      error={error}
      interval={billingInterval}
      managers={[]}
      ordering={ordering}
      reason={reason}
      termsUrl={termsUrl}
      tooSmall={tooSmall}
      trialing={trialing}
      workspaceName={workspace.name}
      onConsent={setConsented}
      onInterval={setBillingInterval}
      onOrder={order}
    />
  );
};

const nothing = () => {
  // A member who cannot order has nothing to tick or press.
};

// For a member who cannot order: who can, by name.
const AskManagers = ({
  contactUrl,
  reason,
  termsUrl,
  workspace,
}: Omit<UpgradeDialogProps, "onClose">) => {
  const members = useAtomValue(membersOf(workspace.id));

  const managers = AsyncResult.isSuccess(members)
    ? members.value
        .filter(({ role }) => managesBilling(role))
        .map(({ name }) => name)
    : [];

  return (
    <UpgradeView
      canManage={false}
      consented={false}
      contactUrl={contactUrl}
      error={null}
      interval="month"
      managers={managers}
      ordering={false}
      reason={reason}
      termsUrl={termsUrl}
      tooSmall={null}
      trialing={false}
      workspaceName={workspace.name}
      onConsent={nothing}
      onInterval={nothing}
      onOrder={nothing}
    />
  );
};

/**
 * The upgrade offer on its own, as the over-plan screen shows it: to order
 * for a member who manages billing, or who can for the others.
 */
export const UpgradeOffer = (offer: Omit<UpgradeDialogProps, "onClose">) =>
  offer.workspace.canManage ? (
    <ManagedOffer {...offer} />
  ) : (
    <AskManagers {...offer} />
  );

/**
 * The dialog shown wherever a plan's limit refuses something: the upgrade
 * offer for the workspace, which a member who manages billing orders from
 * here, through the order and Stripe's checkout, coming back to the page
 * they were on. Rendered while there is a reason to show.
 */
export const UpgradeDialog = ({ onClose, ...offer }: UpgradeDialogProps) => {
  const t = useTranslations("Upgrade");

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg" closeLabel={t("closeLabel")}>
        <DialogHeader>
          <DialogTitle>{t("title", { limit: offer.reason.limit })}</DialogTitle>
        </DialogHeader>
        <UpgradeOffer {...offer} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
