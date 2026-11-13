"use client";

import { useTranslations } from "next-intl";
import { billingCurrency, displayVatRate, planCatalogue } from "peal-contract";
import type { BillingInterval, Excess, PaidPlan } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";

import { useMoney, useSize } from "#billing/size.ts";
import { offerOf } from "#billing/upgrade.ts";
import type { UpgradeReason } from "#billing/upgrade.ts";
import { Consent, IntervalSwitch } from "#components/billing/billing-view.tsx";
import type { BillingError } from "#components/billing/billing-view.tsx";
import { ExcessList } from "#components/billing/excess-list.tsx";
import { PerAccountPrice } from "#components/billing/per-account-price.tsx";

export interface UpgradeViewProps {
  /** Whether the member may order a plan (billing:manage). */
  readonly canManage: boolean;
  /** Whether the box asking to start at once is ticked. */
  readonly consented: boolean;
  /** Where to write for more than the largest plan, if the operator says. */
  readonly contactUrl: string | null;
  readonly error: BillingError | null;
  readonly interval: BillingInterval;
  /** The names of those who can order, for a member who cannot. */
  readonly managers: readonly string[];
  readonly onConsent: (consented: boolean) => void;
  readonly onInterval: (interval: BillingInterval) => void;
  readonly onOrder: (plan: PaidPlan) => void;
  /** Whether the order is on its way to checkout. */
  readonly ordering: boolean;
  readonly reason: UpgradeReason;
  /** The terms of service, where the operator publishes them. */
  readonly termsUrl: string | null;
  /** What the workspace holds beyond the plan just ordered, if refused. */
  readonly tooSmall: readonly Excess[] | null;
  /** Whether the workspace is in its trial. */
  readonly trialing: boolean;
  /** The workspace the plan is ordered for. */
  readonly workspaceName: string;
}

// What was refused, with what the workspace holds against its plan.
const Reached = ({
  reason,
  workspaceName,
}: Pick<UpgradeViewProps, "reason" | "workspaceName">) => {
  const t = useTranslations("Upgrade");
  const billing = useTranslations("Billing");
  const size = useSize();
  const plan = billing("plan", { plan: reason.plan });

  return (
    <p>
      {reason.limit === "mediaStorage"
        ? t("reachedStorage", {
            allowed: size(reason.allowed),
            plan,
            used: size(reason.used),
            workspace: workspaceName,
          })
        : t("reached", {
            allowed: reason.allowed,
            limit: reason.limit,
            plan,
            used: reason.used,
            workspace: workspaceName,
          })}
    </p>
  );
};

// What the plan with room allows of the limit reached.
const useRoom = () => {
  const billing = useTranslations("Billing.plans");
  const size = useSize();

  return (plan: PaidPlan, reason: UpgradeReason): string => {
    const { limit } = reason;

    // Per-account pricing limits none of the legacy plans' limits.
    const count =
      plan === "payAsYouGo" ? null : planCatalogue[plan].limits[limit];

    if (count === null) {
      return billing("unlimited", { limit });
    }

    return limit === "mediaStorage"
      ? billing("storage", { size: size(count) })
      : billing("allowance", { count, limit });
  };
};

const Offer = ({
  consented,
  interval,
  onConsent,
  onInterval,
  onOrder,
  ordering,
  plan,
  reason,
  termsUrl,
}: Pick<
  UpgradeViewProps,
  | "consented"
  | "interval"
  | "onConsent"
  | "onInterval"
  | "onOrder"
  | "ordering"
  | "reason"
  | "termsUrl"
> & { readonly plan: PaidPlan }) => {
  const t = useTranslations("Upgrade");
  const billing = useTranslations("Billing");
  const money = useMoney(billingCurrency);
  const room = useRoom();

  // Per-account pricing, the only plan sold, is monthly: no period to
  // choose. A legacy plan's price is no longer offered, but read as it was.
  const priceLines =
    plan === "payAsYouGo" ? (
      <PerAccountPrice />
    ) : (
      <>
        <p className="text-2xl font-semibold tabular-nums">
          {billing("prices.included", {
            interval,
            price: money(offerOf(plan)[interval].included),
          })}
        </p>
        <p className="text-muted-foreground text-sm tabular-nums">
          {billing("prices.excluded", {
            price: money(offerOf(plan)[interval].excluded),
          })}
        </p>
        <p className="text-muted-foreground text-xs">
          {billing("prices.vat", { rate: displayVatRate })}
        </p>
      </>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-medium">
          {t("offer", { plan: billing("plan", { plan }) })} {room(plan, reason)}
        </p>
        {priceLines}
      </div>
      {plan === "payAsYouGo" ? null : (
        <IntervalSwitch interval={interval} onInterval={onInterval} />
      )}
      <Consent
        consented={consented}
        onConsent={onConsent}
        termsUrl={termsUrl}
      />
      <div className="flex flex-col items-start gap-2">
        <Button
          disabled={!consented || ordering}
          focusableWhenDisabled
          onClick={() => {
            onOrder(plan);
          }}
        >
          {ordering ? billing("plans.ordering") : billing("plans.order")}
        </Button>
        <p className="text-muted-foreground text-xs">
          {billing("plans.renewal", {
            interval: plan === "payAsYouGo" ? "month" : interval,
          })}
        </p>
        <p className="text-muted-foreground text-xs">{t("comeBack")}</p>
      </div>
    </div>
  );
};

/**
 * What a member reads when the workspace's plan refuses something: which
 * limit was reached, with what the workspace holds and its plan; then the
 * smallest plan with room, its price with VAT first and without, monthly
 * or yearly, to order with the request to start at once and the button
 * worded as an obligation to pay, before Stripe's checkout. On the largest
 * plan, how to ask for more; to a member who cannot order, who can. One
 * view for every place a limit refuses something.
 */
export const UpgradeView = (props: UpgradeViewProps) => {
  const {
    canManage,
    contactUrl,
    error,
    managers,
    reason,
    tooSmall,
    trialing,
    workspaceName,
  } = props;

  const t = useTranslations("Upgrade");
  const billing = useTranslations("Billing");
  const { planWithRoom } = reason;

  const wayOut = () => {
    if (planWithRoom === null) {
      return contactUrl === null ? (
        <p>{t("largestOperator", { workspace: workspaceName })}</p>
      ) : (
        <p>
          {t("largest", { workspace: workspaceName })}{" "}
          <a className="underline underline-offset-4" href={contactUrl}>
            {t("contact")}
          </a>
        </p>
      );
    }

    if (!canManage) {
      return (
        <p>
          {managers.length === 0
            ? t("askSomeone")
            : t("askManagers", {
                names: managers.join(", "),
                workspace: workspaceName,
              })}
        </p>
      );
    }

    return <Offer {...props} plan={planWithRoom} />;
  };

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col gap-1">
        <Reached reason={reason} workspaceName={workspaceName} />
        <p className="text-muted-foreground">
          {t("orRemove", { limit: reason.limit })}
        </p>
      </div>
      {trialing && canManage && planWithRoom !== null ? (
        <p>{t("trial", { workspace: workspaceName })}</p>
      ) : null}
      {canManage &&
      planWithRoom === "payAsYouGo" &&
      !trialing &&
      reason.plan !== "free" &&
      reason.plan !== "payAsYouGo" ? (
        <p>
          {t("legacyMove", {
            plan: billing("plan", { plan: reason.plan }),
            workspace: workspaceName,
          })}
        </p>
      ) : null}
      {error === null ? null : (
        <Alert variant="destructive" aria-live="assertive">
          <AlertDescription>{billing(`errors.${error}`)}</AlertDescription>
        </Alert>
      )}
      {tooSmall === null ? null : (
        <Alert variant="destructive" aria-live="assertive">
          <AlertDescription>
            <p>{t("tooSmall")}</p>
            <ExcessList excesses={tooSmall} namespace="Upgrade" />
          </AlertDescription>
        </Alert>
      )}
      {wayOut()}
    </div>
  );
};
