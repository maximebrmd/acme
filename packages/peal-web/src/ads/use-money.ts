import { useLocale } from "next-intl";

import { formatMoney } from "./money.ts";
import type { MinorUnitDigits } from "./money.ts";

/** Writes amounts of an ad account as money, in the reader's language. */
export const useMoney = () => {
  const locale = useLocale();

  return (amount: number, currency: string, digits: MinorUnitDigits): string =>
    formatMoney(locale, amount, currency, digits);
};
