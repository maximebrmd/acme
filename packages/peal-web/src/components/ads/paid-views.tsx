"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type {
  AdAccount,
  Boost,
  BoostState,
  PostAdPerformanceSchema,
} from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import type { ReactNode } from "react";

import { digitsOfCurrency } from "#ads/money.ts";
import { useMoney } from "#ads/use-money.ts";

// The paid section of a post's page: its boosts, and what the platform
// counted beside what its ads did. Its state lives in post-paid.tsx.

type PostAdPerformance = typeof PostAdPerformanceSchema.Type;

/** What a member may ask of a boost. */
export type BoostControl = "pause" | "resume" | "stop";

const controls: Readonly<Record<BoostState, readonly BoostControl[]>> = {
  active: ["pause", "stop"],
  ended: [],
  failed: [],
  paused: ["resume", "stop"],
  requested: ["stop"],
  stopped: [],
  unconfirmed: ["pause", "stop"],
};

/**
 * What can be asked of a boost where it stands: one that runs or may run
 * pauses, a paused one resumes, and any that is not over stops.
 */
export const controlsOf = (state: BoostState): readonly BoostControl[] =>
  controls[state];

const stateVariants = {
  active: "secondary",
  ended: "outline",
  failed: "destructive",
  paused: "outline",
  requested: "outline",
  stopped: "outline",
  unconfirmed: "destructive",
} as const;

const Figure = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="text-muted-foreground text-sm">{label}</dt>
    <dd className="text-sm tabular-nums">{children}</dd>
  </div>
);

const BoostItem = ({
  account,
  actions,
  boost,
  channel,
}: {
  readonly account: AdAccount | undefined;
  readonly actions: ReactNode;
  readonly boost: Boost;
  readonly channel: string;
}) => {
  const t = useTranslations("Ads.paid");
  const money = useMoney();
  const digits = account?.minorUnitDigits ?? digitsOfCurrency(boost.currency);
  const amount = (minor: number) => money(minor, boost.currency, digits);

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-medium">{t("boostOn", { channel })}</h4>
        <Badge variant={stateVariants[boost.state]}>
          {t("state", { state: boost.state })}
        </Badge>
      </div>
      <p className="text-sm">
        {t("boostLine", {
          account: account?.name ?? t("unknownAccount"),
          budget: amount(boost.budget.amount),
          committed: amount(boost.committed),
          endsAt: DateTime.toDate(boost.endsAt),
          kind: boost.budget.kind,
        })}
      </p>
      {boost.state === "requested" ? (
        <p className="text-muted-foreground text-sm">{t("requested")}</p>
      ) : null}
      {boost.state === "failed" ? (
        <p className="text-sm">
          {t("failed", {
            reason: t("failureReason", {
              reason: boost.failureReason ?? "refused",
            }),
          })}
          {boost.networkCode === null
            ? null
            : ` ${t("networkCode", { code: boost.networkCode })}`}
        </p>
      ) : null}
      {boost.state === "unconfirmed" ? (
        <Alert variant="destructive">
          <AlertDescription>{t("unconfirmed")}</AlertDescription>
        </Alert>
      ) : null}
      {actions === null || actions === undefined ? null : (
        <div className="flex flex-wrap gap-2">{actions}</div>
      )}
    </li>
  );
};

interface PaidSectionViewProps {
  /** The workspace's ad accounts, which name a boost's and give its digits. */
  readonly accounts: readonly AdAccount[];
  /** What the member may do to a boost, where it stands. */
  readonly renderActions?: (boost: Boost) => ReactNode;
  /** A channel of the post, by name. */
  readonly channelName: (channelId: string) => string;
  readonly performance: PostAdPerformance;
}

/**
 * A post's boosts, each with its state, budget, the most it can cost, its
 * end and why it failed, then the post's organic counts beside what its
 * ads did, in two labelled columns that are never added up.
 */
export const PaidSectionView = ({
  accounts,
  renderActions,
  channelName,
  performance,
}: PaidSectionViewProps) => {
  const t = useTranslations("Ads.paid");
  const format = useFormatter();
  const money = useMoney();

  const count = (value: number | null) =>
    value === null ? t("notGiven") : format.number(value);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t("boostsTitle")}</h3>
        {performance.boosts.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noBoosts")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {performance.boosts.map((boost) => (
              <BoostItem
                key={boost.id}
                account={accounts.find(({ id }) => id === boost.accountId)}
                actions={renderActions?.(boost)}
                boost={boost}
                channel={channelName(boost.channelId)}
              />
            ))}
          </ul>
        )}
      </div>
      <p className="text-muted-foreground text-sm">{t("note")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t("organic")}</h3>
          <p className="text-muted-foreground text-xs">{t("organicHint")}</p>
          {performance.organic.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noOrganic")}</p>
          ) : (
            performance.organic.map((counts) => (
              <div key={counts.channelId} className="flex flex-col gap-1">
                <h4 className="text-sm">{channelName(counts.channelId)}</h4>
                {counts.readAt === null ? (
                  <p className="text-muted-foreground text-sm">
                    {t("notRead")}
                  </p>
                ) : (
                  <dl className="flex flex-col gap-1">
                    <Figure label={t("metric", { metric: "impressions" })}>
                      {count(counts.impressions)}
                    </Figure>
                    <Figure label={t("metric", { metric: "likes" })}>
                      {count(counts.likes)}
                    </Figure>
                    <Figure label={t("metric", { metric: "reposts" })}>
                      {count(counts.reposts)}
                    </Figure>
                    <Figure label={t("metric", { metric: "replies" })}>
                      {count(counts.replies)}
                    </Figure>
                  </dl>
                )}
              </div>
            ))
          )}
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t("paidColumn")}</h3>
          <p className="text-muted-foreground text-xs">{t("paidHint")}</p>
          {performance.paid.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noPaid")}</p>
          ) : (
            performance.paid.map(({ account, ads, totals }) => (
              <div key={account.id} className="flex flex-col gap-1">
                <h4 className="text-sm">
                  {t("paidAccount", { ads, name: account.name })}
                </h4>
                <dl className="flex flex-col gap-1">
                  <Figure label={t("metric", { metric: "spend" })}>
                    {money(
                      totals.spend,
                      account.currency,
                      account.minorUnitDigits
                    )}
                  </Figure>
                  <Figure label={t("metric", { metric: "impressions" })}>
                    {format.number(totals.impressions)}
                  </Figure>
                  <Figure label={t("metric", { metric: "reach" })}>
                    {format.number(totals.reach)}
                  </Figure>
                  <Figure label={t("metric", { metric: "clicks" })}>
                    {format.number(totals.clicks)}
                  </Figure>
                  <Figure label={t("metric", { metric: "results" })}>
                    {totals.results === null
                      ? t("noResults")
                      : format.number(totals.results)}
                  </Figure>
                </dl>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
};
