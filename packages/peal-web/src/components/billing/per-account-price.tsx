"use client";

import { useTranslations } from "next-intl";
import { displayVatRate } from "peal-contract";

import { useMoney } from "#billing/size.ts";
import { perAccountOffer } from "#billing/upgrade.ts";

// What per-account pricing costs, from the rate card: each account past
// the free ones, with the VAT shown first and without, in US dollars.
export const PerAccountPrice = () => {
  const billing = useTranslations("Billing");
  const money = useMoney("usd");
  const { free, lessFrom, next } = perAccountOffer();

  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold tabular-nums">
        {billing("prices.perAccount", {
          free,
          from: lessFrom,
          included: money(next.included),
          price: money(next.excluded),
          rate: displayVatRate,
        })}
      </p>
      <p className="text-muted-foreground text-xs">
        {billing("prices.perAccountNote")}
      </p>
    </div>
  );
};
