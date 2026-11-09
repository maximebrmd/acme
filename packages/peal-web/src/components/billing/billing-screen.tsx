"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { PaidPlan } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";
import { Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { billingClient } from "#auth/billing-client.ts";
import { billingOf } from "#billing/api.ts";
import { BillingView } from "#components/billing/billing-view.tsx";
import type {
  BillingAction,
  BillingError,
} from "#components/billing/billing-view.tsx";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import { getPathname } from "#i18n/navigation.ts";
import { browserTimeZone } from "#posts/zoned-time.ts";

// Where Stripe sends the browser: its checkout or its customer portal.
const decodeRedirect = Schema.decodeUnknownOption(
  Schema.Struct({ url: Schema.String })
);

type Destination =
  | { readonly _tag: "failed"; readonly error: BillingError }
  | { readonly _tag: "go"; readonly url: string };

/** What a Better Auth client call answers. */
interface AuthResult {
  readonly data: unknown;
  readonly error: { readonly status: number } | null;
}

// Where to go next, or why not.
const destinationOf = (result: AuthResult): Destination => {
  if (result.error !== null) {
    return {
      _tag: "failed",
      error:
        result.error.status === 401 || result.error.status === 403
          ? "forbidden"
          : "generic",
    };
  }

  return Option.match(decodeRedirect(result.data), {
    onNone: () => ({ _tag: "failed", error: "generic" }),
    onSome: ({ url }) => ({ _tag: "go", url }),
  });
};

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
  readonly workspaceId: string;
}

const LoadedBilling = ({
  canManage,
  checkedOut,
  workspaceId,
}: BillingScreenProps) => {
  const locale = useLocale();
  const billing = useAtomValue(billingOf(workspaceId));
  const refresh = useAtomRefresh(billingOf(workspaceId));
  const [pending, setPending] = useState<BillingAction | null>(null);
  const [error, setError] = useState<BillingError | null>(null);
  const [, startTransition] = useTransition();

  const page = getPathname({ href: `/app/${workspaceId}/billing`, locale });

  // Leaves for Stripe, or says why not.
  const run = (action: BillingAction, request: () => Promise<AuthResult>) => {
    setPending(action);
    setError(null);

    startTransition(async () => {
      const destination = destinationOf(await request());

      if (destination._tag === "go") {
        globalThis.location.assign(destination.url);

        return;
      }

      setPending(null);
      setError(destination.error);
    });
  };

  const choose = (plan: PaidPlan) => {
    run(
      { _tag: "checkout", plan },
      async () =>
        await billingClient.subscription.upgrade({
          cancelUrl: page,
          customerType: "organization",
          disableRedirect: true,
          locale,
          plan,
          referenceId: workspaceId,
          returnUrl: page,
          successUrl: `${page}?checkout=done`,
        })
    );
  };

  const manage = () => {
    run(
      { _tag: "portal" },
      async () =>
        await billingClient.subscription.billingPortal({
          customerType: "organization",
          disableRedirect: true,
          locale,
          referenceId: workspaceId,
          returnUrl: page,
        })
    );
  };

  if (AsyncResult.isSuccess(billing)) {
    return (
      <BillingView
        billing={billing.value}
        canManage={canManage}
        checkedOut={checkedOut}
        error={error}
        pending={pending}
        onRefresh={refresh}
        onManage={manage}
        onChoose={choose}
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
 * session, its dates in the reader's time zone. Moving to a plan opens
 * Stripe's checkout; managing the subscription, its customer portal.
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
