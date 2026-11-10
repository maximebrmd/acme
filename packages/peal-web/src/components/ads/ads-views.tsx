"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type {
  AdAccount,
  AdCampaignReportSchema,
  AdConnection,
  AdInsightReportSchema,
} from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "peal-ui/components/chart";
import type { ChartConfig } from "peal-ui/components/chart";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "peal-ui/components/tabs";
import type { ReactNode, SubmitEvent } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { AdsError } from "#ads/errors.ts";
import { decimalOf, parseAmount } from "#ads/money.ts";
import { useMoney } from "#ads/use-money.ts";
import { dayDate } from "#analytics/report.ts";

import { AdsErrorAlert } from "./ads-error.tsx";

// The ads page's views: what a sign-in, an ad account, its spending form,
// its campaigns and its daily spend look like, whatever fetched them. The
// page's state lives in ads-screen.tsx.

type AdCampaignReport = typeof AdCampaignReportSchema.Type;

type AdInsightReport = typeof AdInsightReportSchema.Type;

/**
 * A sign-in to an ad network: when it was made, whether the network still
 * takes it, and what it allows. `actions` are what the member may do to it.
 */
export const AdConnectionView = ({
  actions,
  connection,
}: {
  readonly actions?: ReactNode;
  readonly connection: AdConnection;
}) => {
  const t = useTranslations("Ads");
  const broken = connection.access === "reconnectNeeded";

  return (
    <li className="flex flex-col gap-2 py-3">
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-medium">
          {t("connections.item", {
            date: DateTime.toDate(connection.createdAt),
            network: t("network", { network: connection.network }),
          })}
        </span>
        <Badge variant={broken ? "destructive" : "secondary"}>
          {t("connections.access", { access: connection.access })}
        </Badge>
      </span>
      <span className="text-muted-foreground text-sm">
        {t("connections.maySpend", {
          maySpend: connection.maySpend ? "true" : "false",
        })}
      </span>
      {connection.expiresAt === null ? null : (
        <span className="text-muted-foreground text-sm">
          {t("connections.expires", {
            date: DateTime.toDate(connection.expiresAt),
          })}
        </span>
      )}
      {broken ? (
        <Alert variant="destructive">
          <AlertDescription>{t("connections.reconnect")}</AlertDescription>
        </Alert>
      ) : null}
      {actions === undefined ? null : (
        <div className="flex flex-wrap gap-2">{actions}</div>
      )}
    </li>
  );
};

const Fact = ({
  children,
  hint,
  label,
}: {
  readonly children: ReactNode;
  readonly hint?: string;
  readonly label: string;
}) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-muted-foreground text-xs">{label}</dt>
    <dd className="text-sm">{children}</dd>
    {hint === undefined ? null : (
      <dd className="text-muted-foreground text-xs">{hint}</dd>
    )}
  </div>
);

/**
 * A connected ad account: its network, currency, time zone and status, its
 * own spend cap, whether it may spend through Peal and up to what each
 * month, what its boosts commit this month, and when it was last read.
 * `actions` are what the member may do to it, and `children` what the page
 * shows under it: its spending form, its campaigns, its daily spend.
 */
export const AdAccountView = ({
  account,
  actions,
  children,
  committedThisMonth,
}: {
  readonly account: AdAccount;
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
  /** What its boosts commit this month; null until it is read. */
  readonly committedThisMonth: number | null;
}) => {
  const t = useTranslations("Ads");
  const money = useMoney();
  const { currency, minorUnitDigits: digits } = account;

  return (
    <li className="flex flex-col gap-4 py-6">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-medium">{account.name}</h3>
        <Badge variant="outline">
          {t("network", { network: account.network })}
        </Badge>
        <Badge variant={account.status === "active" ? "secondary" : "outline"}>
          {t("accounts.status", { status: account.status })}
        </Badge>
      </div>
      {account.access === "reconnectNeeded" ? (
        <Alert variant="destructive">
          <AlertDescription>{t("accounts.reconnect")}</AlertDescription>
        </Alert>
      ) : null}
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Fact label={t("accounts.currency")}>{currency}</Fact>
        <Fact label={t("accounts.timeZone")}>
          {account.timeZone.replaceAll("_", " ")}
        </Fact>
        <Fact label={t("accounts.spendCap")}>
          {account.spendCap === null
            ? t("accounts.noSpendCap")
            : money(account.spendCap, currency, digits)}
        </Fact>
        {account.amountSpent === null ? null : (
          <Fact label={t("accounts.amountSpent")}>
            {money(account.amountSpent, currency, digits)}
          </Fact>
        )}
        <Fact label={t("accounts.spending")}>
          {account.spendingEnabled && account.monthlyCeiling !== null
            ? t("accounts.spendingOn", {
                ceiling: money(account.monthlyCeiling, currency, digits),
              })
            : t("accounts.spendingOff")}
        </Fact>
        {committedThisMonth === null ? null : (
          <Fact
            label={t("accounts.committed")}
            hint={t("accounts.committedHint")}
          >
            {money(committedThisMonth, currency, digits)}
          </Fact>
        )}
        <Fact label={t("accounts.synced")}>
          {account.syncedAt === null
            ? t("accounts.neverSynced")
            : t("accounts.syncedAt", {
                date: DateTime.toDate(account.syncedAt),
              })}
        </Fact>
      </dl>
      {actions === undefined ? null : (
        <div className="flex flex-wrap gap-2">{actions}</div>
      )}
      {children}
    </li>
  );
};

/**
 * What an owner decides of an ad account's spending: to allow it with a
 * monthly ceiling in the account's currency, to change the ceiling, or to
 * turn it off. What allowing means is said before the button.
 */
export const SpendingFormView = ({
  account,
  ceiling,
  error,
  onCeilingChange,
  onSubmit,
  onTurnOff,
  pending,
}: {
  readonly account: AdAccount;
  /** The ceiling as typed, in the currency's units. */
  readonly ceiling: string;
  readonly error: AdsError | null;
  readonly onCeilingChange: (ceiling: string) => void;
  readonly onSubmit: () => void;
  readonly onTurnOff: () => void;
  readonly pending: boolean;
}) => {
  const t = useTranslations("Ads.spending");
  const money = useMoney();
  const { currency, id, minorUnitDigits: digits } = account;
  const inputId = `${id}-ceiling`;
  const hintId = `${id}-ceiling-hint`;
  const noticeId = `${id}-ceiling-notice`;
  const amount = parseAmount(ceiling, digits);
  const valid = amount._tag === "Some" && amount.value > 0;
  const invalid = ceiling.trim() !== "" && !valid;

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (valid) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-3">
      <h4 className="font-medium">{t("title")}</h4>
      <AdsErrorAlert error={error} digits={digits} />
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>{t("ceiling", { currency })}</Label>
        <Input
          id={inputId}
          name={inputId}
          type="text"
          inputMode={digits === 0 ? "numeric" : "decimal"}
          autoComplete="off"
          value={ceiling}
          disabled={pending}
          aria-describedby={`${hintId} ${noticeId}`}
          aria-invalid={invalid ? true : undefined}
          required
          onChange={(event) => {
            onCeilingChange(event.target.value);
          }}
        />
        <p id={hintId} className="text-muted-foreground text-xs">
          {invalid
            ? t("ceilingInvalid", { digits: String(digits) })
            : t("ceilingHint", { digits: String(digits) })}
        </p>
      </div>
      <p id={noticeId} className="text-sm">
        {t("notice", {
          amount: valid ? money(amount.value, currency, digits) : "",
          known: valid ? "true" : "false",
        })}
      </p>
      <p className="text-muted-foreground text-xs">{t("lowering")}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={pending || !valid}
          focusableWhenDisabled
        >
          {account.spendingEnabled ? t("change") : t("turnOn")}
        </Button>
        {account.spendingEnabled ? (
          <Button
            variant="outline"
            disabled={pending}
            focusableWhenDisabled
            onClick={onTurnOff}
          >
            {t("turnOff")}
          </Button>
        ) : null}
      </div>
    </form>
  );
};

/** The ceiling an account's form opens with: its own, or nothing. */
export const ceilingOf = (account: AdAccount): string =>
  account.monthlyCeiling === null
    ? ""
    : decimalOf(account.monthlyCeiling, account.minorUnitDigits);

/**
 * An ad account's campaigns as last read, those made outside Peal
 * included: name, status, objective, budget, and what their ads spent and
 * did over the report's days.
 */
export const CampaignsTableView = ({
  report,
}: {
  readonly report: AdCampaignReport;
}) => {
  const t = useTranslations("Ads.campaigns");
  const format = useFormatter();
  const money = useMoney();
  const { currency, minorUnitDigits: digits, name } = report.account;

  // Days are on the account's calendar, in no zone: written in UTC.
  const day = (key: string) =>
    format.dateTime(dayDate(key), { dateStyle: "medium", timeZone: "UTC" });

  if (report.rows.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <Table>
      <TableCaption>
        {t("caption", {
          account: name,
          from: day(report.from),
          to: day(report.to),
        })}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t("name")}</TableHead>
          <TableHead scope="col">{t("status")}</TableHead>
          <TableHead scope="col">{t("objective")}</TableHead>
          <TableHead scope="col">{t("budget")}</TableHead>
          <TableHead scope="col" className="text-right">
            {t("spend")}
          </TableHead>
          <TableHead scope="col" className="text-right">
            {t("impressions")}
          </TableHead>
          <TableHead scope="col" className="text-right">
            {t("clicks")}
          </TableHead>
          <TableHead scope="col" className="text-right">
            {t("results")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.rows.map((campaign) => {
          const budget = campaign.dailyBudget ?? campaign.totalBudget;

          return (
            <TableRow key={campaign.externalId}>
              <TableHead scope="row">{campaign.name}</TableHead>
              <TableCell>
                {t("statusValue", { status: campaign.status })}
              </TableCell>
              <TableCell>
                {t("objectiveValue", { objective: campaign.objective })}
              </TableCell>
              <TableCell>
                {budget === null
                  ? t("noBudget")
                  : t("budgetValue", {
                      amount: money(budget, currency, digits),
                      kind: campaign.dailyBudget === null ? "total" : "daily",
                    })}
              </TableCell>
              <TableCell variant="numeric">
                {money(campaign.totals.spend, currency, digits)}
              </TableCell>
              <TableCell variant="numeric">
                {format.number(campaign.totals.impressions)}
              </TableCell>
              <TableCell variant="numeric">
                {format.number(campaign.totals.clicks)}
              </TableCell>
              <TableCell variant="numeric">
                {campaign.totals.results === null
                  ? t("noResults")
                  : format.number(campaign.totals.results)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

const spendColor = "var(--chart-1)";

/**
 * What an ad account's ads spent each day, as bars, with the same figures
 * and the day's other numbers as a table for anyone who does not read
 * charts: the chart is hidden from screen readers, whose users take the
 * table.
 */
export const DailySpendView = ({
  report,
}: {
  readonly report: AdInsightReport;
}) => {
  const t = useTranslations("Ads.insights");
  const format = useFormatter();
  const money = useMoney();
  const { currency, minorUnitDigits: digits } = report.account;

  const dayLabel = (day: string | number | undefined) =>
    format.dateTime(dayDate(String(day)), {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  // Days are on the account's calendar, in no zone: written in UTC.
  const longDay = (day: string) =>
    format.dateTime(dayDate(day), { dateStyle: "medium", timeZone: "UTC" });

  if (report.rows.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  const config: ChartConfig = {
    spend: { color: spendColor, label: t("spend") },
  };

  // The chart draws amounts in the currency's units; the table and the
  // tooltip write them from the minor units.
  const bars = report.rows.map(({ day, totals }) => ({
    day,
    minor: totals.spend,
    spend: Number(decimalOf(totals.spend, digits)),
  }));

  const minorOf = new Map(bars.map(({ minor, spend }) => [spend, minor]));

  const spendLabel = (value: number) =>
    money(minorOf.get(value) ?? 0, currency, digits);

  return (
    <Tabs defaultValue="chart">
      <TabsList aria-label={t("views")}>
        <TabsTrigger value="chart">{t("chart")}</TabsTrigger>
        <TabsTrigger value="table">{t("table")}</TabsTrigger>
      </TabsList>
      <TabsContent value="chart">
        <figure className="flex flex-col gap-2">
          <ChartContainer
            aria-hidden="true"
            config={config}
            className="aspect-auto h-64 w-full"
          >
            <BarChart accessibilityLayer={false} data={bars}>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="day"
                minTickGap={16}
                tickFormatter={dayLabel}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tickFormatter={(value: number) => format.number(value)}
                tickLine={false}
                width={48}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatLabel={dayLabel}
                    formatValue={spendLabel}
                  />
                }
              />
              <Bar dataKey="spend" fill={spendColor} />
            </BarChart>
          </ChartContainer>
          <figcaption className="text-muted-foreground text-sm">
            {t("caption", {
              currency,
              from: longDay(report.from),
              to: longDay(report.to),
            })}
          </figcaption>
        </figure>
      </TabsContent>
      <TabsContent value="table">
        <Table>
          <TableCaption>{t("tableCaption")}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("day")}</TableHead>
              <TableHead scope="col" className="text-right">
                {t("spend")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("impressions")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("clicks")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("results")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map(({ day, totals }) => (
              <TableRow key={day}>
                <TableHead scope="row">{longDay(day)}</TableHead>
                <TableCell variant="numeric">
                  {money(totals.spend, currency, digits)}
                </TableCell>
                <TableCell variant="numeric">
                  {format.number(totals.impressions)}
                </TableCell>
                <TableCell variant="numeric">
                  {format.number(totals.clicks)}
                </TableCell>
                <TableCell variant="numeric">
                  {totals.results === null
                    ? t("noResults")
                    : format.number(totals.results)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  );
};
