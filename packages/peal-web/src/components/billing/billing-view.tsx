"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type {
  Billing,
  BillingAccountsUsage,
  BillingSubscription,
  Money,
  PlanLimit,
  WithdrawalPreview,
  RateCard,
} from "peal-contract";
import {
  displayVatRate,
  freeAccountsOf,
  rateCard as publishedCard,
  withDisplayVat,
} from "peal-contract";
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";
import { useId } from "react";

import { ladderOf, nextAccountOf } from "#billing/ladder.ts";
import { useMoney, useSize } from "#billing/size.ts";

/** What the person asked for, while it is under way. */
export type BillingAction =
  | { readonly _tag: "order" }
  | { readonly _tag: "cancel" }
  | { readonly _tag: "portal" }
  | { readonly _tag: "withdraw" };

/** Why the last request failed. */
export type BillingError =
  | "alreadySubscribed"
  | "billedElsewhere"
  | "consentChanged"
  | "forbidden"
  | "generic"
  | "noInvoices"
  | "nothingToCancel"
  | "planTooSmall"
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
  /**
   * Whether the member may order, cancel or withdraw (billing:manage, on
   * the workspace that bills its account).
   */
  readonly canManage: boolean;
  /** Whether the person just came back from a checkout. */
  readonly checkedOut: boolean;
  /** Whether the box asking to start at once is ticked. */
  readonly consented: boolean;
  readonly error: BillingError | null;
  readonly onBack: () => void;
  readonly onCancel: () => void;
  readonly onConfirmCancel: () => void;
  readonly onConfirmWithdrawal: () => void;
  readonly onConsent: (consented: boolean) => void;
  readonly onManage: () => void;
  /** Orders per-account pricing, then opens Stripe's checkout. */
  readonly onOrder: () => void;
  readonly onRefresh: () => void;
  readonly onWithdraw: () => void;
  readonly pending: BillingAction | null;
  readonly step: BillingStep;
  /** The terms of service, where the operator publishes them. */
  readonly termsUrl: string | null;
}

// The limits the usage card lists once billing is on: the accounts have a
// card of their own.
const usageLimits: readonly PlanLimit[] = [
  "members",
  "scheduledPosts",
  "assistantRequests",
  "mediaStorage",
];

const everyLimit: readonly PlanLimit[] = ["channels", ...usageLimits];

const dateOf = (instant: DateTime.Utc) => DateTime.toDate(instant);

const useDate = () => {
  const format = useFormatter();

  return (instant: DateTime.Utc) =>
    format.dateTime(dateOf(instant), { dateStyle: "long" });
};

// The rate card the server answers, else the one this app was built with.
const cardOf = (billing: Billing): RateCard =>
  billing.rateCard ?? publishedCard;

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
    // Cancelled for a later day, it ends then, not with this period.
    const date = dateIn(subscription.endsAt ?? subscription.currentPeriodEnd);

    if (subscription.cancelAtPeriodEnd) {
      lines.push(t("ends", { date }));
    } else if (subscription.plan === "payAsYouGo") {
      lines.push(t("nextInvoice", { date }));
    } else {
      lines.push(t("renews", { date, interval: subscription.interval }));
    }
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

const CancelPanel = ({
  billing,
  onBack,
  onConfirmCancel,
  pending,
  subscription,
}: Pick<
  BillingViewProps,
  "billing" | "onBack" | "onConfirmCancel" | "pending"
> & { readonly subscription: BillingSubscription }) => {
  const t = useTranslations("Billing");
  const dateIn = useDate();
  const busy = pending !== null;
  const plan = t("plan", { plan: subscription.plan });

  const summary = () => {
    if (
      subscription.status === "trialing" ||
      subscription.currentPeriodEnd === null
    ) {
      return t("cancel.summaryNow", { plan });
    }

    const date = dateIn(subscription.currentPeriodEnd);

    return billing.plan === "payAsYouGo"
      ? t("cancel.summaryPerAccount", { date })
      : t("cancel.summary", { date, plan });
  };

  return (
    <section aria-labelledby="billing-cancel">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 id="billing-cancel">{t("cancel.title")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{summary()}</p>
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
};

const WithdrawPanel = ({
  onBack,
  onConfirmWithdrawal,
  pending,
  preview,
}: Pick<BillingViewProps, "onBack" | "onConfirmWithdrawal" | "pending"> & {
  readonly preview: WithdrawalPreview;
}) => {
  const t = useTranslations("Billing");
  const money = useMoney(preview.refund.currency);
  const dateIn = useDate();
  const busy = pending !== null;

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
            {preview.plan === "payAsYouGo"
              ? t("withdraw.summaryPerAccount", {
                  started: dateIn(preview.startedAt),
                })
              : t("withdraw.summary", {
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

const Done = ({ step }: { readonly step: BillingStep }) => {
  const t = useTranslations("Billing");
  const dateIn = useDate();

  const money = useMoney(
    step._tag === "withdrawn" ? step.refunded.currency : "usd"
  );

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

  if (step._tag !== "withdrawn") {
    return null;
  }

  return (
    <Alert aria-live="polite">
      <AlertTitle>{t("withdraw.doneTitle")}</AlertTitle>
      <AlertDescription>
        {step.refunded.amount === 0
          ? t("withdraw.doneNothing")
          : t("withdraw.done", { refund: money(step.refunded.amount) })}
      </AlertDescription>
    </Alert>
  );
};

const StepPanel = (
  props: Pick<
    BillingViewProps,
    | "billing"
    | "onBack"
    | "onConfirmCancel"
    | "onConfirmWithdrawal"
    | "pending"
    | "step"
  >
) => {
  const { billing, step } = props;
  const { subscription } = billing;

  if (step._tag === "cancelled" || step._tag === "withdrawn") {
    return <Done step={step} />;
  }

  if (step._tag === "idle" || subscription === null) {
    return null;
  }

  return step._tag === "confirmCancel" ? (
    <CancelPanel {...props} subscription={subscription} />
  ) : (
    <WithdrawPanel {...props} preview={step.preview} />
  );
};

// What the plan the workspace is on gives, in a line.
const PlanSummary = ({ billing }: { readonly billing: Billing }) => {
  const t = useTranslations("Billing");
  const free = freeAccountsOf(cardOf(billing));
  const plan = billing.plan ?? "free";

  if (plan === "free") {
    return <p className="text-sm">{t("current.freeTier", { free })}</p>;
  }

  if (plan === "payAsYouGo") {
    return <p className="text-sm">{t("current.perAccount", { free })}</p>;
  }

  return (
    <p className="text-sm">
      {t("current.legacy", { plan: t("plan", { plan }) })}
    </p>
  );
};

// A workspace whose contract ended keeps its invoices at Stripe: the way to
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

// What a member who manages billing does with the contract: the portal
// (payment method, invoices), cancelling and, within 14 days, withdrawing.
const ContractActions = ({
  busy,
  onCancel,
  onManage,
  onWithdraw,
  pending,
  step,
  subscription,
  withdrawableUntil,
}: Pick<
  BillingViewProps,
  "onCancel" | "onManage" | "onWithdraw" | "pending" | "step"
> & {
  readonly busy: boolean;
  readonly subscription: BillingSubscription;
  readonly withdrawableUntil: DateTime.Utc | null;
}) => {
  const t = useTranslations("Billing");
  const trial = subscription.status === "trialing";

  return (
    <CardFooter>
      <div className="flex flex-col items-start gap-3">
        <div className="flex flex-wrap gap-2">
          {trial ? null : (
            <Button
              variant="outline"
              disabled={busy}
              focusableWhenDisabled
              onClick={onManage}
            >
              {pending?._tag === "portal"
                ? t("current.managing")
                : t("current.manage")}
            </Button>
          )}
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
        </div>
        <p className="text-muted-foreground text-xs">
          {trial ? t("current.trialHint") : t("current.manageHint")}
        </p>
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
            <Badge variant="outline">
              {t("current.status", { status: subscription.status })}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <PlanSummary billing={billing} />
          {subscription === null ? null : (
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
          {subscription?.status === "unpaid" ? (
            <Alert variant="destructive">
              <AlertDescription>{t("current.unpaid")}</AlertDescription>
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
        <ContractActions
          busy={busy}
          pending={pending}
          step={step}
          subscription={subscription}
          withdrawableUntil={withdrawableUntil}
          onCancel={onCancel}
          onManage={onManage}
          onWithdraw={onWithdraw}
        />
      ) : null}
    </Card>
  );
};

// The billing account's accounts this month, for the members of the
// workspace that bills it: what is connected, the account-days counted,
// what they cost by the ladder, and Stripe's next invoice when it says.
const MonthFigures = ({
  accountDays,
  accounts,
  billing,
}: {
  readonly accountDays: number;
  readonly accounts: BillingAccountsUsage;
  readonly billing: Billing;
}) => {
  const t = useTranslations("Billing.month");
  const usage = useTranslations("Billing.usage");
  const dollars = useMoney("usd");
  const upcoming = useMoney(billing.upcomingInvoice?.currency ?? "usd");
  const card = cardOf(billing);
  const free = freeAccountsOf(card);
  const workspaces = billing.account?.workspaces ?? 1;
  const next = nextAccountOf(accounts.pooled, card);
  const paying = billing.plan === "payAsYouGo";
  const cents = accounts.estimate?.amount ?? 0;

  // Every figure with France's VAT beside it: the server knows no
  // customer's own rate, so the rate shown is France's, and says so.
  const estimate = {
    estimate: dollars(cents),
    included: dollars(withDisplayVat(cents)),
    rate: displayVatRate,
  };

  return (
    <div className="flex flex-col gap-4">
      {billing.plan === "free" ? (
        <Progress
          value={Math.min(accounts.pooled, free)}
          max={Math.max(free, 1)}
        >
          <ProgressLabel>{t("accounts")}</ProgressLabel>
          <ProgressValue>
            {() => usage("of", { allowed: free, used: accounts.pooled })}
          </ProgressValue>
        </Progress>
      ) : null}
      <p className="text-sm">
        {workspaces > 1
          ? t("pooledAcross", {
              connected: accounts.connected,
              pooled: accounts.pooled,
              workspaces,
            })
          : t("pooledHere", { pooled: accounts.pooled })}
      </p>
      <p className="text-2xl font-semibold tabular-nums">
        {t("accountDays", { days: accountDays })}
      </p>
      <p className="text-sm tabular-nums">
        {paying ? t("estimatePaying", estimate) : t("estimateFree", estimate)}
      </p>
      <p className="text-muted-foreground text-sm tabular-nums">
        {next.price.excluded === 0
          ? t("nextAccountFree", { free, position: next.position })
          : t("nextAccount", {
              included: dollars(next.price.included),
              position: next.position,
              price: dollars(next.price.excluded),
              rate: displayVatRate,
            })}
      </p>
      {billing.upcomingInvoice === null ? null : (
        <p className="text-sm tabular-nums">
          {t("upcoming", { amount: upcoming(billing.upcomingInvoice.amount) })}
        </p>
      )}
    </div>
  );
};

const ThisMonth = ({ billing }: { readonly billing: Billing }) => {
  const t = useTranslations("Billing.month");
  const { accounts } = billing;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {accounts.accountDays === null ? (
          // Another workspace bills the account: this one reads its own
          // accounts, never the account's money.
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-semibold tabular-nums">
              {t("own", { connected: accounts.connected })}
            </p>
            <p className="text-muted-foreground text-sm">{t("elsewhere")}</p>
          </div>
        ) : (
          <MonthFigures
            accountDays={accounts.accountDays}
            accounts={accounts}
            billing={billing}
          />
        )}
      </CardContent>
    </Card>
  );
};

/** The two sentences every price in dollars comes with. */
export const CurrencyNote = () => {
  const t = useTranslations("Billing.prices");

  return <p className="text-muted-foreground text-xs">{t("perAccountNote")}</p>;
};

const Ladder = ({ billing }: { readonly billing: Billing }) => {
  const t = useTranslations("Billing.ladder");
  const dollars = useMoney("usd");
  const card = cardOf(billing);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="billing-ladder">
      <div className="flex flex-col gap-1">
        <h2
          id="billing-ladder"
          className="text-xl font-semibold tracking-tight"
        >
          {t("title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <div className="bg-card rounded-md border">
        <Table>
          <TableCaption>{t("caption")}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("accounts")}</TableHead>
              <TableHead scope="col" className="text-right">
                {t("price")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("priceIncluded", { rate: displayVatRate })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ladderOf(card).map(({ from, monthly, to }) => (
              <TableRow key={from}>
                <TableHead scope="row">
                  {to === null ? t("from", { from }) : t("band", { from, to })}
                </TableHead>
                <TableCell variant="numeric">
                  {monthly.excluded === 0
                    ? t("free")
                    : dollars(monthly.excluded)}
                </TableCell>
                <TableCell variant="numeric">
                  {monthly.included === 0
                    ? t("free")
                    : dollars(monthly.included)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm">
        {t("dayRule", {
          after: card.daysPerMonth + 1,
          days: card.daysPerMonth,
        })}
      </p>
      <p className="text-muted-foreground text-xs">
        {t("vatNote", { rate: displayVatRate })}
      </p>
      <CurrencyNote />
    </section>
  );
};

export const Consent = ({
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
            onConsent(checked === true);
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

/** The order button, worded as the law asks, with what follows it. */
export const OrderButton = ({
  consented,
  onOrder,
  ordering,
}: {
  readonly consented: boolean;
  readonly onOrder: () => void;
  readonly ordering: boolean;
}) => {
  const t = useTranslations("Billing.payment");

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        disabled={!consented || ordering}
        focusableWhenDisabled
        onClick={onOrder}
      >
        {ordering ? t("ordering") : t("order")}
      </Button>
      {consented ? null : (
        <p className="text-muted-foreground text-xs">{t("needed")}</p>
      )}
      <p className="text-muted-foreground text-xs">{t("card")}</p>
    </div>
  );
};

const AddPaymentMethod = ({
  billing,
  canManage,
  consented,
  onConsent,
  onOrder,
  pending,
  termsUrl,
}: Pick<
  BillingViewProps,
  | "billing"
  | "canManage"
  | "consented"
  | "onConsent"
  | "onOrder"
  | "pending"
  | "termsUrl"
>) => {
  const t = useTranslations("Billing.payment");
  const card = cardOf(billing);

  return (
    <section aria-labelledby="billing-payment">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 id="billing-payment">{t("title")}</h2>
          </CardTitle>
          <CardDescription>
            {t("description", {
              ceiling: card.unverifiedCeiling,
              free: freeAccountsOf(card),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <Consent
              consented={consented}
              onConsent={onConsent}
              termsUrl={termsUrl}
            />
          ) : (
            <p className="text-sm">{t("askAdmin")}</p>
          )}
        </CardContent>
        {canManage ? (
          <CardFooter>
            <OrderButton
              consented={consented}
              ordering={pending?._tag === "order"}
              onOrder={onOrder}
            />
          </CardFooter>
        ) : null}
      </Card>
    </section>
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

const Usage = ({
  billing,
  limits,
}: {
  readonly billing: Billing;
  readonly limits: readonly PlanLimit[];
}) => {
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

/**
 * A workspace's billing on per-account pricing's rate card: the plan it is
 * on (the free tier, per-account pricing, or a legacy plan read as it is)
 * with cancelling and the consumer's withdrawal; the billing account's
 * month, its account-days and their cost, for the members of the workspace
 * that bills it only; adding a payment method, behind the consent box; the
 * ladder; and what the workspace uses of each other limit. On a server that
 * does not bill, only what the workspace uses, without limits.
 */
export const BillingView = (props: BillingViewProps) => {
  const { billing, canManage, checkedOut, error, onRefresh } = props;
  const t = useTranslations("Billing");

  if (!billing.enabled) {
    return (
      <div className="flex flex-col gap-8">
        <Alert>
          <AlertTitle>{t("off.title")}</AlertTitle>
          <AlertDescription>{t("off.description")}</AlertDescription>
        </Alert>
        <Usage billing={billing} limits={everyLimit} />
      </div>
    );
  }

  // The workspace that bills the account reads its month; only it orders.
  const billsHere = billing.accounts.accountDays !== null;

  const offersPaymentMethod =
    billsHere && billing.plan === "free" && billing.subscription === null;

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
        <CurrentPlan {...props} canManage={canManage && billsHere} />
        <ThisMonth billing={billing} />
      </div>
      {offersPaymentMethod ? <AddPaymentMethod {...props} /> : null}
      <Ladder billing={billing} />
      <Usage billing={billing} limits={usageLimits} />
    </div>
  );
};
