"use client";

import { DateTime, Schema } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type {
  Billing,
  BillingSubscription,
  PaidPlan,
  PlanAllowances,
  PlanLimit,
} from "peal-contract";
import { PaidPlanSchema } from "peal-contract";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "peal-ui/components/progress";

/** What the person asked Stripe for, while it opens. */
export type BillingAction =
  | { readonly _tag: "checkout"; readonly plan: PaidPlan }
  | { readonly _tag: "portal" };

/** Why the last request to Stripe failed. */
export type BillingError = "forbidden" | "generic";

export interface BillingViewProps {
  readonly billing: Billing;
  /** Whether the member may change the plan (billing:manage). */
  readonly canManage: boolean;
  /** Whether the person just came back from a checkout. */
  readonly checkedOut: boolean;
  readonly error: BillingError | null;
  readonly onChoose: (plan: PaidPlan) => void;
  readonly onManage: () => void;
  readonly onRefresh: () => void;
  readonly pending: BillingAction | null;
}

const limits: readonly PlanLimit[] = [
  "channels",
  "members",
  "scheduledPosts",
  "assistantRequests",
];

const isPaidPlan = Schema.is(PaidPlanSchema);

const dateOf = (instant: DateTime.Utc) => DateTime.toDate(instant);

const SubscriptionLine = ({
  subscription,
}: {
  readonly subscription: BillingSubscription;
}) => {
  const t = useTranslations("Billing.current");
  const format = useFormatter();

  if (subscription.currentPeriodEnd === null) {
    return null;
  }

  const date = format.dateTime(dateOf(subscription.currentPeriodEnd), {
    dateStyle: "long",
  });

  return (
    <p className="text-muted-foreground text-sm">
      {subscription.cancelAtPeriodEnd
        ? t("ends", { date })
        : t("renews", { date })}
    </p>
  );
};

const CurrentPlan = ({
  billing,
  canManage,
  onManage,
  pending,
}: Pick<
  BillingViewProps,
  "billing" | "canManage" | "onManage" | "pending"
>) => {
  const t = useTranslations("Billing");
  const { subscription } = billing;
  const opening = pending?._tag === "portal";

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("current.title")}</h2>
        </CardTitle>
        <CardDescription>
          {t("plan", { plan: billing.plan ?? "free" })}
        </CardDescription>
        {subscription === null ? null : (
          <CardAction>
            <Badge
              variant={
                subscription.status === "past_due" ? "destructive" : "outline"
              }
            >
              {t("current.status", { status: subscription.status })}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {subscription === null ? (
            <p className="text-muted-foreground text-sm">{t("current.free")}</p>
          ) : (
            <SubscriptionLine subscription={subscription} />
          )}
          {subscription?.status === "past_due" ? (
            <Alert variant="destructive">
              <AlertDescription>{t("current.pastDue")}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </CardContent>
      {canManage && subscription !== null ? (
        <CardFooter>
          <div className="flex flex-col items-start gap-2">
            <Button
              variant="outline"
              disabled={pending !== null}
              focusableWhenDisabled
              onClick={onManage}
            >
              {opening ? t("current.managing") : t("current.manage")}
            </Button>
            <p className="text-muted-foreground text-xs">
              {t("current.manageHint")}
            </p>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
};

const UsageMeter = ({
  allowed,
  limit,
  resetsAt,
  used,
}: {
  readonly allowed: number | null;
  readonly limit: PlanLimit;
  readonly resetsAt: DateTime.Utc | null;
  readonly used: number;
}) => {
  const t = useTranslations("Billing.usage");
  const format = useFormatter();
  const label = t("limit", { limit });

  const resets =
    resetsAt === null
      ? null
      : t("resets", {
          date: format.dateTime(dateOf(resetsAt), { dateStyle: "medium" }),
        });

  if (allowed === null) {
    return (
      <li className="flex flex-col gap-1">
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground tabular-nums">
            {t("unlimited", { used })}
          </span>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1">
      <Progress value={Math.min(used, allowed)} max={Math.max(allowed, 1)}>
        <ProgressLabel>{label}</ProgressLabel>
        <ProgressValue>{() => t("of", { allowed, used })}</ProgressValue>
      </Progress>
      {resets === null ? null : (
        <p className="text-muted-foreground text-xs">{resets}</p>
      )}
    </li>
  );
};

const Usage = ({ billing }: { readonly billing: Billing }) => {
  const t = useTranslations("Billing.usage");
  const { allowances, usage } = billing;

  const used: Readonly<Record<PlanLimit, number>> = {
    assistantRequests: usage.assistantRequests.used,
    channels: usage.channels,
    members: usage.members,
    scheduledPosts: usage.scheduledPosts.used,
  };

  const resetsAt: Readonly<Record<PlanLimit, DateTime.Utc | null>> = {
    assistantRequests: usage.assistantRequests.resetsAt,
    channels: null,
    members: null,
    scheduledPosts: usage.scheduledPosts.resetsAt,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-5">
          {limits.map((limit) => (
            <UsageMeter
              key={limit}
              allowed={allowances[limit]}
              limit={limit}
              resetsAt={resetsAt[limit]}
              used={used[limit]}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

const AllowanceList = ({
  allowances,
}: {
  readonly allowances: PlanAllowances;
}) => {
  const t = useTranslations("Billing.plans");

  return (
    <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
      {limits.map((limit) => {
        const count = allowances[limit];

        return (
          <li key={limit}>
            {count === null
              ? t("unlimited", { limit })
              : t("allowance", { count, limit })}
          </li>
        );
      })}
    </ul>
  );
};

const Plans = ({
  billing,
  canManage,
  onChoose,
  pending,
}: Pick<
  BillingViewProps,
  "billing" | "canManage" | "onChoose" | "pending"
>) => {
  const t = useTranslations("Billing");
  const order = billing.plans.map(({ plan }) => plan);
  const current = order.indexOf(billing.plan ?? "free");

  return (
    <section className="flex flex-col gap-4" aria-labelledby="billing-plans">
      <div className="flex flex-col gap-1">
        <h2 id="billing-plans" className="text-xl font-semibold tracking-tight">
          {t("plans.title")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("plans.description")}
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {billing.plans.map(({ allowances, plan }, index) => {
          const choosing =
            pending?._tag === "checkout" && pending.plan === plan;

          return (
            <li key={plan}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>
                    <h3>{t("plan", { plan })}</h3>
                  </CardTitle>
                  {index === current ? (
                    <CardAction>
                      <Badge>{t("plans.yours")}</Badge>
                    </CardAction>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <AllowanceList allowances={allowances} />
                </CardContent>
                {canManage && index > current && isPaidPlan(plan) ? (
                  <CardFooter>
                    <Button
                      disabled={pending !== null}
                      focusableWhenDisabled
                      onClick={() => {
                        onChoose(plan);
                      }}
                    >
                      {choosing
                        ? t("plans.choosing")
                        : t("plans.choose", { plan: t("plan", { plan }) })}
                    </Button>
                  </CardFooter>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground text-sm">
        {canManage ? t("plans.inPortal") : t("plans.askAdmin")}
      </p>
    </section>
  );
};

/**
 * A workspace's billing: its plan and subscription, what it uses of each
 * limit, and the plans to move to. On a server that does not bill, only
 * what the workspace uses, without limits.
 */
export const BillingView = ({
  billing,
  canManage,
  checkedOut,
  error,
  onChoose,
  onManage,
  onRefresh,
  pending,
}: BillingViewProps) => {
  const t = useTranslations("Billing");

  if (!billing.enabled) {
    return (
      <div className="flex flex-col gap-8">
        <Alert>
          <AlertTitle>{t("off.title")}</AlertTitle>
          <AlertDescription>{t("off.description")}</AlertDescription>
        </Alert>
        <Usage billing={billing} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {checkedOut ? (
        <Alert aria-live="polite">
          <AlertDescription>
            <div className="flex flex-wrap items-center gap-3">
              {t("checkout.done")}
              <Button variant="outline" size="sm" onClick={onRefresh}>
                {t("checkout.refresh")}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      {error === null ? null : (
        <Alert variant="destructive" aria-live="assertive">
          <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <CurrentPlan
          billing={billing}
          canManage={canManage}
          onManage={onManage}
          pending={pending}
        />
        <Usage billing={billing} />
      </div>
      <Plans
        billing={billing}
        canManage={canManage}
        onChoose={onChoose}
        pending={pending}
      />
    </div>
  );
};
