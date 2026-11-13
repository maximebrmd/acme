"use client";

import { useAtomSet } from "@effect/atom-react";
import { DateTime, Exit } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import { displayVatRate } from "peal-contract";
import type { Billing, BillingMeter, SpendGroup } from "peal-contract";
import { Button } from "peal-ui/components/button";
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
import { useId, useState, useTransition } from "react";

import { setSpendCeiling } from "#billing/api.ts";

// A unit price, in dollars, with as many decimals as it needs: $1.00 for
// 10,000 messages is a hundredth of a cent each.
const usePrice = () => {
  const format = useFormatter();

  return (cents: number) =>
    format.number(cents / 100, {
      currency: "USD",
      maximumFractionDigits: 4,
      minimumFractionDigits: 2,
      style: "currency",
    });
};

const withVat = (cents: number) => (cents * (100 + displayVatRate)) / 100;

/** The meters the page tells, in the order of the table. */
const MeterRow = ({
  billing: billsHere,
  meter,
}: {
  readonly billing: boolean;
  readonly meter: BillingMeter;
}) => {
  const t = useTranslations("Billing.meters");
  const price = usePrice();
  const format = useFormatter();

  const resetsOn = format.dateTime(DateTime.toDate(meter.resetsAt), {
    dateStyle: "medium",
    timeZone: "UTC",
  });

  // A placeholder price is never shown as one.
  const priced = meter.priceConfirmed
    ? {
        excluded: t("unitPrice", {
          per: meter.price.per,
          price: price(meter.price.cents),
        }),
        included: t("unitPrice", {
          per: meter.price.per,
          price: price(withVat(meter.price.cents)),
        }),
      }
    : { excluded: t("coming"), included: t("coming") };

  return (
    <TableRow>
      <TableHead scope="row">{t(`names.${meter.meter}`)}</TableHead>
      <TableCell variant="numeric">
        {meter.most === null
          ? t("usedOpen", { used: meter.used })
          : t("usedOf", { most: meter.most, used: meter.used })}
      </TableCell>
      <TableCell variant="numeric">
        {meter.priceConfirmed
          ? t("included", { allowance: meter.allowance })
          : t("coming")}
      </TableCell>
      <TableCell variant="numeric">{priced.excluded}</TableCell>
      <TableCell variant="numeric">{priced.included}</TableCell>
      <TableCell variant="numeric">
        {billsHere && meter.estimate !== null
          ? t("estimate", {
              estimate: price(meter.estimate.amount),
              included: price(withVat(meter.estimate.amount)),
              rate: displayVatRate,
            })
          : t("billedThere")}
      </TableCell>
      <TableCell variant="numeric">{resetsOn}</TableCell>
    </TableRow>
  );
};

// The assistant's monthly ceiling past what is included, set on the
// workspace that bills the account by those who manage its billing.
const CeilingForm = ({
  ceiling,
  group,
  workspaceId,
}: {
  readonly ceiling: number;
  readonly group: SpendGroup;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Billing.meters");
  const price = usePrice();
  const id = useId();
  const set = useAtomSet(setSpendCeiling, { mode: "promiseExit" });
  const [dollars, setDollars] = useState((ceiling / 100).toFixed(2));
  const [failed, setFailed] = useState(false);
  const [saving, startTransition] = useTransition();
  const cents = Math.round(Number(dollars) * 100);
  const valid = Number.isFinite(cents) && cents >= 0;

  const save = () => {
    startTransition(async () => {
      const exit = await set({
        params: { group, workspaceId },
        payload: { cents },
        reactivityKeys: [`billing:${workspaceId}`],
      });

      setFailed(Exit.isFailure(exit));
    });
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <Label htmlFor={id}>{t(`ceiling.${group}`)}</Label>
      <p className="text-muted-foreground text-sm">
        {t("ceiling.now", {
          ceiling: price(ceiling),
          included: price(withVat(ceiling)),
          rate: displayVatRate,
        })}
      </p>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          className="w-32"
          inputMode="decimal"
          value={dollars}
          aria-invalid={!valid}
          onChange={(event) => {
            setDollars(event.target.value);
          }}
        />
        <Button type="submit" variant="outline" disabled={!valid || saving}>
          {t("ceiling.save")}
        </Button>
      </div>
      {failed ? (
        <p className="text-destructive text-sm" aria-live="assertive">
          {t("ceiling.failed")}
        </p>
      ) : null}
    </form>
  );
};

/**
 * The billing account's meters this month: what each counted across its
 * workspaces and includes, its price past the allowance, excluding VAT
 * and with France's VAT, and, for the workspace that bills the account
 * only, what it costs so far; a price not confirmed yet says it is
 * coming. Those who manage the billing workspace's billing set the
 * assistant's ceiling.
 */
export const MeterTable = ({
  billing,
  canManage,
}: {
  readonly billing: Billing;
  readonly canManage: boolean;
}) => {
  const t = useTranslations("Billing.meters");
  const { meters } = billing;

  if (meters === null || meters.length === 0) {
    return null;
  }

  // The workspace that bills the account reads its money.
  const billsHere = billing.accounts.accountDays !== null;

  const assistant = meters.find(({ group }) => group === "assistant")?.ceiling;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="billing-meters">
      <div className="flex flex-col gap-1">
        <h2
          id="billing-meters"
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
              <TableHead scope="col">{t("meter")}</TableHead>
              <TableHead scope="col" className="text-right">
                {t("used")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("allowance")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("price")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("priceIncluded", { rate: displayVatRate })}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("soFar")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("resets")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meters.map((meter) => (
              <MeterRow key={meter.meter} billing={billsHere} meter={meter} />
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm">
        {billing.paymentMethod ? t("withCard") : t("withoutCard")}
      </p>
      {billsHere &&
      canManage &&
      billing.paymentMethod &&
      billing.account !== undefined &&
      assistant !== null &&
      assistant !== undefined ? (
        <CeilingForm
          ceiling={assistant.amount}
          group="assistant"
          // The workspace that bills the account: this one.
          workspaceId={billing.account.billingWorkspaceId}
        />
      ) : null}
    </section>
  );
};
