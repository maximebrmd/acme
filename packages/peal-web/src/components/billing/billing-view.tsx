"use client";

import { DateTime, Schema } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type {
  Billing,
  BillingInterval,
  BillingSubscription,
  Money,
  PaidPlan,
  PlanAllowances,
  PlanLimit,
  PlanPrice,
  WithdrawalPreview,
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
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "peal-ui/components/progress";
import { useId } from "react";

/** What the person asked for, while it is under way. */
export type BillingAction =
  | {
      readonly _tag: "order";
      readonly plan: PaidPlan;
      readonly trial: boolean;
    }
  | { readonly _tag: "cancel" }
  | { readonly _tag: "portal" }
  | { readonly _tag: "withdraw" };

/** Why the last request failed. */
export type BillingError =
  | "forbidden"
  | "generic"
  | "noInvoices"
  | "nothingToCancel"
  | "trialUsed"
  | "withdrawalBusiness"
  | "withdrawalExpired";

/**
 * Where the person is in cancelling or withdrawing: each takes a
 * confirmation, then says what was done.
 */
export type BillingStep =
  | { readonly _tag: "idle" }
  | { readonly _tag: "confirmCancel" }
  | {
      readonly _tag: "confirmWithdrawal";
      readonly preview: WithdrawalPreview;
    }
  | { readonly _tag: "cancelled"; readonly endsAt: DateTime.Utc }
  | { readonly _tag: "withdrawn"; readonly refunded: Money };

export interface BillingViewProps {
  readonly billing: Billing;
  /** Whether the member may order, cancel or withdraw (billing:manage). */
  readonly canManage: boolean;
  /** Whether the person just came back from a checkout. */
  readonly checkedOut: boolean;
  /** Whether the box asking to start at once is ticked. */
  readonly consented: boolean;
  readonly error: BillingError | null;
  /** How often the plans shown are paid for. */
  readonly interval: BillingInterval;
  readonly onBack: () => void;
  readonly onCancel: () => void;
  readonly onConfirmCancel: () => void;
  readonly onConfirmWithdrawal: () => void;
  readonly onConsent: (consented: boolean) => void;
  readonly onInterval: (interval: BillingInterval) => void;
  readonly onManage: () => void;
  readonly onOrder: (plan: PaidPlan, trial: boolean) => void;
  readonly onRefresh: () => void;
  readonly onWithdraw: () => void;
  readonly pending: BillingAction | null;
  readonly step: BillingStep;
  /** The terms of service, where the operator publishes them. */
  readonly termsUrl: string | null;
}

const limits: readonly PlanLimit[] = [
  "channels",
  "members",
  "scheduledPosts",
  "assistantRequests",
  "mediaStorage",
];

const intervals: readonly BillingInterval[] = ["month", "year"];

const isPaidPlan = Schema.is(PaidPlanSchema);

const dateOf = (instant: DateTime.Utc) => DateTime.toDate(instant);

const gigabyte = 1_000_000_000;

// Money in the reader's way of writing it.
const useMoney = (currency: string) => {
  const format = useFormatter();

  return (cents: number) =>
    format.number(cents / 100, {
      currency: currency.toUpperCase(),
      style: "currency",
    });
};

// Bytes in decimal units, as the plans are sold.
const useSize = () => {
  const format = useFormatter();

  return (bytes: number) =>
    bytes >= gigabyte
      ? format.number(bytes / gigabyte, {
          maximumFractionDigits: 1,
          style: "unit",
          unit: "gigabyte",
        })
      : format.number(bytes / 1_000_000, {
          maximumFractionDigits: 0,
          style: "unit",
          unit: "megabyte",
        });
};

const withVat = (cents: number, rate: number) =>
  Math.round((cents * (100 + rate)) / 100);

const useDate = () => {
  const format = useFormatter();

  return (instant: DateTime.Utc) =>
    format.dateTime(dateOf(instant), { dateStyle: "long" });
};

const SubscriptionLines = ({
  subscription,
  withdrawableUntil,
}: {
  readonly subscription: BillingSubscription;
  readonly withdrawableUntil: DateTime.Utc | null;
}) => {
  const t = useTranslations("Billing.current");
  const dateIn = useDate();

  const lines: string[] = [];

  if (subscription.status === "trialing" && subscription.trialEnd !== null) {
    lines.push(t("trialEnds", { date: dateIn(subscription.trialEnd) }));
  } else if (subscription.currentPeriodEnd !== null) {
    const date = dateIn(subscription.currentPeriodEnd);

    lines.push(
      subscription.cancelAtPeriodEnd
        ? t("ends", { date })
        : t("renews", { date, interval: subscription.interval })
    );
  }

  if (withdrawableUntil !== null) {
    lines.push(t("withdrawable", { date: dateIn(withdrawableUntil) }));
  }

  return (
    <>
      {lines.map((line) => (
        <p key={line} className="text-muted-foreground text-sm">
          {line}
        </p>
      ))}
    </>
  );
};

const StepPanel = ({
  billing,
  onBack,
  onConfirmCancel,
  onConfirmWithdrawal,
  pending,
  step,
}: Pick<
  BillingViewProps,
  | "billing"
  | "onBack"
  | "onConfirmCancel"
  | "onConfirmWithdrawal"
  | "pending"
  | "step"
>) => {
  const t = useTranslations("Billing");
  const money = useMoney(billing.currency);
  const dateIn = useDate();
  const { subscription } = billing;

  if (step._tag === "cancelled") {
    return (
      <Alert aria-live="polite">
        <AlertTitle>{t("cancel.doneTitle")}</AlertTitle>
        <AlertDescription>
          {t("cancel.done", { date: dateIn(step.endsAt) })}
        </AlertDescription>
      </Alert>
    );
  }

  if (step._tag === "withdrawn") {
    return (
      <Alert aria-live="polite">
        <AlertTitle>{t("withdraw.doneTitle")}</AlertTitle>
        <AlertDescription>
          {t("withdraw.done", { refund: money(step.refunded.amount) })}
        </AlertDescription>
      </Alert>
    );
  }

  if (step._tag === "idle" || subscription === null) {
    return null;
  }

  const busy = pending !== null;

  if (step._tag === "confirmCancel") {
    const plan = t("plan", { plan: subscription.plan });

    const summary =
      subscription.status === "trialing" ||
      subscription.currentPeriodEnd === null
        ? t("cancel.summaryNow", { plan })
        : t("cancel.summary", {
            date: dateIn(subscription.currentPeriodEnd),
            plan,
          });

    return (
      <section aria-labelledby="billing-cancel">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 id="billing-cancel">{t("cancel.title")}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{summary}</p>
          </CardContent>
          <CardFooter>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                disabled={busy}
                focusableWhenDisabled
                onClick={onConfirmCancel}
              >
                {pending?._tag === "cancel"
                  ? t("cancel.confirming")
                  : t("cancel.confirm")}
              </Button>
              <Button variant="outline" disabled={busy} onClick={onBack}>
                {t("keep")}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </section>
    );
  }

  const { preview } = step;

  return (
    <section aria-labelledby="billing-withdraw">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 id="billing-withdraw">{t("withdraw.title")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {t("withdraw.summary", {
              plan: t("plan", { plan: preview.plan }),
              refund: money(preview.refund.amount),
              started: dateIn(preview.startedAt),
            })}
          </p>
        </CardContent>
        <CardFooter>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              disabled={busy}
              focusableWhenDisabled
              onClick={onConfirmWithdrawal}
            >
              {pending?._tag === "withdraw"
                ? t("withdraw.confirming")
                : t("withdraw.confirm")}
            </Button>
            <Button variant="outline" disabled={busy} onClick={onBack}>
              {t("keep")}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </section>
  );
};

// A workspace whose plan ended keeps its invoices at Stripe: the way to
// them stays.
const PastInvoices = ({
  billing,
  busy,
  canManage,
  onManage,
  pending,
}: Pick<BillingViewProps, "billing" | "canManage" | "onManage" | "pending"> & {
  readonly busy: boolean;
}) => {
  const t = useTranslations("Billing.current");

  if (!canManage || billing.subscription !== null) {
    return null;
  }

  return (
    <CardFooter>
      <div className="flex flex-col items-start gap-3">
        <Button
          variant="ghost"
          disabled={busy}
          focusableWhenDisabled
          onClick={onManage}
        >
          {pending?._tag === "portal" ? t("managing") : t("invoices")}
        </Button>
        <p className="text-muted-foreground text-xs">{t("invoicesHint")}</p>
      </div>
    </CardFooter>
  );
};

const CurrentPlan = ({
  billing,
  canManage,
  onCancel,
  onManage,
  onWithdraw,
  pending,
  step,
}: Pick<
  BillingViewProps,
  | "billing"
  | "canManage"
  | "onCancel"
  | "onManage"
  | "onWithdraw"
  | "pending"
  | "step"
>) => {
  const t = useTranslations("Billing");
  const { subscription, withdrawableUntil } = billing;
  const busy = pending !== null || step._tag !== "idle";
  const trial = subscription?.status === "trialing";

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
            <SubscriptionLines
              subscription={subscription}
              withdrawableUntil={withdrawableUntil}
            />
          )}
          {subscription?.status === "past_due" ? (
            <Alert variant="destructive">
              <AlertDescription>{t("current.pastDue")}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </CardContent>
      <PastInvoices
        billing={billing}
        busy={busy}
        canManage={canManage}
        pending={pending}
        onManage={onManage}
      />
      {canManage && subscription !== null ? (
        <CardFooter>
          <div className="flex flex-col items-start gap-3">
            <div className="flex flex-wrap gap-2">
              {subscription.cancelAtPeriodEnd ? null : (
                <Button
                  variant="outline"
                  disabled={busy}
                  focusableWhenDisabled
                  onClick={onCancel}
                >
                  {t("cancel.open")}
                </Button>
              )}
              {withdrawableUntil === null ? null : (
                <Button
                  variant="outline"
                  disabled={busy}
                  focusableWhenDisabled
                  onClick={onWithdraw}
                >
                  {pending?._tag === "withdraw" && step._tag === "idle"
                    ? t("withdraw.loading")
                    : t("withdraw.open")}
                </Button>
              )}
              {trial ? null : (
                <Button
                  variant="ghost"
                  disabled={busy}
                  focusableWhenDisabled
                  onClick={onManage}
                >
                  {pending?._tag === "portal"
                    ? t("current.managing")
                    : t("current.manage")}
                </Button>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {trial ? t("current.trialHint") : t("current.manageHint")}
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
  const size = useSize();
  const label = t("limit", { limit });
  const bytes = limit === "mediaStorage";

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
            {bytes
              ? t("unlimitedStorage", { used: size(used) })
              : t("unlimited", { used })}
          </span>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1">
      <Progress value={Math.min(used, allowed)} max={Math.max(allowed, 1)}>
        <ProgressLabel>{label}</ProgressLabel>
        <ProgressValue>
          {() =>
            bytes
              ? t("ofStorage", { allowed: size(allowed), used: size(used) })
              : t("of", { allowed, used })
          }
        </ProgressValue>
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
    mediaStorage: usage.mediaStorage,
    members: usage.members,
    scheduledPosts: usage.scheduledPosts.used,
  };

  const resetsAt: Readonly<Record<PlanLimit, DateTime.Utc | null>> = {
    assistantRequests: usage.assistantRequests.resetsAt,
    channels: null,
    mediaStorage: null,
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
  const size = useSize();

  return (
    <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
      {limits.map((limit) => {
        const count = allowances[limit];

        if (count === null) {
          return <li key={limit}>{t("unlimited", { limit })}</li>;
        }

        return (
          <li key={limit}>
            {limit === "mediaStorage"
              ? t("storage", { size: size(count) })
              : t("allowance", { count, limit })}
          </li>
        );
      })}
    </ul>
  );
};

const PriceLines = ({
  allowances,
  billing,
  interval,
  price,
}: {
  readonly allowances: PlanAllowances;
  readonly billing: Billing;
  readonly interval: BillingInterval;
  readonly price: PlanPrice;
}) => {
  const t = useTranslations("Billing.prices");
  const money = useMoney(billing.currency);
  const excluded = price[interval];
  const included = withVat(excluded, billing.vatRate);
  const monthly = interval === "year" ? included / 12 : included;
  const channels = allowances.channels ?? 1;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-2xl font-semibold tabular-nums">
        {t("included", { interval, price: money(included) })}
      </p>
      <p className="text-muted-foreground text-sm tabular-nums">
        {t("excluded", { price: money(excluded) })}
      </p>
      {interval === "year" ? (
        <p className="text-muted-foreground text-sm">
          {t("yearlyMonth", { price: money(Math.round(monthly)) })}
        </p>
      ) : null}
      <p className="text-muted-foreground text-sm">
        {t("perChannel", { price: money(Math.round(monthly / channels)) })}
      </p>
    </div>
  );
};

const IntervalSwitch = ({
  interval,
  onInterval,
}: Pick<BillingViewProps, "interval" | "onInterval">) => {
  const t = useTranslations("Billing.prices");

  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">{t("intervalLabel")}</legend>
      {intervals.map((each) => (
        <Button
          key={each}
          size="sm"
          variant={interval === each ? "default" : "outline"}
          aria-pressed={interval === each}
          onClick={() => {
            onInterval(each);
          }}
        >
          {t("interval", { interval: each })}
        </Button>
      ))}
    </fieldset>
  );
};

const Consent = ({
  consented,
  onConsent,
  termsUrl,
}: Pick<BillingViewProps, "consented" | "onConsent" | "termsUrl">) => {
  const t = useTranslations("Billing.consent");
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={consented}
          onCheckedChange={(checked) => {
            onConsent(checked);
          }}
        />
        <Label htmlFor={id}>{t("startNow")}</Label>
      </div>
      <p className="text-muted-foreground text-xs">
        {termsUrl === null ? (
          t("terms")
        ) : (
          <a className="underline underline-offset-4" href={termsUrl}>
            {t("termsLink")}
          </a>
        )}
      </p>
    </div>
  );
};

const TrialOffer = ({
  billing,
  consented,
  onOrder,
  pending,
}: Pick<BillingViewProps, "billing" | "consented" | "onOrder" | "pending">) => {
  const t = useTranslations("Billing");
  const { trial } = billing;

  if (trial === null || !trial.available || billing.subscription !== null) {
    return null;
  }

  const plan = t("plan", { plan: trial.plan });
  const starting = pending?._tag === "order" && pending.trial;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{t("trial.title", { days: trial.days, plan })}</h3>
        </CardTitle>
        <CardDescription>{t("trial.description", { plan })}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          variant="outline"
          disabled={!consented || pending !== null}
          focusableWhenDisabled
          onClick={() => {
            onOrder(trial.plan, true);
          }}
        >
          {starting ? t("trial.starting") : t("trial.start")}
        </Button>
      </CardFooter>
    </Card>
  );
};

const Plans = ({
  billing,
  canManage,
  consented,
  interval,
  onConsent,
  onInterval,
  onOrder,
  pending,
  termsUrl,
}: BillingViewProps) => {
  const t = useTranslations("Billing");
  const order = billing.plans.map(({ plan }) => plan);
  const current = order.indexOf(billing.plan ?? "free");

  const subscribed =
    billing.subscription !== null && billing.subscription.status !== "trialing";

  const hint = canManage
    ? t(consented ? "plans.inPortal" : "consent.needed")
    : t("plans.askAdmin");

  return (
    <section className="flex flex-col gap-4" aria-labelledby="billing-plans">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2
              id="billing-plans"
              className="text-xl font-semibold tracking-tight"
            >
              {t("plans.title")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("prices.vat", { rate: billing.vatRate })}
            </p>
          </div>
          <IntervalSwitch interval={interval} onInterval={onInterval} />
        </div>
        {canManage ? (
          <Consent
            consented={consented}
            onConsent={onConsent}
            termsUrl={termsUrl}
          />
        ) : null}
      </div>
      {canManage ? (
        <TrialOffer
          billing={billing}
          consented={consented}
          onOrder={onOrder}
          pending={pending}
        />
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {billing.plans.map(({ allowances, plan, price }, index) => {
          const ordering =
            pending?._tag === "order" &&
            !pending.trial &&
            pending.plan === plan;

          const orderable =
            canManage &&
            isPaidPlan(plan) &&
            price !== null &&
            (!subscribed || index > current);

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
                  <div className="flex flex-col gap-4">
                    {price === null ? (
                      <p className="text-2xl font-semibold">
                        {t("prices.free")}
                      </p>
                    ) : (
                      <PriceLines
                        allowances={allowances}
                        billing={billing}
                        interval={interval}
                        price={price}
                      />
                    )}
                    <AllowanceList allowances={allowances} />
                  </div>
                </CardContent>
                {orderable && isPaidPlan(plan) ? (
                  <CardFooter>
                    <div className="flex flex-col items-start gap-2">
                      <Button
                        disabled={!consented || pending !== null}
                        focusableWhenDisabled
                        onClick={() => {
                          onOrder(plan, false);
                        }}
                      >
                        {ordering ? t("plans.ordering") : t("plans.order")}
                      </Button>
                      <p className="text-muted-foreground text-xs">
                        {t("plans.renewal", { interval })}
                      </p>
                    </div>
                  </CardFooter>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground text-sm">{hint}</p>
    </section>
  );
};

/**
 * A workspace's billing: its plan and subscription, with cancelling and the
 * consumer's withdrawal; what it uses of each limit; and the plans, priced
 * with VAT first, to order or try. On a server that does not bill, only
 * what the workspace uses, without limits.
 */
export const BillingView = (props: BillingViewProps) => {
  const { billing, checkedOut, error, onRefresh } = props;
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
      <StepPanel {...props} />
      <div className="grid gap-6 md:grid-cols-2">
        <CurrentPlan {...props} />
        <Usage billing={billing} />
      </div>
      <Plans {...props} />
    </div>
  );
};
