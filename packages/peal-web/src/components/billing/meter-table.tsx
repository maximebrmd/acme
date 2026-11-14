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

import { setSpendCeiling, setXReads } from "#billing/api.ts";

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

  // X's units are thousandths of a dollar at X's rates: told as money.
  if (meter.meter === "xApi") {
    const dollars = (units: number) =>
      price((units * meter.price.cents) / meter.price.per);

    return (
      <TableRow>
        <TableHead scope="row">{t("names.xApi")}</TableHead>
        <TableCell variant="numeric">
          {billsHere && meter.most !== null
            ? t("usedOfMoney", {
                most: dollars(meter.most),
                used: dollars(meter.used),
              })
            : dollars(meter.used)}
        </TableCell>
        <TableCell variant="numeric">{t("xIncluded")}</TableCell>
        <TableCell variant="numeric">{t("xRates")}</TableCell>
        <TableCell variant="numeric">{t("xRates")}</TableCell>
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
  }

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
        {meter.most === null || !meter.priceConfirmed
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
 * Who may turn the workspace's X reads on or off: a member who manages
 * its billing, on this workspace (each reads its own channels).
 */
export interface XReadsControl {
  readonly canSwitch: boolean;
  readonly workspaceId: string;
}

// A thousandth of a dollar is a tenth of a cent.
const centsOf = (thousandths: number) => thousandths / 10;

// Nobody switches X's reads unless the screen says who may.
const noXReads: XReadsControl = { canSwitch: false, workspaceId: "" };

// X's rates, passed on with nothing added, in the rate card's
// thousandths of a dollar: those a post and a read cost.
const xItems = [
  "postCreate",
  "postCreateWithUrl",
  "postRead",
  "userRead",
] as const;

// The workspace's reading of its X channels, on or off, for those who
// manage its billing.
const XReadsSwitch = ({
  reads,
  workspaceId,
}: {
  readonly reads: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Billing.meters.xPassThrough");
  const set = useAtomSet(setXReads, { mode: "promiseExit" });
  const [failed, setFailed] = useState(false);
  const [saving, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => {
            startTransition(async () => {
              const exit = await set({
                params: { workspaceId },
                payload: { reads: !reads },
                reactivityKeys: [`billing:${workspaceId}`],
              });

              setFailed(Exit.isFailure(exit));
            });
          }}
        >
          {reads ? t("turnOff") : t("turnOn")}
        </Button>
      </div>
      {failed ? (
        <p className="text-destructive text-sm" aria-live="assertive">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};

/**
 * X passed through at its rates: the rates, with the day they were read
 * and France's VAT beside them, whether the workspace reads its X
 * channels (its billing managers switch it), and, on the workspace that
 * bills the account, the ceiling for X.
 */
const XPassThrough = ({
  billing,
  billsHere,
  canManage,
  meter,
  xReads,
}: {
  readonly billing: Billing;
  readonly billsHere: boolean;
  readonly canManage: boolean;
  readonly meter: BillingMeter;
  readonly xReads: XReadsControl;
}) => {
  const t = useTranslations("Billing.meters.xPassThrough");
  const price = usePrice();
  const format = useFormatter();
  const { rateCard, x } = billing;

  // Set on the workspace that bills the account, with a payment method,
  // by those who manage its billing.
  const ceiling =
    billsHere && canManage && billing.paymentMethod
      ? (meter.ceiling?.amount ?? null)
      : null;

  if (rateCard === null) {
    return null;
  }

  const day = format.dateTime(
    DateTime.toDate(DateTime.makeUnsafe(`${rateCard.x.ratesReadOn}T00:00:00Z`)),
    { dateStyle: "long", timeZone: "UTC" }
  );

  return (
    <section className="flex flex-col gap-3" aria-labelledby="billing-x">
      <div className="flex flex-col gap-1">
        <h3 id="billing-x" className="text-base font-semibold">
          {t("title")}
        </h3>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <div className="bg-card rounded-md border">
        <Table>
          <TableCaption>{t("caption")}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("item")}</TableHead>
              <TableHead scope="col" className="text-right">
                {t("rate")}
              </TableHead>
              <TableHead scope="col" className="text-right">
                {t("rateIncluded", { rate: displayVatRate })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {xItems.map((item) => (
              <TableRow key={item}>
                <TableHead scope="row">{t(`names.${item}`)}</TableHead>
                <TableCell variant="numeric">
                  {price(centsOf(rateCard.x.rates[item]))}
                </TableCell>
                <TableCell variant="numeric">
                  {price(withVat(centsOf(rateCard.x.rates[item])))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-muted-foreground text-sm">{t("readOn", { day })}</p>
      {x === undefined || x === null ? null : (
        <>
          <p className="text-sm">{x.reads ? t("readsOn") : t("readsOff")}</p>
          {xReads.canSwitch ? (
            <XReadsSwitch reads={x.reads} workspaceId={xReads.workspaceId} />
          ) : null}
        </>
      )}
      {ceiling !== null && billing.account !== undefined ? (
        <CeilingForm
          ceiling={ceiling}
          group="x"
          workspaceId={billing.account.billingWorkspaceId}
        />
      ) : null}
    </section>
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
  xReads = noXReads,
}: {
  readonly billing: Billing;
  readonly canManage: boolean;
  readonly xReads?: XReadsControl;
}) => {
  const t = useTranslations("Billing.meters");
  const { meters } = billing;

  if (meters === null || meters.length === 0) {
    return null;
  }

  // The workspace that bills the account reads its money.
  const billsHere = billing.accounts.accountDays !== null;

  const assistantMeters = meters.filter(({ group }) => group === "assistant");
  const xMeter = meters.find(({ meter }) => meter === "xApi");
  const assistant = assistantMeters[0]?.ceiling;

  // A price not confirmed bills nothing past the allowance: no ceiling to
  // set until it is.
  const assistantPriced =
    assistantMeters.length > 0 &&
    assistantMeters.every(({ priceConfirmed }) => priceConfirmed);

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
      {assistantPriced ? null : (
        <p className="text-muted-foreground text-sm">{t("assistantComing")}</p>
      )}
      {billsHere &&
      canManage &&
      billing.paymentMethod &&
      assistantPriced &&
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
      {xMeter === undefined ? null : (
        <XPassThrough
          billing={billing}
          billsHere={billsHere}
          canManage={canManage}
          meter={xMeter}
          xReads={xReads}
        />
      )}
    </section>
  );
};
