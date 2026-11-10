"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useLocale, useTranslations } from "next-intl";
import type { BillingInterval, Excess, PaidPlan } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";
import { useState, useTransition } from "react";

import { billingClient } from "#auth/billing-client.ts";
import {
  billingOf,
  cancelSubscription,
  previewWithdrawal,
  withdraw,
} from "#billing/api.ts";
import { billingErrorOf } from "#billing/errors.ts";
import { leaveFor, useCheckout } from "#billing/use-checkout.ts";
import { BillingView } from "#components/billing/billing-view.tsx";
import type {
  BillingAction,
  BillingError,
  BillingStep,
} from "#components/billing/billing-view.tsx";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import { getPathname } from "#i18n/navigation.ts";
import { browserTimeZone } from "#posts/zoned-time.ts";

const idle: BillingStep = { _tag: "idle" };

const Loading = () => (
  <div className="flex flex-col gap-3" aria-busy>
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

const LoadFailed = ({ onRetry }: { readonly onRetry: () => void }) => {
  const t = useTranslations("Billing");

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive">
        <AlertDescription>{t("loadFailed")}</AlertDescription>
      </Alert>
      <div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      </div>
    </div>
  );
};

interface BillingScreenProps {
  readonly canManage: boolean;
  readonly checkedOut: boolean;
  /** The terms of service, where the operator publishes them. */
  readonly termsUrl: string | null;
  readonly workspaceId: string;
}

const LoadedBilling = ({
  canManage,
  checkedOut,
  termsUrl,
  workspaceId,
}: BillingScreenProps) => {
  const locale = useLocale();
  const billing = useAtomValue(billingOf(workspaceId));
  const refresh = useAtomRefresh(billingOf(workspaceId));
  const checkout = useCheckout(workspaceId);
  const cancel = useAtomSet(cancelSubscription, { mode: "promiseExit" });
  const preview = useAtomSet(previewWithdrawal, { mode: "promiseExit" });
  const confirmWithdrawal = useAtomSet(withdraw, { mode: "promiseExit" });
  const [pending, setPending] = useState<BillingAction | null>(null);
  const [error, setError] = useState<BillingError | null>(null);
  const [step, setStep] = useState<BillingStep>(idle);
  const [tooSmall, setTooSmall] = useState<readonly Excess[] | null>(null);

  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("month");

  const [consented, setConsented] = useState(false);
  const [, startTransition] = useTransition();

  const page = getPathname({ href: `/app/${workspaceId}/billing`, locale });
  const params = { workspaceId };

  // Runs a request, then says why it failed, if it did.
  const run = (
    action: BillingAction,
    request: () => Promise<Option.Option<BillingError>>
  ) => {
    setPending(action);
    setError(null);

    startTransition(async () => {
      const failed = await request();

      setPending(null);
      setError(Option.getOrNull(failed));
    });
  };

  // The order first, which records the consent; then Stripe's checkout,
  // which needs it.
  const orderPlan = (plan: PaidPlan, trial: boolean) => {
    setTooSmall(null);

    run({ _tag: "order", plan, trial }, async () => {
      const failed = await checkout({
        interval: billingInterval,
        plan,
        returnDone: `${page}?checkout=done`,
        returnTo: page,
        trial,
      });

      setTooSmall(
        failed.pipe(
          Option.map(({ tooSmall: over }) => over),
          Option.getOrNull
        )
      );

      return failed.pipe(Option.map(({ error: reason }) => reason));
    });
  };

  const manage = () => {
    run(
      { _tag: "portal" },
      async () =>
        await leaveFor(
          async () =>
            await billingClient.subscription.billingPortal({
              customerType: "organization",
              disableRedirect: true,
              locale,
              referenceId: workspaceId,
              returnUrl: page,
            })
        )
    );
  };

  const confirmCancel = () => {
    run({ _tag: "cancel" }, async () => {
      const done = await cancel({ params });

      if (Exit.isSuccess(done)) {
        setStep({ _tag: "cancelled", endsAt: done.value.endsAt });
        refresh();
      }

      return billingErrorOf(done);
    });
  };

  const openWithdrawal = () => {
    run({ _tag: "withdraw" }, async () => {
      const found = await preview({ params });

      if (Exit.isSuccess(found)) {
        setStep({ _tag: "confirmWithdrawal", preview: found.value });
      }

      return billingErrorOf(found);
    });
  };

  const confirmWithdrawalNow = () => {
    run({ _tag: "withdraw" }, async () => {
      const done = await confirmWithdrawal({ params });

      if (Exit.isSuccess(done)) {
        setStep({ _tag: "withdrawn", refunded: done.value.refunded });
        refresh();
      }

      return billingErrorOf(done);
    });
  };

  if (AsyncResult.isSuccess(billing)) {
    return (
      <BillingView
        billing={billing.value}
        canManage={canManage}
        checkedOut={checkedOut}
        consented={consented}
        error={error}
        interval={billingInterval}
        pending={pending}
        step={step}
        termsUrl={termsUrl}
        tooSmall={tooSmall}
        onBack={() => {
          setStep(idle);
        }}
        onCancel={() => {
          setError(null);
          setStep({ _tag: "confirmCancel" });
        }}
        onConfirmCancel={confirmCancel}
        onConfirmWithdrawal={confirmWithdrawalNow}
        onConsent={setConsented}
        onInterval={setBillingInterval}
        onManage={manage}
        onOrder={orderPlan}
        onRefresh={refresh}
        onWithdraw={openWithdrawal}
      />
    );
  }

  return AsyncResult.isFailure(billing) ? (
    <LoadFailed onRetry={refresh} />
  ) : (
    <Loading />
  );
};

/**
 * A workspace's billing page, loaded by the browser with the member's
 * session, its dates in the reader's time zone. Ordering a plan records the
 * order, then opens Stripe's checkout; managing the subscription opens its
 * customer portal; cancelling and withdrawing ask for a confirmation here.
 */
export const BillingScreen = (props: BillingScreenProps) => {
  const hydrated = useHydrated();

  return hydrated ? (
    <InTimeZone timeZone={browserTimeZone()}>
      <LoadedBilling {...props} />
    </InTimeZone>
  ) : (
    <Loading />
  );
};
